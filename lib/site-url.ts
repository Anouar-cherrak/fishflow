// Adresse du site pour les retours depuis Stripe : jamais prise telle quelle dans la demande (on ne renvoie pas vers un autre site).
const ALLOWED = new Set(["https://fishflow.fr", "https://www.fishflow.fr", "http://localhost:3000"]);

export function siteUrl(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  return ALLOWED.has(origin) ? origin : "https://fishflow.fr";
}
