// TEMPORAIRE — banc d'essai « Apprendre », actif seulement sur une adresse de test Vercel (jamais sur fishflow.fr).
// À supprimer avant la mise en ligne.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion, apprendreCostUsd } from "@/lib/apprendre-engine";
import { oldApprendre } from "@/bench/old-apprendre";
import { judgeApprendre } from "@/bench/judge-apprendre";
import { fetchArticle, searchTitles } from "@/lib/wikipedia";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "off" }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "connexion" }, { status: 401 });

  const body = (await req.json()) as { action: string; question: string; answer?: Parameters<typeof judgeApprendre>[1] };
  const t0 = Date.now();
  try {
    if (body.action === "wiki") {
      const out: Record<string, unknown> = {};
      for (const [lang, ua] of [["fr", "FishFlow/1.0 (application pedagogique)"], ["fr", "FishFlow/1.0 (https://fishflow.fr; contact@fishflow.fr)"], ["en", "FishFlow/1.0 (https://fishflow.fr; contact@fishflow.fr)"]]) {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(body.question)}&format=json&srlimit=2`;
        try {
          const r = await fetch(url, { headers: { "User-Agent": ua, Accept: "application/json" }, cache: "no-store" });
          out[lang + " | " + ua] = r.status + " " + (await r.text()).slice(0, 200);
        } catch (e) {
          out[lang + " | " + ua] = "ERREUR " + String((e as Error)?.message || e);
        }
      }
      return NextResponse.json(out);
    }
    if (body.action === "wiki2") {
      const out: Record<string, unknown> = {};
      try { out.titles = await searchTitles(body.question, "fr", 3); } catch (e) { out.titlesErr = String((e as Error)?.message || e); }
      try { const a = await fetchArticle(body.question, "fr"); out.article = a ? a.title + " " + a.text.length : null; } catch (e) { out.articleErr = String((e as Error)?.message || e); }
      try {
        const r = await fetch(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(body.question)}&format=json&formatversion=2&srlimit=2`, { headers: { "User-Agent": "FishFlow/1.0 (application pedagogique)", Accept: "application/json" }, next: { revalidate: 3600 } });
        out.cached = r.status + " " + (await r.text()).slice(0, 150);
      } catch (e) { out.cachedErr = String((e as Error)?.message || e); }
      return NextResponse.json(out);
    }
    if (body.action === "old") return NextResponse.json({ answer: await oldApprendre(body.question), ms: Date.now() - t0 });
    if (body.action === "new") {
      const out = await answerQuestion(body.question);
      return NextResponse.json({ answer: out.result, articles: out.articles, ms: Date.now() - t0, usd: apprendreCostUsd(out.usage) });
    }
    if (body.action === "judge" && body.answer) {
      const cost = { usd: 0 };
      return NextResponse.json({ scores: await judgeApprendre(body.question, body.answer, cost), judgeUsd: cost.usd });
    }
    return NextResponse.json({ error: "action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e), ms: Date.now() - t0 }, { status: 500 });
  }
}
