// Prouve que les protections contre les robots tiennent : blocage progressif après des erreurs
// (connexion, code d'inscription), limites d'emails, et comptage fiable même avec beaucoup de demandes en même temps.
// Lancer : npm run test:securite
//
// Le stockage est simulé en mémoire, avec une horloge que le test fait avancer. Il reproduit exactement
// les fonctions SQL rate_window_hit et auth_register_failure (supabase/securite-2026-10.sql).
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTH_LOCK, checkRules, currentLock, failure, lockDuration, success, tooManyMessage, waitText } from "../lib/security/limiter-core.ts";

const pause = () => new Promise((r) => setTimeout(r, Math.random() * 10));

function memoryStore() {
  let now = 0; // secondes
  const windows = new Map();
  const fails = new Map();
  return {
    advance: (s) => (now += s),
    async hit(key, limit, windowSeconds) {
      await pause();
      // Lecture + écriture en une seule étape (comme la ligne verrouillée de « insert … on conflict do update »).
      let w = windows.get(key);
      if (!w || w.start + w.windowSeconds <= now) w = { count: 0, start: now, windowSeconds };
      w.count += 1;
      windows.set(key, w);
      return w.count <= limit ? 0 : Math.max(1, Math.ceil(w.start + w.windowSeconds - now));
    },
    async lockSeconds(key) {
      await pause();
      const f = fails.get(key);
      return f && f.lockedUntil > now ? Math.ceil(f.lockedUntil - now) : 0;
    },
    async registerFailure(key, threshold) {
      await pause();
      let f = fails.get(key);
      if (!f || f.last < now - 3600) f = { failures: 0, lockedUntil: 0, last: now };
      f.failures += 1;
      f.last = now;
      const lock = lockDuration(f.failures, threshold);
      if (lock) f.lockedUntil = now + lock;
      fails.set(key, f);
      return lock;
    },
    async clearFailures(key) {
      fails.delete(key);
    },
  };
}

// Même enchaînement que app/api/auth/login/route.ts et app/api/auth/verify/route.ts.
async function attempt(store, { email, ip, correct }) {
  const keys = [
    { key: `login:email:${email}`, threshold: AUTH_LOCK.perAccount },
    { key: `login:ip:${ip}`, threshold: AUTH_LOCK.perIp },
  ];
  const locked = await currentLock(store, keys);
  if (locked) return { status: 429, wait: locked, reachedSupabase: false };
  if (!correct) {
    const lock = await failure(store, keys);
    return lock ? { status: 429, wait: lock, reachedSupabase: true } : { status: 400, reachedSupabase: true };
  }
  await success(store, keys.slice(0, 1));
  return { status: 200, reachedSupabase: true };
}

test("3 mauvais codes : le 3e bloque 1 minute, et le 4e est refusé sans même être vérifié", async () => {
  const s = memoryStore();
  const a = { email: "eleve@test.fr", ip: "1.1.1.1", correct: false };
  assert.equal((await attempt(s, a)).status, 400);
  assert.equal((await attempt(s, a)).status, 400);
  const third = await attempt(s, a);
  assert.equal(third.status, 429);
  assert.equal(third.wait, 60);
  const fourth = await attempt(s, a);
  assert.equal(fourth.status, 429);
  assert.equal(fourth.reachedSupabase, false, "pendant le blocage, Supabase n'est pas appelé");
  // Même le BON code est refusé pendant le blocage : un robot ne peut pas continuer à deviner.
  assert.equal((await attempt(s, { ...a, correct: true })).status, 429);
});

test("le blocage augmente : 1 min, puis 5 min, puis 15 min", async () => {
  const s = memoryStore();
  const a = { email: "eleve@test.fr", ip: "1.1.1.1", correct: false };
  await attempt(s, a);
  await attempt(s, a);
  assert.equal((await attempt(s, a)).wait, 60);
  s.advance(61);
  assert.equal((await attempt(s, a)).wait, 300);
  s.advance(301);
  assert.equal((await attempt(s, a)).wait, 900);
  s.advance(901);
  assert.equal((await attempt(s, a)).wait, 900, "ça reste à 15 minutes tant que ça continue");
});

