// Limites de requêtes et blocages progressifs, sans dépendre de la base : le stockage est fourni de l'extérieur.
// Utilisé par lib/security/limiter.ts (vraie base Supabase) et par le test tests/securite.test.mjs (stockage en mémoire).

export interface LimiterStore {
  // Compte une demande dans une fenêtre de temps. Renvoie 0 si c'est autorisé, sinon les secondes à attendre. null = stockage absent.
  hit(key: string, limit: number, windowSeconds: number): Promise<number | null>;
  // Secondes de blocage restantes pour cette clé (0 = pas bloqué). null = stockage absent.
  lockSeconds(key: string): Promise<number | null>;
  // Ajoute une erreur ; renvoie la durée du blocage posé (0 = pas encore bloqué). null = stockage absent.
  registerFailure(key: string, threshold: number): Promise<number | null>;
  clearFailures(key: string): Promise<void>;
}

// Mode strict (connexion, codes, e-mails) : si les compteurs ne répondent pas (base en panne, script SQL absent),
// on refuse pendant 1 minute au lieu de tout laisser passer. Les autres routes restent ouvertes pour que le site marche.
export type Mode = { strict?: boolean };
export const STORE_DOWN_WAIT = 60;
const down = (w: number | null, mode?: Mode) => (w === null && mode?.strict ? STORE_DOWN_WAIT : w);

// Une règle = « au plus `limit` demandes par `windowSeconds` ».
export type Rule = { key: string; limit: number; windowSeconds: number };

// Vérifie plusieurs règles (ex. par email ET par IP). Renvoie le plus long temps d'attente, 0 si tout passe.
export async function checkRules(store: LimiterStore, rules: Rule[], mode?: Mode): Promise<number> {
  let wait = 0;
  for (const r of rules) {
    const w = down(await store.hit(r.key, r.limit, r.windowSeconds), mode);
    if (w && w > wait) wait = w;
  }
  return wait;
}

// Blocage progressif : après `threshold` erreurs, 1 min, puis 5 min, puis 15 min (logique dans la fonction SQL).
// « account » : clé liée au compte (effacée quand la connexion réussit) ; les clés d'adresse IP, elles, restent.
export type LockKey = { key: string; threshold: number; account?: boolean };

export async function currentLock(store: LimiterStore, keys: LockKey[], mode?: Mode): Promise<number> {
  let wait = 0;
  for (const k of keys) {
    const w = down(await store.lockSeconds(k.key), mode);
    if (w && w > wait) wait = w;
  }
  return wait;
}

export async function failure(store: LimiterStore, keys: LockKey[], mode?: Mode): Promise<number> {
  let wait = 0;
  for (const k of keys) {
    const w = down(await store.registerFailure(k.key, k.threshold), mode);
    if (w && w > wait) wait = w;
  }
  return wait;
}

export async function success(store: LimiterStore, keys: LockKey[]): Promise<void> {
  for (const k of keys) if (k.account) await store.clearFailures(k.key);
}

// « 1 minute », « 5 minutes », « 40 secondes » : le temps d'attente en français simple.
export function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const min = Math.ceil(seconds / 60);
  return `${min} minute${min > 1 ? "s" : ""}`;
}

export function tooManyMessage(seconds: number): string {
  return `Trop d'essais. Attends ${waitText(seconds)}, puis réessaie.`;
}

// Durées de blocage, identiques à la fonction SQL auth_register_failure (servent au stockage en mémoire des tests).
export function lockDuration(failures: number, threshold: number): number {
  if (failures < threshold) return 0;
  if (failures === threshold) return 60;
  if (failures === threshold + 1) return 300;
  return 900;
}

// Seuils de blocage de la connexion et des codes : 3 erreurs pour un même compte, 10 pour une même adresse IP
// (plus large : toute une classe ou tout un wifi d'école partage souvent la même adresse).
export const AUTH_LOCK = { perAccount: 3, perIp: 10, perAccountAlone: 10 };

// Clés de blocage, à partir des empreintes de l'email et de l'adresse IP.
// Connexion : 3 erreurs pour la paire « ce compte depuis cette adresse », 10 pour le compte depuis n'importe où
// (un inconnu ne peut plus bloquer le compte d'un élève avec 3 faux mots de passe), 10 pour l'adresse IP.
// Code d'inscription : 3 erreurs pour le compte (personne d'autre n'a de raison de taper ce code), 10 pour l'adresse.
export function authLockKeys(action: "login" | "verify", email: string, ip: string): LockKey[] {
  const ipKey = { key: `${action}:${ip}`, threshold: AUTH_LOCK.perIp };
  if (action === "verify") return [{ key: `verify:${email}`, threshold: AUTH_LOCK.perAccount, account: true }, ipKey];
  return [
    { key: `login:${email}:${ip}`, threshold: AUTH_LOCK.perAccount, account: true },
    { key: `login:${email}`, threshold: AUTH_LOCK.perAccountAlone, account: true },
    ipKey,
  ];
}
