// TEMPORAIRE — banc d'essai, actif seulement sur une adresse de test Vercel (jamais sur fishflow.fr).
// À supprimer avant la mise en ligne.
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { costUsd, makeContext, runEngine, transcribeImages, type EngineResult } from "@/lib/fiche-engine";
import { oldGenerate } from "@/bench/old-engine";
import { judge, makeKey, type JudgeKey } from "@/bench/judge-lib";
import corpus from "@/bench/corpus.json";

export const runtime = "nodejs";
export const maxDuration = 120;

type Case = { id: string; text: string; pro: boolean; image?: string };

export async function POST(req: Request) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "off" }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "connexion" }, { status: 401 });

  const body = (await req.json()) as { action: string; caseId: string; engine?: string; key?: JudgeKey; result?: EngineResult; length?: string };
  const c = (corpus as Record<string, Case>)[body.caseId];
  if (!c) return NextResponse.json({ error: "cas inconnu" }, { status: 400 });
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const cost = { usd: 0 };
  const t0 = Date.now();

  try {
    if (body.action === "key") {
      const key = await makeKey(client, c.text, cost);
      return NextResponse.json({ key, judgeUsd: cost.usd });
    }
    if (body.action === "gen") {
      const length = body.length ?? "moyen";
      if (body.engine === "old") {
        const { raw, ms, usage } = await oldGenerate(c.text, { pro: c.pro, length });
        const usd = ((usage?.prompt_tokens ?? 0) * 0.15 + (usage?.completion_tokens ?? 0) * 0.6) / 1e6;
        return NextResponse.json({ result: raw, ms, usd });
      }
      const model = body.engine?.split(":")[1];
      const models = model ? { plan: model, write: model, check: model, cards: model, vision: model } : undefined;
      const ctx = makeContext({ models, deadline: Date.now() + 110000 });
      const out = await runEngine(ctx, c.text, { outputs: ["summary", "sheet", "flashcards", "quiz"], difficulty: "moyen", length, pro: c.pro });
      return NextResponse.json({ result: out.result, report: out.report, usage: out.usage, ms: Date.now() - t0, usd: costUsd(out.usage) });
    }
    if (body.action === "photo" && c.image) {
      // Même chemin que /api/generate en mode photo : transcription, puis moteur.
      const ctx = makeContext({ deadline: Date.now() + 110000 });
      const source = await transcribeImages(ctx, [c.image]);
      const out = await runEngine(ctx, source, { outputs: ["summary", "sheet", "flashcards", "quiz"], difficulty: "moyen", length: "moyen", pro: true });
      return NextResponse.json({ source, result: out.result, report: out.report, ms: Date.now() - t0, usd: costUsd(out.usage) });
    }
    if (body.action === "judge" && body.key && body.result) {
      const scores = await judge(client, c.text, body.key, body.result, cost, c.text.length > 30000 ? "low" : "medium");
      return NextResponse.json({ scores, judgeUsd: cost.usd });
    }
    return NextResponse.json({ error: "action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e), ms: Date.now() - t0 }, { status: 500 });
  }
}
