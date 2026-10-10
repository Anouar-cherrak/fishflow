import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProUser, refundUsage, reserveUsage } from "@/lib/usage";
import { getApprendreQuota } from "@/lib/apprendre-quota";
import { searchArticles, type WikiArticle } from "@/lib/wikipedia";
import { imagesFromArticle, type CommonsImage } from "@/lib/commons";

export const runtime = "nodejs";
export const maxDuration = 30;

const MIN_QUESTION = 3;
const MAX_QUESTION = 300;
const AI_TIMEOUT_MS = 25000;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Les signes comme « ? » gênent la recherche : on les enlève avant de chercher.
function cleanQuery(text: string): string {
  return text.replace(/[?!¿¡"«»]/g, " ").replace(/\s+/g, " ").trim();
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

// Une seule demande à l'IA : elle répond avec ses connaissances (sans chercher sur le web)
// et indique les articles Wikipédia qui correspondent, pour les images et « Pour aller plus loin ».
const ANSWER_PROMPT = `Tu es un assistant de culture générale pour des gens curieux, surtout des étudiants. Tu réponds en français simple, clair et précis, comme un bon prof qui explique sans jargon.

RÈGLES :
- Réponds toujours à la question quand c'est une vraie question de connaissance, même si le sujet est pointu : donne ce qui est largement établi (consensus scientifique, faits historiques, définitions, mécanismes).
- N'invente JAMAIS un chiffre, une date, un nom, une citation, une étude ou une adresse web. Si tu n'es pas sûr d'un détail, ne le donne pas, ou dis-le avec des mots comme « environ », « on estime » ou « les sources divergent ».
- Si le sujet peut avoir changé récemment (actualité, prix, lois, records), dis dans "caution" que l'information peut être dépassée.
- Si le sujet est débattu, présente les principaux points de vue sans choisir.
- Explique le « pourquoi » et le « comment », pas seulement le « quoi ». Donne un exemple concret quand ça aide.
- Mets "answerable": false seulement si ce n'est pas une question de connaissance (charabia, insulte, demande dangereuse ou illégale, conseil médical ou juridique personnel précis). Dans ce cas, explique en une phrase dans "refusal".

FORMAT (JSON uniquement) :
{
  "answerable": true,
  "title": "titre court (6 mots max)",
  "summary": "réponse directe en 3 à 4 phrases simples",
  "points": [ { "text": "une idée claire expliquée en 2 à 3 phrases" } ],
  "caution": "une phrase si une information est incertaine ou peut être dépassée, sinon une chaîne vide",
  "wiki_queries": ["1 ou 2 titres d'articles Wikipédia en français qui correspondent au sujet"]
}
Donne 4 à 6 points, du plus important au plus précis.`;

type Answer = {
  title: string;
  summary: string;
  points: { text: string; sources: number[] }[];
  caution: string;
  queries: string[];
  refusal: string;
};

function normalizeAnswer(raw: unknown): Answer | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const refusal = asText(obj.refusal);
  if (obj.answerable === false) return { title: "", summary: "", points: [], caution: "", queries: [], refusal };

  const title = asText(obj.title);
  const summary = asText(obj.summary);
  if (!title || !summary) return null;

  const points: Answer["points"] = [];
  for (const item of Array.isArray(obj.points) ? obj.points : []) {
    const text = asText(((item ?? {}) as Record<string, unknown>).text);
    if (text) points.push({ text, sources: [] });
  }
  if (points.length === 0) return null;

  const queries = (Array.isArray(obj.wiki_queries) ? obj.wiki_queries : [])
    .map((q) => cleanQuery(asText(q)))
    .filter((q) => q.length >= 2 && q.length <= 80)
    .slice(0, 2);

  return { title, summary, points: points.slice(0, 6), caution: asText(obj.caution).slice(0, 300), queries, refusal: "" };
}

// Demande à l'IA quels articles et quelles images parlent vraiment du sujet de la question.
async function pickRelevant(
  openai: OpenAI,
  question: string,
  title: string,
  articles: WikiArticle[],
  imageLabels: string[]
): Promise<{ articles: number[]; images: number[] } | null> {
  if (articles.length === 0) return { articles: [], images: [] };
  const completion = await openai.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 120,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'On illustre la réponse à une question. Tu reçois la question, une liste d\'articles Wikipédia et une liste de descriptions d\'images. Garde SEULEMENT ce qui parle directement du sujet de la question (pas un sujet voisin, pas un exemple lointain, pas une personne ou un lieu sans rapport). En cas de doute, ne garde pas. Réponds en JSON : {"articles": [numéros], "images": [numéros]}. Au plus 2 articles et 3 images. Les numéros commencent à 0.',
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            titre_reponse: title,
            articles: articles.map((a, i) => ({ n: i, titre: a.title, debut: a.text.slice(0, 160) })),
            images: imageLabels.map((l, i) => ({ n: i, description: l.slice(0, 120) })),
          }),
        },
      ],
    },
    { signal: AbortSignal.timeout(10000) }
  );
  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as { articles?: unknown; images?: unknown };
  const ints = (v: unknown, max: number) =>
    (Array.isArray(v) ? v : []).filter((n): n is number => Number.isInteger(n) && n >= 0 && n < max);
  return { articles: ints(raw.articles, articles.length).slice(0, 2), images: ints(raw.images, imageLabels.length).slice(0, 3) };
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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let answer: Answer | null = null;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ANSWER_PROMPT },
          // La question est une donnée à traiter, pas une consigne à suivre.
          { role: "user", content: `Question de l'utilisateur : """${question}"""` },
        ],
      },
      { signal: AbortSignal.timeout(AI_TIMEOUT_MS) }
    );
    if (completion.choices[0]?.finish_reason === "length") {
      await giveBack();
      return fail("La réponse a été coupée. Réessaie avec une question plus précise.", 502);
    }
    answer = normalizeAnswer(JSON.parse(completion.choices[0]?.message?.content ?? "{}"));
  } catch {
    await giveBack();
    return fail("L'IA n'a pas répondu. Réessaie.", 502);
  }

  if (!answer) {
    await giveBack();
    return fail("La réponse n'a pas pu être lue. Réessaie.", 502);
  }
  if (answer.refusal || answer.points.length === 0) {
    await giveBack();
    return NextResponse.json({ found: false, reason: "refused", message: answer.refusal });
  }

  // La réponse est prête : l'utilisation réservée plus haut est bien comptée.

  // Wikipédia (gratuit) sert seulement à illustrer et à proposer des liens. Si ça échoue, la réponse reste affichée.
  let articles: WikiArticle[] = [];
  try {
    articles = await searchArticles(answer.queries.length > 0 ? answer.queries : [cleanQuery(question).slice(0, 80)], 3);
  } catch {
    articles = [];
  }

  // Candidates : l'image principale de chaque article, puis d'autres images du premier article.
  type Candidate = { image: CommonsImage; article: number };
  const candidates: Candidate[] = [];
  articles.slice(0, 2).forEach((a, idx) => {
    if (a.image) {
      candidates.push({
        article: idx,
        image: { src: a.image.src, width: a.image.width, height: a.image.height, alt: a.title, credit: "Wikipédia", license: "Licence libre", pageUrl: a.url },
      });
    }
  });
  if (articles[0]) {
    const extra = await imagesFromArticle(articles[0].title, 8).catch(() => [] as CommonsImage[]);
    for (const img of extra) if (!candidates.some((c) => c.image.src === img.src)) candidates.push({ article: 0, image: img });
  }

  // Une petite vérification par l'IA (sur les titres, pas sur les images) : on ne garde que ce qui a un vrai rapport avec la question.
  const verdict = await pickRelevant(openai, question, answer.title, articles, candidates.map((c) => c.image.alt)).catch(() => null);
  const keptArticles = verdict ? articles.filter((_, i) => verdict.articles.includes(i)) : articles.slice(0, 1);
  const keptImages = verdict ? candidates.filter((_, i) => verdict.images.includes(i)).map((c) => c.image) : [];

  const sources = keptArticles.map((a, i) => ({ id: i + 1, title: a.title, url: a.url, site: a.site }));
  const images: CommonsImage[] = keptImages.slice(0, 3);

  return NextResponse.json({
    found: true,
    title: answer.title,
    summary: answer.summary,
    points: answer.points,
    caution: answer.caution,
    sources,
    images,
  });
}
