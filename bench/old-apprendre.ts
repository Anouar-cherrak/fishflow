// Copie figée de l'ANCIEN Apprendre (commit 4ac883d), pour le banc d'essai uniquement.
import OpenAI from "openai";
import { imagesFromArticle, type CommonsImage } from "../lib/commons.ts";

const API_URL = "https://fr.wikipedia.org/w/api.php";
const USER_AGENT = "FishFlow/1.0 (application pedagogique)";
const TIMEOUT_MS = 8000;
const MAX_CHARS = 3000;

type WikiArticle = {
  pageId: number;
  site: string;
  title: string;
  url: string;
  text: string;
  image: { src: string; width: number; height: number } | null;
};

type ApiPage = {
  pageid?: number;
  title?: string;
  index?: number;
  extract?: string;
  fullurl?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
};

async function searchOnce(query: string, limit: number): Promise<WikiArticle[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrlimit: String(limit),
    gsrnamespace: "0",
    prop: "extracts|pageimages|info",
    exchars: String(MAX_CHARS),
    exlimit: String(limit),
    explaintext: "1",
    exsectionformat: "plain",
    piprop: "thumbnail",
    pithumbsize: "900",
    inprop: "url",
    redirects: "1",
  });

  const res = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);

  const json = (await res.json()) as { query?: { pages?: ApiPage[] } };
  const pages = json.query?.pages ?? [];

  return pages
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap((page): WikiArticle[] => {
      const text = (page.extract ?? "").trim();
      if (!page.pageid || !page.title || !page.fullurl || text.length < 200) return [];
      // On écarte les pages « homonymie » : elles ne répondent à aucune question.
      if (/peut (d[ée]signer|faire r[ée]f[ée]rence)/i.test(text.slice(0, 400))) return [];

      const thumb = page.thumbnail;
      return [
        {
          pageId: page.pageid,
          site: "Wikipédia",
          title: page.title,
          url: page.fullurl,
          text,
          image:
            thumb?.source && thumb.width && thumb.height
              ? { src: thumb.source, width: thumb.width, height: thumb.height }
              : null,
        },
      ];
    });
}

// Cherche avec plusieurs requêtes en parallèle, sans doublons, et garde les meilleurs articles.
async function searchArticles(queries: string[], maxArticles = 4): Promise<WikiArticle[]> {
  const batches = await Promise.all(queries.map((q) => searchOnce(q, 3)));

  const seen = new Set<number>();
  const merged: WikiArticle[] = [];
  // On alterne les résultats de chaque requête pour garder de la variété.
  const longest = Math.max(0, ...batches.map((b) => b.length));
  for (let i = 0; i < longest; i++) {
    for (const batch of batches) {
      const article = batch[i];
      if (article && !seen.has(article.pageId)) {
        seen.add(article.pageId);
        merged.push(article);
      }
    }
  }
  return merged.slice(0, maxArticles);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Les signes comme « ? » gênent la recherche : on les enlève avant de chercher.
function cleanQuery(text: string): string {
  return text.replace(/[?!¿¡"«»]/g, " ").replace(/\s+/g, " ").trim();
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

// Même enchaînement que l'ancienne route, sans quota ni connexion.
export async function oldApprendre(question: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ANSWER_PROMPT },
      { role: "user", content: `Question de l'utilisateur : """${question}"""` },
    ],
  });
  const answer = normalizeAnswer(JSON.parse(completion.choices[0]?.message?.content ?? "{}"));
  if (!answer || answer.refusal || answer.points.length === 0) return { found: false };
  let articles: WikiArticle[] = [];
  try {
    articles = await searchArticles(answer.queries.length > 0 ? answer.queries : [cleanQuery(question).slice(0, 80)], 3);
  } catch {
    articles = [];
  }
  type Candidate = { image: CommonsImage; article: number };
  const candidates: Candidate[] = [];
  articles.slice(0, 2).forEach((a, idx) => {
    if (a.image) candidates.push({ article: idx, image: { src: a.image.src, width: a.image.width, height: a.image.height, alt: a.title, credit: "Wikipédia", license: "Licence libre", pageUrl: a.url } });
  });
  if (articles[0]) {
    const extra = await imagesFromArticle(articles[0].title, 8).catch(() => [] as CommonsImage[]);
    for (const img of extra) if (!candidates.some((c) => c.image.src === img.src)) candidates.push({ article: 0, image: img });
  }
  const verdict = await pickRelevant(openai, question, answer.title, articles, candidates.map((c) => c.image.alt)).catch(() => null);
  const keptArticles = verdict ? articles.filter((_, i) => verdict.articles.includes(i)) : articles.slice(0, 1);
  const keptImages = verdict ? candidates.filter((_, i) => verdict.images.includes(i)).map((c) => c.image) : [];
  return {
    found: true,
    title: answer.title,
    summary: answer.summary,
    points: answer.points,
    caution: answer.caution,
    sources: keptArticles.map((a, i) => ({ id: i + 1, title: a.title, url: a.url, site: a.site })),
    images: keptImages.slice(0, 3),
  };
}
