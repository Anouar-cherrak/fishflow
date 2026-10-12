// Banc d'essai en local (avec une clé dans .env.local) — note les fiches produites par run.mjs.
// Usage : node --env-file=.env.local bench/judge.mjs <moteur>
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { judge, makeKey } from "./judge-lib.ts";

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const engine = process.argv[2] || "old";
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, "corpus.json"), "utf8"));
const outDir = path.join(ROOT, "out", engine.replace(/[:/]/g, "_"));
const client = new OpenAI();
const cost = { usd: 0 };
const scores = [];
for (const c of Object.values(corpus)) {
  const file = path.join(outDir, `${c.id}.json`);
  if (!fs.existsSync(file)) continue;
  const run = JSON.parse(fs.readFileSync(file, "utf8"));
  if (run.error) continue;
  const keyFile = path.join(ROOT, "keys", `${c.id}.json`);
  if (!fs.existsSync(keyFile)) {
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    fs.writeFileSync(keyFile, JSON.stringify(await makeKey(client, c.text, cost), null, 2));
  }
  const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  const s = await judge(client, c.text, key, run.result, cost);
  scores.push({ id: c.id, ...s, secondes: run.ms / 1000, centimes: run.cost * 100 });
  console.log(c.id, s.completude.toFixed(0), s.exactitude.toFixed(1));
}
fs.writeFileSync(path.join(outDir, "_scores.json"), JSON.stringify(scores, null, 2));
console.log(`Coût du correcteur : ${cost.usd.toFixed(2)} $`);
