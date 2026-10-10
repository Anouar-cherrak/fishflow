import { timingSafeEqual } from "crypto";

// Vérifie le mot de passe des routes automatiques (crons, annonce).
// Refuse tout si CRON_SECRET n'est pas réglé (sinon « Bearer undefined » passerait),
// et compare sans laisser deviner le secret au temps de réponse.
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
