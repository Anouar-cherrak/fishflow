// Recherche d'articles sur Wikipédia (français d'abord, anglais en renfort) : texte complet, adresse et image principale.
// Wikipédia est gratuit et chaque réponse de FishFlow renvoie vers l'article d'origine.

const USER_AGENT = "FishFlow/1.0 (application pedagogique)";
const TIMEOUT_MS = 8000;
// Assez de texte pour trouver le bon passage, sans charger des livres entiers.
const MAX_TEXT = 60000;

export type Lang = "fr" | "en";

export type WikiArticle = {
  pageId: number;
  lang: Lang;
  site: string;
  title: string;
  url: string;
  text: string;
  image: { src: string; width: number; height: number } | null;
};

const apiUrl = (lang: Lang) => `https://${lang}.wikipedia.org/w/api.php`;

async function callApi(lang: Lang, params: Record<string, string>) {
  const res = await fetch(`${apiUrl(lang)}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}

// Titres des articles qui correspondent le mieux à une recherche.
export async function searchTitles(query: string, lang: Lang, limit = 3): Promise<string[]> {
  const json = (await callApi(lang, { action: "query", list: "search", srsearch: query, srlimit: String(limit), srnamespace: "0" })) as {
    query?: { search?: { title?: string }[] };
  };
  return (json.query?.search ?? []).map((s) => s.title ?? "").filter(Boolean);
}

type ApiPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  fullurl?: string;
  missing?: boolean;
  thumbnail?: { source?: string; width?: number; height?: number };
};

// Le texte complet d'un article (sans mise en forme), son adresse et son image principale.
export async function fetchArticle(title: string, lang: Lang): Promise<WikiArticle | null> {
  const json = (await callApi(lang, {
    action: "query",
    titles: title,
    prop: "extracts|pageimages|info",
    explaintext: "1",
    exsectionformat: "plain",
    piprop: "thumbnail",
    pithumbsize: "900",
    inprop: "url",
    redirects: "1",
  })) as { query?: { pages?: ApiPage[] } };
  const page = json.query?.pages?.[0];
  const text = (page?.extract ?? "").trim();
  if (!page || page.missing || !page.pageid || !page.title || !page.fullurl || text.length < 300) return null;
  // On écarte les pages « homonymie » : elles ne répondent à aucune question.
  if (/peut (d[ée]signer|faire r[ée]f[ée]rence)|may refer to/i.test(text.slice(0, 400))) return null;
  const thumb = page.thumbnail;
  return {
    pageId: page.pageid,
    lang,
    site: lang === "fr" ? "Wikipédia" : "Wikipedia (anglais)",
    title: page.title,
    url: page.fullurl,
    text: text.slice(0, MAX_TEXT),
    image: thumb?.source && thumb.width && thumb.height ? { src: thumb.source, width: thumb.width, height: thumb.height } : null,
  };
}

// Cherche avec plusieurs requêtes en parallèle, sans doublons, et charge les meilleurs articles.
export async function searchArticles(queries: string[], lang: Lang, maxArticles = 3): Promise<WikiArticle[]> {
  const batches = await Promise.all(queries.map((q) => searchTitles(q, lang, 3).catch(() => [] as string[])));
  // On alterne les résultats de chaque requête : le meilleur de chacune passe en premier.
  const titles: string[] = [];
  const longest = Math.max(0, ...batches.map((b) => b.length));
  for (let i = 0; i < longest; i++) for (const b of batches) if (b[i] && !titles.includes(b[i])) titles.push(b[i]);
  const articles = await Promise.all(titles.slice(0, maxArticles + 2).map((t) => fetchArticle(t, lang).catch(() => null)));
  const seen = new Set<number>();
  return articles.filter((a): a is WikiArticle => !!a && !seen.has(a.pageId) && !!seen.add(a.pageId)).slice(0, maxArticles);
}
