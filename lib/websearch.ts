import type { WikiArticle } from "./wikipedia";

// Recherche web limitée à une liste de sites réputés fiables (via Tavily).
// Clé facultative : sans TAVILY_API_KEY, « Apprendre » fonctionne avec Wikipédia seul.
const TAVILY_URL = "https://api.tavily.com/search";
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 3;
const MAX_CHARS = 1500;

// domaine -> nom affiché. Pour ajouter ou retirer un site, modifie uniquement cette liste.
export const TRUSTED_SITES: Record<string, string> = {
  "lemonde.fr": "Le Monde",
  "futura-sciences.com": "Futura Sciences",
  "sciencesetavenir.fr": "Sciences et Avenir",
  "pourlascience.fr": "Pour la Science",
  "cnrs.fr": "CNRS",
  "inserm.fr": "Inserm",
  "cea.fr": "CEA",
  "nasa.gov": "NASA",
  "esa.int": "ESA",
  "who.int": "OMS",
  "nih.gov": "NIH",
  "nature.com": "Nature",
  "britannica.com": "Britannica",
  "larousse.fr": "Larousse",
  "universalis.fr": "Encyclopædia Universalis",
  "insee.fr": "Insee",
  "service-public.fr": "Service-public.fr",
  "vie-publique.fr": "Vie publique",
  "nationalgeographic.fr": "National Geographic",
  "ademe.fr": "Ademe",
};

function siteName(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const domain = Object.keys(TRUSTED_SITES).find((d) => host === d || host.endsWith(`.${d}`));
    return domain ? TRUSTED_SITES[domain] : null;
  } catch {
    return null;
  }
}

type TavilyResult = { title?: string; url?: string; content?: string };

export async function searchTrustedWeb(query: string): Promise<WikiArticle[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 6,
      include_domains: Object.keys(TRUSTED_SITES),
      include_answer: false,
      include_images: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { results?: TavilyResult[] };
  const out: WikiArticle[] = [];

  for (const [i, r] of (json.results ?? []).entries()) {
    const site = r.url ? siteName(r.url) : null;
    const text = (r.content ?? "").trim().slice(0, MAX_CHARS);
    // On ne garde que les sites de la liste (on ne fait pas confiance au filtre seul).
    if (!r.url || !r.title || !site || text.length < 120) continue;
    out.push({ pageId: -(i + 1), site, title: r.title.trim(), url: r.url, text, image: null });
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}
