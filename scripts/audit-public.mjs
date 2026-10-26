// Captures, poids et contrôle d'accessibilité (axe) des pages publiques, sur le site lancé en local.
// Usage : node scripts/audit-public.mjs <dossier-de-sortie>   (BASE=http://localhost:3000 par défaut)
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = process.argv[2] || "captures/audit";
const PAGES = {
  accueil: "/", tarifs: "/pricing", connexion: "/login", inscription: "/signup",
  "mot-de-passe": "/reset-password", "nouveau-mot-de-passe": "/reset-password/confirm",
  cgu: "/cgu", confidentialite: "/confidentialite", mentions: "/mentions-legales",
  "fiche-partagee": "/p/11111111-1111-4111-8111-111111111111", introuvable: "/cette-page-nexiste-pas",
};
mkdirSync(OUT, { recursive: true });
const report = {};
const browser = await chromium.launch();
for (const theme of ["dark", "light"]) {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 800 }, colorScheme: theme, serviceWorkers: "block", deviceScaleFactor: 1, isMobile: width < 800, hasTouch: width < 800 });
    await ctx.addInitScript((t) => { try { localStorage.setItem("ff-theme2", t); localStorage.setItem("ff-consent", "no"); } catch {} }, theme);
    for (const [name, path] of Object.entries(PAGES)) {
      const page = await ctx.newPage();
      let bytes = 0;
      const client = await ctx.newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.setCacheDisabled", { cacheDisabled: true });
      client.on("Network.loadingFinished", (e) => (bytes += e.encodedDataLength));
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const key = `${name}-${width}-${theme}`;
      const r = (report[key] = { path, width, theme });
      r.ko = Math.round(bytes / 1024);
      r.h1 = await page.locator("h1").count();
      if (theme === "dark") {
        await page.screenshot({ path: `${OUT}/${name}-${width}-haut.png` });
        await page.screenshot({ path: `${OUT}/${name}-${width}-page.png`, fullPage: true });
      }
      for (const w of width < 800 ? [360, 390, 768] : []) {
        await page.setViewportSize({ width: w, height: 844 });
        await page.waitForTimeout(150);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 0) (r.debordement ??= {})[w] = over;
      }
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      r.axe = axe.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
      await page.close();
      console.log(key, r.ko + " Ko", "axe:", r.axe.map((v) => `${v.id}(${v.n})`).join(", ") || "rien", r.debordement ? "DÉBORDE " + JSON.stringify(r.debordement) : "");
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/rapport.json`, JSON.stringify(report, null, 2));
