// Attaques corrigées en octobre 2026 (branche securite-complete) : chaque test rejoue l'attaque et vérifie qu'elle échoue.
// Lancer : node --test tests/securite-partage.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { publicFicheData } from "../lib/public-fiche.ts";
import { siteUrl } from "../lib/site-url.ts";

test("lien partagé : le cours d'origine (notes perso) n'est jamais envoyé", () => {
  const fiche = { title: "Révolution", summary: "…", flashcards: [{ question: "q", answer: "r" }], sourceText: "Mes notes privées + numéro de téléphone" };
  const shown = publicFicheData(fiche);
  assert.equal("sourceText" in shown, false);
  assert.ok(!JSON.stringify(shown).includes("notes privées"));
  assert.equal(shown.title, "Révolution");
  assert.equal(shown.flashcards.length, 1);
});

test("mot de passe oublié / paiement : un faux site dans la demande ne sert jamais d'adresse de retour", () => {
  const req = (origin) => new Request("https://fishflow.fr/api/auth/reset", { method: "POST", headers: origin ? { origin } : {} });
  assert.equal(siteUrl(req("https://site-pirate.example")), "https://fishflow.fr");
  assert.equal(siteUrl(req("https://fishflow.fr.site-pirate.example")), "https://fishflow.fr");
  assert.equal(siteUrl(req(null)), "https://fishflow.fr");
  assert.equal(siteUrl(req("https://www.fishflow.fr")), "https://www.fishflow.fr");
});
