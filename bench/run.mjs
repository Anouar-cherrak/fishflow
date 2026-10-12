// Banc d'essai — génère les fiches de chaque cours du corpus avec un moteur donné.
// Usage : node --env-file=.env.local bench/run.mjs <moteur> [cas,cas…]
//   moteur = old | new:<modèle>   (ex. new:gpt-4o-mini, new:gpt-4.1-mini)
// Résultats : bench/out/<moteur>/<cas>.json
import fs from "node:fs";
import path from "node:path";
import { oldGenerate } from "./old-engine.ts";
import { makeContext, runEngine, costUsd } from "../lib/fiche-engine.ts";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const engine = process.argv[2] || "old";
const only = process.argv[3]?.split(",");
const cases = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, "corpus.json"), "utf8"))).filter((c) => !only || only.includes(c.id));
const outDir = path.join(ROOT, "out", engine.replace(/[:/]/g, "_"));
fs.mkdirSync(outDir, { recursive: true });

const OLD_PRICE = { input: 0.15, output: 0.6 };

async function runOne(c) {
  const text = c.text;
  const opts = { pro: c.pro, length: c.length ?? "moyen", difficulty: c.difficulty ?? "moyen" };
  const t0 = Date.now();
  try {
    if (engine === "old") {
      const { raw, ms, usage } = await oldGenerate(text, opts);
      const cost = ((usage?.prompt_tokens ?? 0) * OLD_PRICE.input + (usage?.completion_tokens ?? 0) * OLD_PRICE.output) / 1e6;
      return { id: c.id, ms, cost, result: raw };
    }
    const model = engine.split(":")[1] || undefined;
    const models = model ? { plan: model, write: model, check: model, cards: model, vision: model } : undefined;
    const ctx = makeContext({ models, deadline: Date.now() + (c.pro ? 280000 : 280000) });
    const out = await runEngine(ctx, text.slice(0, c.pro ? 60000 : 15000), {
      outputs: ["summary", "sheet", "flashcards", "quiz"],
      ...opts,
    });
    return { id: c.id, ms: Date.now() - t0, cost: costUsd(out.usage), usage: out.usage, report: out.report, plan: out.plan, result: out.result };
  } catch (e) {
    return { id: c.id, ms: Date.now() - t0, error: String(e?.message || e) };
  }
}

// 3 cours en même temps au plus.
const queue = [...cases];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const c = queue.shift();
      const r = await runOne(c);
      fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify(r, null, 2));
      console.log(`${engine} ${c.id}: ${r.error ? "ERREUR " + r.error : `${(r.ms / 1000).toFixed(1)} s, ${(r.cost * 100).toFixed(2)} c$`}`);
    }
  })
);
