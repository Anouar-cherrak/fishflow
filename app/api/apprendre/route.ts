import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProUser, refundUsage, reserveUsage } from "@/lib/usage";
import { getApprendreQuota } from "@/lib/apprendre-quota";
import { answerQuestion } from "@/lib/apprendre-engine";

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
  const quota = await getApprendreQuota(user.id, pro);
  const quotaError = () =>
    pro
      ? fail("Tu as atteint la limite du jour. Reviens demain.", 429)
      : fail("Tu as utilisé ta question gratuite. Passe Pro pour en poser 20 par jour.", 403, { code: "pro_required" });
  if (!quota.allowed) return quotaError();

  if (!process.env.OPENAI_API_KEY) return fail("Service momentanément indisponible.", 503);

  // On réserve l'utilisation avant d'appeler l'IA (impossible de la dépasser en envoyant plusieurs demandes d'un coup),
  // et on la rend si la réponse n'a pas pu être donnée.
  if (!(await reserveUsage(user.id, quota.key, quota.limit))) return quotaError();
  const giveBack = async () => {
    await refundUsage(user.id, quota.key);
  };

  try {
    const { result } = await answerQuestion(question);
    // Pas une question de connaissance : on ne compte pas l'utilisation.
    if (!result.found) await giveBack();
    return NextResponse.json(result);
  } catch (e) {
    console.error("Erreur Apprendre:", (e as Error)?.message || e);
    await giveBack();
    return fail("L'IA n'a pas répondu. Réessaie.", 502);
  }
}
