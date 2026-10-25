// Toutes les limites de la connexion, de l'inscription et des emails, au même endroit.
import { clientIp, fingerprint } from "./limiter";
import { authLockKeys, type LockKey, type Rule } from "./limiter-core";

const HOUR = 3600;

export function keysFor(req: Request, action: "login" | "verify", email: string): LockKey[] {
  return authLockKeys(action, fingerprint("email", email), fingerprint("ip", clientIp(req)));
}

// Connexion, codes et e-mails : si les compteurs sont en panne, on refuse plutôt que de tout laisser passer.
export const STRICT = { strict: true } as const;

// Nombre d'essais (bons ou mauvais) : contre les scripts qui tapent en boucle.
export function attemptRules(req: Request, action: "login" | "verify"): Rule[] {
  return [{ key: `${action}-essais:${fingerprint("ip", clientIp(req))}`, limit: 20, windowSeconds: 60 }];
}

// Emails envoyés (inscription, nouveau code, mot de passe oublié) : limites strictes, pour ne pas servir à envoyer du spam
// ni épuiser le quota d'envoi. Le plafond global protège le quota même si un script change d'adresse IP sans arrêt.
export function mailRules(req: Request, action: "signup" | "resend" | "reset", email: string): Rule[] {
  const e = fingerprint("email", email);
  const ip = fingerprint("ip", clientIp(req));
  const perAction: Record<typeof action, Rule[]> = {
    signup: [
      { key: `signup:${e}`, limit: 3, windowSeconds: HOUR },
      { key: `signup:${ip}`, limit: 20, windowSeconds: HOUR },
    ],
    resend: [
      { key: `resend-1min:${e}`, limit: 1, windowSeconds: 60 },
      { key: `resend:${e}`, limit: 5, windowSeconds: HOUR },
      { key: `resend:${ip}`, limit: 20, windowSeconds: HOUR },
    ],
    reset: [
      { key: `reset-1min:${e}`, limit: 1, windowSeconds: 60 },
      { key: `reset:${e}`, limit: 3, windowSeconds: HOUR },
      { key: `reset:${ip}`, limit: 10, windowSeconds: HOUR },
    ],
  };
  return [...perAction[action], { key: "emails-site", limit: 100, windowSeconds: HOUR }];
}
