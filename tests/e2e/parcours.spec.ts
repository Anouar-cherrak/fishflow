// Parcours complets de FishFlow, de l'inscription à la déconnexion.
// Le serveur (Supabase, OpenAI, Stripe) est simulé dans le navigateur : on vérifie ce que voit et fait l'étudiant,
// jamais un vrai compte, un vrai e-mail ni un vrai paiement.
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockAccount, ficheData } from "./mock.mjs";

const theme = (name: string) => (name.endsWith("sombre") ? "dark" : "light");

test.beforeEach(async ({ context }, info) => {
  const t = theme(info.project.name);
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("ff-theme2", t);
      localStorage.setItem("ff-consent", "no");
    } catch {}
  }, t);
});

const signIn = (context: BrowserContext, opts = {}) => mockAccount(context, opts) as Promise<void>;
const noJsError = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};

test("inscription : formulaire, code reçu, arrivée sur Générer", async ({ page, context }) => {
  const errors = noJsError(page);
  await page.route("**/api/auth/signup", (r) => r.fulfill({ json: { message: "Un code vient de t'être envoyé par email." } }));
  await page.route("**/api/auth/verify", async (r) => {
    await signIn(context);
    await r.fulfill({ json: { message: "ok" } });
  });
  await page.goto("/signup");
  await page.getByLabel("Email").fill("testeur@exemple.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("un-mot-de-passe-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByLabel("Code reçu par email").fill("123456");
  await page.getByRole("button", { name: "Confirmer mon compte" }).click();
  await expect(page).toHaveURL(/\/generer/);
  expect(errors).toEqual([]);
});

test("connexion", async ({ page, context }) => {
  await page.route("**/api/auth/login", async (r) => {
    await signIn(context);
    await r.fulfill({ json: { message: "ok" } });
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("testeur@exemple.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("un-mot-de-passe-solide");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/generer/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Crée ta fiche");
});

test("déconnexion", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/generer");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Déconnexion" }).click();
  // Retour à l'accueil.
  await expect(page).toHaveURL(/:\d+\/?$/);
});

test("génération d'une fiche : chargement par étapes, puis la fiche", async ({ page, context }) => {
  await signIn(context);
  let answer: (() => void) | undefined;
  await page.route("**/api/generate", async (r) => {
    await new Promise<void>((res) => (answer = res));
    await r.fulfill({ json: ficheData(0) });
  });
  await page.goto("/generer");
  await page.locator("#cours").fill("La photosynthèse permet aux plantes de fabriquer leur nourriture à partir de la lumière. ".repeat(4));
  await page.getByRole("button", { name: "Créer ma fiche", exact: true }).click();
  const loader = page.locator(".ff-loader");
  await expect(loader).toBeVisible();
  await expect(loader.locator("li", { hasText: "Je lis ton cours…" })).toBeVisible();
  // L'écran couvre toute la page (rien ne transparaît, rien ne passe devant).
  const box = await loader.boundingBox();
  const vp = page.viewportSize()!;
  expect(box && box.y <= 0 && box.height >= vp.height - 1).toBeTruthy();
  answer?.();
  await expect(page).toHaveURL(/\/fiche\/f0/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("La photosynthèse");
});

test("création en erreur : message clair et Réessayer", async ({ page, context }) => {
  await signIn(context);
  let calls = 0;
  await page.route("**/api/generate", (r) =>
    ++calls === 1 ? r.fulfill({ status: 500, json: { error: "Service surchargé : réessaie dans une minute." } }) : r.fulfill({ json: ficheData(0) })
  );
  await page.goto("/generer");
  await page.locator("#cours").fill("Un cours de test. ".repeat(10));
  await page.getByRole("button", { name: "Créer ma fiche", exact: true }).click();
  await expect(page.locator(".ff-loader [role=alert]")).toContainText("Service surchargé");
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page).toHaveURL(/\/fiche\/f0/);
  expect(calls).toBe(2);
});

test("flashcards : retourner chaque carte et finir la série", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/fiche/f0");
  await page.getByRole("button", { name: "Étudier les flashcards" }).first().click();
  for (let i = 0; i < 4; i++) {
    await page.locator(".ff-flip").click();
    await page.getByRole("button", { name: "Je savais" }).click();
  }
  await expect(page.getByRole("status").filter({ hasText: "réussies du premier coup" })).toBeVisible();
});

test("quiz : répondre et voir son score", async ({ page, context }) => {
  await signIn(context);
  await page.goto("/fiche/f0");
  await page.waitForLoadState("networkidle");
  const quiz = page.getByText("Que produit la photosynthèse ?");
  await quiz.scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /Du glucose et de l'O₂/ })).toBeVisible();
  await page.getByRole("button", { name: /Du glucose et de l'O₂/ }).click();
  await page.getByRole("button", { name: "Question suivante" }).click();
  await page.getByRole("button", { name: /Par les stomates/ }).click();
  await page.getByRole("button", { name: "Voir mon score" }).click();
  await expect(page.getByText("100%")).toBeVisible();
});

test("paiement (mode test simulé) : Passer Pro ouvre le paiement", async ({ page, context }) => {
  await signIn(context);
  let asked = false;
  await page.route("**/api/stripe/checkout", (r) => {
    asked = true;
    return r.fulfill({ json: { url: "/generer?checkout=success" } });
  });
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Passer Pro/ }).click();
  await expect(page).toHaveURL(/\/generer/);
  expect(asked).toBe(true);
});

test("accessibilité (axe) : aucune erreur grave sur les pages principales", async ({ page, context }) => {
  await signIn(context);
  // Page immobile : on mesure les couleurs finales, pas un élément en plein fondu d'apparition.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/login", "/pricing", "/generer", "/mes-fiches", "/fiche/f0", "/aujourdhui", "/parametres", "/cgu"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page: page as never })
      // Le zoom est bloqué volontairement (demande du propriétaire) : seule règle écartée.
      .disableRules(["meta-viewport"])
      .analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path} : ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});

test("clavier : lien d'évitement, puis flashcards au clavier", async ({ page, context }, info) => {
  test.skip(!info.project.name.startsWith("ordi"), "clavier physique : ordinateur seulement");
  await signIn(context);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  await page.goto("/fiche/f0");
  await page.getByRole("button", { name: "Étudier les flashcards" }).first().click();
  await page.keyboard.press("Space");
  await expect(page.locator(".ff-flip")).toHaveAttribute("data-flipped", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/Carte 2 \/ 4/)).toBeVisible();
});
