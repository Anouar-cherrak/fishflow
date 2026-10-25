// Page où renvoyer la personne après la connexion Google : seulement un chemin de FishFlow (« /… »).
// « //site.com », « /\site.com » ou « https://… » ouvriraient un autre site (redirection ouverte) : refusés.
export function safeNext(next: string | null | undefined, fallback = "/generer"): string {
  return typeof next === "string" && /^\/(?![/\\])[^\\\s]*$/.test(next) ? next : fallback;
}
