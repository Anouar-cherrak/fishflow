// Images libres de droits tirées des articles Wikipédia déjà cités dans la réponse.
// Ce sont les images choisies par les rédacteurs de l'article : elles collent au sujet.
// Chaque image garde son auteur, sa licence et un lien vers sa page, comme la licence l'exige.

const API_URL = "https://fr.wikipedia.org/w/api.php";
const USER_AGENT = "FishFlow/1.0 (application pedagogique)";
const TIMEOUT_MS = 8000;
const MIN_WIDTH = 500;

export type CommonsImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
  license: string;
  pageUrl: string;
};

type ApiPage = {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    width?: number;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};

// Logos, icônes, drapeaux, cartes et modèles de pages : jamais utiles pour illustrer une réponse.
const SKIP_TITLE = /logo|icon|ic[oô]ne|flag|drapeau|symbol|ambox|question|wiki|commons|edit|pictogram|blason|armoiries|signature|map|carte/i;

function stripHtml(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

// Images utilisées dans un article Wikipédia (photos et schémas bitmap avec licence claire).
export async function imagesFromArticle(articleTitle: string, limit = 3): Promise<CommonsImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: articleTitle,
    generator: "images",
    gimlimit: "40",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "800",
    redirects: "1",
  });

  const res = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { query?: { pages?: ApiPage[] } };
  const out: CommonsImage[] = [];

  for (const page of json.query?.pages ?? []) {
    const info = page.imageinfo?.[0];
    const title = (page.title ?? "").replace(/^Fichier:|^File:/, "").replace(/\.[a-z]+$/i, "");
    if (!info?.thumburl || !info.thumbwidth || !info.thumbheight || !info.descriptionurl) continue;
    if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) continue;
    if ((info.width ?? 0) < MIN_WIDTH || SKIP_TITLE.test(title)) continue;

    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value);
    if (!license) continue; // sans licence claire, on n'affiche pas

    out.push({
      src: info.thumburl,
      width: info.thumbwidth,
      height: info.thumbheight,
      alt: (stripHtml(meta.ImageDescription?.value) || title).slice(0, 140),
      credit: stripHtml(meta.Artist?.value).slice(0, 60) || "Auteur inconnu",
      license,
      pageUrl: info.descriptionurl,
    });
    if (out.length >= limit) break;
  }
  return out;
}
