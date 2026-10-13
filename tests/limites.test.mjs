// Vérifie que les limites d'usage tiennent, y compris avec beaucoup de demandes envoyées en même temps.
// Lancer : npm run test:limites
//
// Le stockage est simulé en mémoire, avec des pauses aléatoires entre les demandes pour mélanger leur ordre.
// Comme la vraie fonction SQL consume_usage (verrou pg_advisory_xact_lock), la réservation lit et écrit
// le compteur en une seule étape : c'est cette propriété que l'on vérifie ici.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reserve, recordCost, status } from "../lib/quota-core.ts";
import { LIMITS, KEYS, COST_UNIT } from "../lib/limits.ts";

const pause = () => new Promise((r) => setTimeout(r, Math.random() * 15));

function memoryStore({ rateSupported = true, rateOff = false } = {}) {
  const counts = new Map();
  const rates = new Map();
  const k = (u, key) => `${u}|${key}`;
  return {
    counts,
    async consume(u, key, limit) {
      await pause();
      const c = counts.get(k(u, key)) ?? 0; // lecture + écriture sans pause entre les deux = atomique
      if (c >= limit) return false;
      counts.set(k(u, key), c + 1);
      return true;
    },
    async refund(u, key) {
      await pause();
      counts.set(k(u, key), Math.max(0, (counts.get(k(u, key)) ?? 0) - 1));
    },
    async read(u, keys) {
      await pause();
      return Object.fromEntries(keys.map((key) => [key, counts.get(k(u, key)) ?? 0]));
    },
    async add(u, key, amount) {
      await pause();
      counts.set(k(u, key), (counts.get(k(u, key)) ?? 0) + amount);
    },
    async rate(key, limit) {
      if (!rateSupported) return null;
      if (rateOff) return true;
      await pause();
      const c = (rates.get(key) ?? 0) + 1;
      rates.set(key, c);
      return c <= limit;
    },
  };
}

const NOW = new Date("2026-10-13T10:00:00+02:00");
const many = (n, fn) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));

test("Pro : 20 fiches demandées en même temps → exactement 10 (limite du jour)", async () => {
  const store = memoryStore({ rateOff: true });
  const res = await many(20, () => reserve(store, { userId: "pro1", pro: true, kind: "fiche", now: NOW }));
  assert.equal(res.filter((r) => r.ok).length, LIMITS.pro.fichesPerDay);
  const denied = res.filter((r) => !r.ok);
  assert.ok(denied.every((r) => r.scope === "jour" && r.status === 429 && !r.quotaExceeded));
  assert.match(denied[0].error, /aujourd'hui.*minuit/);
  // Le compteur du mois n'a pas gardé les demandes refusées.
  assert.equal(store.counts.get(`pro1|${KEYS.proFichesMonth(NOW)}`), LIMITS.pro.fichesPerDay);
});

test("Rythme : 20 demandes en même temps d'un même compte → au plus 4 passent", async () => {
  const store = memoryStore();
  const res = await many(20, () => reserve(store, { userId: "pro2", pro: true, kind: "fiche", now: NOW }));
  assert.equal(res.filter((r) => r.ok).length, LIMITS.rate.perUserPerMinute);
  assert.ok(res.filter((r) => !r.ok).every((r) => r.scope === "minute"));
});

test("Rythme sans la table SQL : le compteur du compte prend le relais", async () => {
  const store = memoryStore({ rateSupported: false });
  const res = await many(20, () => reserve(store, { userId: "pro3", pro: true, kind: "fiche", now: NOW }));
  assert.equal(res.filter((r) => r.ok).length, LIMITS.rate.perUserPerMinute);
});

test("Même adresse IP, 30 comptes différents en même temps → au plus 15 passent", async () => {
  const store = memoryStore();
  const res = await many(30, (i) => reserve(store, { userId: `u${i}`, pro: true, kind: "fiche", ipKey: "ip-ecole", now: NOW }));
  assert.equal(res.filter((r) => r.ok).length, LIMITS.rate.perIpPerMinute);
});

test("Gratuit : 3 fiches par mois, puis un message clair qui propose Pro", async () => {
  const store = memoryStore({ rateOff: true });
  const res = await many(10, () => reserve(store, { userId: "free1", pro: false, kind: "fiche", now: NOW }));
  assert.equal(res.filter((r) => r.ok).length, LIMITS.free.fichesPerMonth);
  const d = res.find((r) => !r.ok);
  assert.equal(d.status, 403);
  assert.equal(d.quotaExceeded, true);
  assert.match(d.error, /1er novembre/);
  assert.match(d.error, /Pro/);
});

test("Pro : limite du mois (100), message sans proposition Pro", async () => {
  const store = memoryStore({ rateOff: true });
  store.counts.set(`pro4|${KEYS.proFichesMonth(NOW)}`, LIMITS.pro.fichesPerMonth - 1);
  const res = await many(5, () => reserve(store, { userId: "pro4", pro: true, kind: "fiche", now: NOW }));
  assert.equal(res.filter((r) => r.ok).length, 1);
  const d = res.find((r) => !r.ok);
  assert.equal(d.scope, "mois");
  assert.doesNotMatch(d.error, /Pro/);
  assert.match(d.error, /1er novembre/);
});

test("Échec de la génération : la fiche est rendue", async () => {
  const store = memoryStore({ rateOff: true });
  const r = await reserve(store, { userId: "free2", pro: false, kind: "fiche", now: NOW });
  assert.ok(r.ok);
  await r.refund();
  const s = await status(store, "free2", false, NOW);
  assert.equal(s.fichesLeftMonth, LIMITS.free.fichesPerMonth);
});

test("Compte qui avait déjà dépassé les nouvelles limites : refus propre, pas de plantage", async () => {
  const store = memoryStore({ rateOff: true });
  store.counts.set(`pro5|${KEYS.proFichesDay(NOW)}`, 37); // ancienne limite de 50 par jour
  const r = await reserve(store, { userId: "pro5", pro: true, kind: "fiche", now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.scope, "jour");
  const s = await status(store, "pro5", true, NOW);
  assert.equal(s.fichesLeftDay, 0);
  assert.equal(s.fichesLeftMonth, LIMITS.pro.fichesPerMonth); // le compteur du mois n'a pas bougé
});

test("Filet de sécurité : coût du mois atteint → plus de génération", async () => {
  const store = memoryStore({ rateOff: true });
  await recordCost(store, "pro6", LIMITS.pro.monthlyCostCapUsd, NOW);
  assert.equal(store.counts.get(`pro6|${KEYS.costMonth(NOW)}`), LIMITS.pro.monthlyCostCapUsd * COST_UNIT);
  const r = await reserve(store, { userId: "pro6", pro: true, kind: "fiche", now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.scope, "budget");
});

test("Apprendre et régénérations ont leurs propres limites", async () => {
  const store = memoryStore({ rateOff: true });
  const a = await many(5, () => reserve(store, { userId: "free3", pro: false, kind: "apprendre", now: NOW }));
  assert.equal(a.filter((r) => r.ok).length, LIMITS.free.apprendreTotal);
  assert.equal(a.find((r) => !r.ok).code, "pro_required");
  const g = await many(30, () => reserve(store, { userId: "pro7", pro: true, kind: "regen", now: NOW }));
  assert.equal(g.filter((r) => r.ok).length, LIMITS.pro.regensPerDay);
  // Une régénération ne consomme pas de fiche.
  assert.equal((await status(store, "pro7", true, NOW)).fichesLeftMonth, LIMITS.pro.fichesPerMonth);
});
