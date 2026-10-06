// Recherche d'articles sur Wikipédia (français) : texte, adresse et image principale.
// Wikipédia est gratuit et chaque réponse de FishFlow renvoie vers l'article d'origine.

const API_URL = "https://fr.wikipedia.org/w/api.php";
const USER_AGENT = "FishFlow/1.0 (application pedagogique)";
const TIMEOUT_MS = 8000;
const MAX_CHARS = 3000;

export type WikiArticle = {
  pageId: number;
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
export async function searchArticles(queries: string[], maxArticles = 4): Promise<WikiArticle[]> {
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
