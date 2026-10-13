import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProUser } from "@/lib/usage";
import { recordCost, reserveFor } from "@/lib/quota";
import { answerQuestion, apprendreCostUsd } from "@/lib/apprendre-engine";

export const runtime = "nodejs";
// Recherche dans Wikipédia + lecture des articles + réponse : environ 10 à 20 secondes.
export const maxDuration = 60;

const MIN_QUESTION = 3;
const MAX_QUESTION = 300;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Connecte-toi pour utiliser cette fonctionnalité.", 401);

  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = asText(body.question);
  } catch {
    return fail("Question invalide.", 400);
  }
  if (question.length < MIN_QUESTION) return fail("Écris une question un peu plus longue.", 400);
  if (question.length > MAX_QUESTION) return fail(`Ta question est trop longue (${MAX_QUESTION} caractères max).`, 400);

  const pro = await isProUser(user.id);
  if (!process.env.OPENAI_API_KEY) return fail("Service momentanément indisponible.", 503);

  // Limites d'usage (lib/limits.ts) : réservées de façon atomique avant d'appeler l'IA, rendues si la réponse n'a pas pu être donnée.
  const reservation = await reserveFor(req, user.id, pro, "apprendre");
  if (!reservation.ok) {
    const { ok: _ok, status, scope: _scope, error, ...extra } = reservation;
    void _ok;
    void _scope;
    return fail(error, status, extra);
  }
  const giveBack = reservation.refund;

  try {
    const { result, usage } = await answerQuestion(question);
    await recordCost(user.id, apprendreCostUsd(usage));
    // Pas une question de connaissance : on ne compte pas l'utilisation.
    if (!result.found) await giveBack();
    return NextResponse.json(result);
  } catch (e) {
    console.error("Erreur Apprendre:", (e as Error)?.message || e);
    await giveBack();
    return fail("L'IA n'a pas répondu. Réessaie.", 502);
  }
}
