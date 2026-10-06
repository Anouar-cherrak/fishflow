// Images libres de droits depuis Wikimedia Commons (licences Creative Commons ou domaine public).
// Chaque image garde son auteur, sa licence et un lien vers sa page, comme la licence l'exige.

const API_URL = "https://commons.wikimedia.org/w/api.php";
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
  index?: number;
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

function stripHtml(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export async function searchCommonsImages(query: string, limit = 4): Promise<CommonsImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "800",
  });

  const res = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { query?: { pages?: ApiPage[] } };
  const pages = (json.query?.pages ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const out: CommonsImage[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.thumbwidth || !info.thumbheight || !info.descriptionurl) continue;
    if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) continue;
    if ((info.width ?? 0) < MIN_WIDTH) continue;

    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value);
    // Sans licence claire, on n'affiche pas l'image.
    if (!license) continue;

    const description = stripHtml(meta.ImageDescription?.value);
    const title = (page.title ?? "").replace(/^Fichier:|^File:/, "").replace(/\.[a-z]+$/i, "");
    out.push({
      src: info.thumburl,
      width: info.thumbwidth,
      height: info.thumbheight,
      alt: (description || title).slice(0, 140),
      credit: stripHtml(meta.Artist?.value).slice(0, 60) || "Auteur inconnu",
      license,
      pageUrl: info.descriptionurl,
    });
    if (out.length >= limit) break;
  }
  return out;
}
