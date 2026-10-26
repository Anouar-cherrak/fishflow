// Captures, poids et contrôle d'accessibilité (axe) des pages CONNECTÉES, avec le faux compte des tests
// (tests/e2e/mock.mjs : Supabase et /api simulés dans le navigateur, aucune vraie donnée).
// Le site doit être construit avec NEXT_PUBLIC_SUPABASE_URL=https://exemple.supabase.co puis lancé (npm start).
// Usage : node scripts/audit-app.mjs <dossier-de-sortie>   (ONLY=generer,fiche pour quelques écrans)
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { mockAccount } from "../tests/e2e/mock.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = process.argv[2] || "captures/audit-app";
// Écran → page à ouvrir, et geste éventuel pour atteindre l'état voulu.
const SCREENS = {
  aujourdhui: { path: "/aujourdhui" },
  generer: { path: "/generer" },
  "mes-fiches": { path: "/mes-fiches" },
  "mes-fiches-vide": { path: "/mes-fiches", opts: { empty: true } },
  fiche: { path: "/fiche/f0" },
  flashcards: { path: "/fiche/f0", go: (p) => p.getByRole("button", { name: "Étudier les flashcards" }).first().click() },
  quiz: { path: "/fiche/f0", go: async (p) => { const q = p.getByText("Que produit la photosynthèse ?").first(); await q.scrollIntoViewIfNeeded(); await p.getByRole("button", { name: /Du glucose et de l'O₂/ }).click(); } },
  reviser: { path: "/reviser" },
  apprendre: { path: "/apprendre" },
  examens: { path: "/examens" },
  parametres: { path: "/parametres" },
  pro: { path: "/pricing" },
  menu: { path: "/generer", go: (p) => p.getByRole("button", { name: "Ouvrir le menu" }).click() },
};
if (process.env.ONLY) for (const k of Object.keys(SCREENS)) if (!process.env.ONLY.split(",").includes(k)) delete SCREENS[k];
mkdirSync(OUT, { recursive: true });

const report = {};
const browser = await chromium.launch();
for (const theme of ["dark", "light"]) {
  for (const width of (process.env.WIDTHS || "390,1280").split(",").map(Number)) {
    for (const [name, s] of Object.entries(SCREENS)) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 800 }, colorScheme: theme, serviceWorkers: "block", isMobile: width < 800, hasTouch: width < 800 });
      await ctx.addInitScript((t) => { try { localStorage.setItem("ff-theme2", t); localStorage.setItem("ff-consent", "no"); localStorage.setItem("ff-tuto-v1", "1"); } catch {} }, theme);
      await mockAccount(ctx, s.opts ?? {});
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(BASE + s.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const key = `${name}-${width}-${theme}`;
      const r = (report[key] = {});
      try { if (s.go) { await s.go(page); await page.waitForTimeout(500); } } catch (e) { r.geste = "échec : " + String(e.message).split("\n")[0]; }
      const shot = theme === "dark" ? `${name}-${width}` : `${name}-${width}-clair`;
      await page.screenshot({ path: `${OUT}/${shot}-haut.png` });
      await page.screenshot({ path: `${OUT}/${shot}-page.png`, fullPage: true });
      Object.assign(r, await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        boutons: document.querySelectorAll("main button, main a[href]").length,
        debordement: document.documentElement.scrollWidth - window.innerWidth,
        petitesCibles: Array.from(document.querySelectorAll("a, button, summary, input, textarea, select"))
          .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 44 && !el.closest("p, li, figcaption, label") && getComputedStyle(el).visibility !== "hidden"; })
          .map((el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 28)),
      })));
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      r.axe = axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
      r.erreursJS = errors;
      await ctx.close();
      console.log(key.padEnd(26), `h1:${r.h1} actions:${r.boutons}`, "axe:", r.axe.map((v) => `${v.id}(${v.n})`).join(", ") || "rien",
        r.debordement > 0 ? `DÉBORDE ${r.debordement}px` : "", r.petitesCibles.length ? `PETITES ${JSON.stringify(r.petitesCibles)}` : "", r.geste ?? "", errors.length ? "ERREUR JS" : "");
    }
  }
}
await browser.close();
writeFileSync(`${OUT}/rapport.json`, JSON.stringify(report, null, 2));
