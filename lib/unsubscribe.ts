import { createHmac, timingSafeEqual } from "node:crypto";

// Lien de désinscription signé : seul FishFlow peut le fabriquer. Avant, l'identifiant du compte suffisait,
// donc quelqu'un qui le connaissait pouvait désinscrire une autre personne.
function secret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function sign(userId: string) {
  return createHmac("sha256", secret()).update(`desinscription:${userId}`).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(userId: string) {
  return `https://fishflow.fr/api/unsubscribe?id=${userId}&t=${sign(userId)}`;
}

export function isValidUnsubscribe(userId: string, token: string | null): boolean {
  if (!secret() || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(sign(userId));
  return a.length === b.length && timingSafeEqual(a, b);
}
