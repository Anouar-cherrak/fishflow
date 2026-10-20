// Vérifie le site EN MARCHE, comme le ferait un robot : routes sans être connecté, demandes venant d'un autre site,
// faux événements Stripe, fichiers sensibles, en-têtes de sécurité.
// Lancer :  npm run verif:http                        (site local : http://localhost:3000, après « npm run build » puis « npm start »)
//           BASE=https://fishflow.fr npm run verif:http   (le vrai site, après publication — sans danger : rien n'est modifié)
import assert from "node:assert/strict";
import { test } from "node:test";

const BASE = process.env.BASE || "http://localhost:3000";
const EVIL = "https://site-pirate.example";

const req = (path, init = {}) => fetch(BASE + path, { redirect: "manual", ...init });
const post = (path, body, headers = {}) =>
  req(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("routes du compte : refusées sans être connecté (401)", async () => {
  const routes = [
    ["POST", "/api/generate"],
    ["POST", "/api/apprendre"],
    ["GET", "/api/usage"],
    ["GET", "/api/preferences"],
    ["POST", "/api/preferences"],
    ["GET", "/api/account/export"],
    ["POST", "/api/account/delete"],
    ["POST", "/api/stripe/checkout"],
    ["POST", "/api/stripe/portal"],
  ];
  for (const [method, path] of routes) {
    const res = await req(path, { method, headers: { "Content-Type": "application/json", Origin: BASE }, body: method === "POST" ? "{}" : undefined });
    assert.ok([401, 429].includes(res.status), `${method} ${path} → ${res.status} (attendu 401)`);
  }
});

test("une action envoyée depuis un autre site est refusée (CSRF, 403)", async () => {
  for (const path of ["/api/account/delete", "/api/preferences", "/api/generate", "/api/auth/login", "/api/stripe/checkout"]) {
    const res = await post(path, {}, { Origin: EVIL });
    assert.equal(res.status, 403, `${path} depuis un autre site → ${res.status}`);
  }
  const res = await post("/api/account/delete", {}, { "Sec-Fetch-Site": "cross-site" });
  assert.equal(res.status, 403);
});

test("tâches automatiques et annonce : refusées sans le mot de passe", async () => {
  for (const path of ["/api/cron/relances", "/api/cron/rappel"]) {
    assert.equal((await req(path)).status, 401, path);
    assert.equal((await req(path, { headers: { Authorization: "Bearer undefined" } })).status, 401, path);
  }
  assert.equal((await post("/api/admin/annonce", { subject: "x", message: "x" })).status, 401);
});

test("faux événement Stripe « donne-moi Pro » : refusé", async () => {
  const fake = { id: "evt_x", type: "checkout.session.completed", data: { object: { client_reference_id: "00000000-0000-0000-0000-000000000000" } } };
  assert.equal((await post("/api/stripe/webhook", fake)).status, 400, "sans signature");
  assert.equal((await post("/api/stripe/webhook", fake, { "Stripe-Signature": "t=1,v1=abc" })).status, 400, "signature inventée");
});

test("connexion et inscription : données invalides refusées proprement", async () => {
  const bad = await post("/api/auth/login", { email: "pas-un-email", password: "x" }, { Origin: BASE });
  assert.equal(bad.status, 400);
  const json = await bad.json();
  assert.ok(!/supabase|stack|error:/i.test(JSON.stringify(json)), "pas de détail technique dans le message");
  const weak = await post("/api/auth/signup", { email: "test@exemple.fr", password: "1234567" }, { Origin: BASE });
  assert.equal(weak.status, 400, "mot de passe de 7 caractères refusé");
  const huge = await post("/api/auth/login", JSON.stringify({ email: "a@b.fr", password: "x".repeat(50_000) }), { Origin: BASE });
  assert.equal(huge.status, 400, "envoi énorme refusé");
  const notJson = await post("/api/auth/verify", "pas du json", { Origin: BASE });
  assert.equal(notJson.status, 400);
});

test("fichiers sensibles : jamais servis", async () => {
  for (const path of ["/.env", "/.env.local", "/.git/config", "/.git/HEAD", "/package.json", "/next.config.ts", "/supabase/securite-2026-10.sql", "/_next/static/chunks/main.js.map"]) {
    const res = await req(path);
    assert.ok(res.status === 404 || res.status === 403 || res.status === 308 || res.status === 307, `${path} → ${res.status}`);
  }
});

test("en-têtes de sécurité présents sur les pages", async () => {
  const res = await req("/");
  const h = res.headers;
  const csp = h.get("content-security-policy") ?? "";
  for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action"]) assert.ok(csp.includes(d), `CSP sans ${d}`);
  assert.equal(h.get("x-frame-options"), "DENY");
  assert.equal(h.get("x-content-type-options"), "nosniff");
  assert.ok(h.get("strict-transport-security")?.includes("max-age="));
  assert.ok(h.get("referrer-policy"));
  assert.ok(h.get("permissions-policy")?.includes("microphone=()"));
  assert.equal(h.get("x-powered-by"), null, "Next.js ne s'annonce pas");
  // Les pages publiques statiques peuvent avoir « * » (ajouté par Vercel, sans cookies : sans risque). L'API, elle, est vérifiée plus bas.
});

test("l'API n'autorise pas les autres sites à lire ses réponses (CORS)", async () => {
  const res = await req("/api/usage", { headers: { Origin: EVIL } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("désinscription : un lien sans signature valide est refusé", async () => {
  const res = await req("/api/unsubscribe?id=00000000-0000-0000-0000-000000000000");
  assert.equal(res.status, 400);
});
