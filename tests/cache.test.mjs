// Prouve la règle de cache : aucune page ni route du compte n'est gardée par un cache public.
// 1) Sans serveur : lit next.config.ts et vérifie que chaque page du compte reçoit « private, no-store ».
// 2) Avec le site lancé (CACHE_HTTP=1, BASE=http://localhost:3000) : vérifie les vrais en-têtes renvoyés.
// Lancer : npm run test:cache
import assert from "node:assert/strict";
import { test } from "node:test";
import config, { PRIVATE_ROUTES } from "../next.config.ts";

// Pages et routes connectées qui doivent toutes être protégées (si on en ajoute une, l'ajouter ici aussi).
const MUST_BE_PRIVATE = [
  "/api/generate", "/api/apprendre", "/api/usage", "/api/preferences", "/api/account/export", "/api/account/delete",
  "/api/stripe/checkout", "/api/stripe/portal", "/api/stripe/webhook", "/api/auth/login",
  "/generer", "/mes-fiches", "/fiche/123", "/result", "/aujourdhui", "/reviser", "/apprendre", "/examens", "/parametres",
  "/reset-password/confirm",
];
const PUBLIC = ["/", "/pricing", "/cgu", "/confidentialite", "/mentions-legales", "/aide"];

// Même principe que Next.js pour « :param » et « :param* » (suffisant pour nos règles).
const toRegex = (source) => new RegExp("^" + source.replace(/\/:[a-z]+\*/g, "(?:/.*)?").replace(/:[a-z]+/g, "[^/]+") + "$");
const cacheFor = async (path) => {
  const rules = await config.headers();
  let value;
  for (const r of rules) if (toRegex(r.source).test(path)) for (const h of r.headers) if (h.key === "Cache-Control") value = h.value;
  return value;
};

test("chaque page et route du compte : « private, no-store » dans la configuration", async () => {
  assert.ok(PRIVATE_ROUTES.length > 5);
  for (const path of MUST_BE_PRIVATE) {
    const v = await cacheFor(path);
    assert.ok(v && /private/.test(v) && /no-store/.test(v), `${path} → ${v ?? "aucune règle"}`);
  }
});

test("les pages publiques ne sont pas marquées no-store (elles restent rapides en cache CDN)", async () => {
  for (const path of PUBLIC) assert.equal(await cacheFor(path), undefined, path);
});

test("les fichiers du logo et des icônes sont en cache long", async () => {
  for (const path of ["/brand/raie.svg", "/icons/icon-512.png", "/ocean/rays.webp", "/favicon.ico"]) {
    assert.match((await cacheFor(path)) ?? "", /public, max-age=\d{6,}/, path);
  }
});

test("site lancé : vrais en-têtes (CACHE_HTTP=1)", { skip: !process.env.CACHE_HTTP }, async () => {
  const BASE = process.env.BASE || "http://localhost:3000";
  for (const path of MUST_BE_PRIVATE.filter((p) => !p.startsWith("/api/stripe/webhook"))) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    const cc = res.headers.get("cache-control") ?? "";
    assert.ok(/private/.test(cc) && /no-store/.test(cc) && !/public|s-maxage/.test(cc), `${path} → ${cc}`);
  }
  for (const path of ["/", "/pricing"]) {
    const cc = (await fetch(BASE + path)).headers.get("cache-control") ?? "";
    assert.ok(!/no-store/.test(cc), `${path} → ${cc}`);
  }
});