test("changer d'adresse IP ne contourne pas le blocage du compte", async () => {
  const s = memoryStore();
  for (let i = 0; i < 3; i++) await attempt(s, { email: "cible@test.fr", ip: `9.9.9.${i}`, correct: false });
  assert.equal((await attempt(s, { email: "cible@test.fr", ip: "8.8.8.8", correct: false })).status, 429);
});

test("changer d'email ne contourne pas le blocage de l'adresse IP (10 erreurs)", async () => {
  const s = memoryStore();
  const results = [];
  for (let i = 0; i < AUTH_LOCK.perIp; i++) results.push(await attempt(s, { email: `essai${i}@test.fr`, ip: "6.6.6.6", correct: false }));
  assert.equal(results.at(-1).status, 429);
  assert.equal((await attempt(s, { email: "autre@test.fr", ip: "6.6.6.6", correct: true })).status, 429);
  // Une autre adresse IP (un autre élève) n'est pas gênée.
  assert.equal((await attempt(s, { email: "autre@test.fr", ip: "7.7.7.7", correct: true })).status, 200);
});

test("une connexion réussie efface les erreurs du compte", async () => {
  const s = memoryStore();
  const a = { email: "eleve@test.fr", ip: "1.1.1.1" };
  await attempt(s, { ...a, correct: false });
  await attempt(s, { ...a, correct: false });
  assert.equal((await attempt(s, { ...a, correct: true })).status, 200);
  assert.equal((await attempt(s, { ...a, correct: false })).status, 400, "le compteur est reparti de zéro");
});

test("20 mauvais essais envoyés EN MÊME TEMPS : le compte est quand même bloqué", async () => {
  const s = memoryStore();
  const all = await Promise.all(Array.from({ length: 20 }, () => attempt(s, { email: "eleve@test.fr", ip: "1.1.1.1", correct: false })));
  const passed = all.filter((r) => r.status === 400).length;
  // Les essais déjà en route avant le blocage peuvent passer, mais ensuite plus rien : le compte est bloqué.
  assert.ok(passed < 20);
  assert.equal((await attempt(s, { email: "eleve@test.fr", ip: "1.1.1.1", correct: true })).status, 429);
});

test("emails : un seul nouveau code par minute", async () => {
  const s = memoryStore();
  const rules = [{ key: "resend-1min:e", limit: 1, windowSeconds: 60 }];
  assert.equal(await checkRules(s, rules), 0);
  const wait = await checkRules(s, rules);
  assert.ok(wait > 0 && wait <= 60, "le 2e code dans la minute est refusé");
  s.advance(61);
  assert.equal(await checkRules(s, rules), 0, "une minute plus tard, c'est permis");
});

test("emails : pas plus de 5 codes par heure, même en attendant entre chaque", async () => {
  const s = memoryStore();
  const rules = [
    { key: "resend-1min:e", limit: 1, windowSeconds: 60 },
    { key: "resend:e", limit: 5, windowSeconds: 3600 },
  ];
  assert.equal(await checkRules(s, rules), 0);
  let sent = 1;
  for (let i = 0; i < 10; i++) {
    s.advance(61);
    if ((await checkRules(s, rules)) === 0) sent++;
  }
  assert.equal(sent, 5, "au plus 5 codes par heure");
});

test("emails : 50 demandes en même temps n'envoient qu'un seul email", async () => {
  const s = memoryStore();
  const rules = [{ key: "reset-1min:e", limit: 1, windowSeconds: 60 }];
  const waits = await Promise.all(Array.from({ length: 50 }, () => checkRules(s, rules)));
  assert.equal(waits.filter((w) => w === 0).length, 1);
});

test("le message d'attente est en français simple", () => {
  assert.equal(waitText(60), "1 minute");
  assert.equal(waitText(300), "5 minutes");
  assert.equal(waitText(40), "40 secondes");
  assert.equal(tooManyMessage(900), "Trop d'essais. Attends 15 minutes, puis réessaie.");
});
