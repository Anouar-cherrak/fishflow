// Mesure du parcours (voir app/api/track/route.ts). Ne casse jamais la page.
const KEY = "ff-src";

// L'origine du lien (ex. fishflow.fr/?s=tiktok) est gardée le temps de la visite pour l'associer à l'inscription.
export function rememberSource(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("s") || params.get("utm_source") || params.get("ref");
    if (fromUrl) sessionStorage.setItem(KEY, fromUrl.toLowerCase().slice(0, 24));
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function track(name: "visit" | "signup" | "first_fiche" | "pricing_view") {
  try {
    const source = rememberSource();
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, source }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
