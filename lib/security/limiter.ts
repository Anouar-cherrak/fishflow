// Limites de requêtes branchées sur la base Supabase (tables rate_windows et auth_failures, script supabase/securite-2026-10.sql).
// Les compteurs sont dans la base (pas en mémoire) : ils tiennent même avec plusieurs serveurs Vercel en même temps.
// Si le script SQL n'est pas encore installé, rien n'est bloqué (le site continue de marcher) et une alerte apparaît dans les journaux.

import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "../supabase/admin";
import {
  checkRules,
  currentLock,
  failure,
  success,
  tooManyMessage,
  type LimiterStore,
  type LockKey,
  type Rule,
} from "./limiter-core";

let warned = false;
function missing(e: { message?: string } | null): null {
  if (!warned) {
    warned = true;
    console.error("Limites de sécurité inactives (script supabase/securite-2026-10.sql à installer) :", e?.message ?? "inconnu");
  }
  return null;
}

const store: LimiterStore = {
  async hit(key, limit, windowSeconds) {
    const { data, error } = await createAdminClient().rpc("rate_window_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error || typeof data !== "number") return missing(error);
    return data;
  },
  async lockSeconds(key) {
    const { data, error } = await createAdminClient().rpc("auth_lock_seconds", { p_key: key });
    if (error || typeof data !== "number") return missing(error);
    return data;
  },
  async registerFailure(key, threshold) {
    const { data, error } = await createAdminClient().rpc("auth_register_failure", { p_key: key, p_threshold: threshold });
    if (error || typeof data !== "number") return missing(error);
    return data;
  },
  async clearFailures(key) {
    await createAdminClient().rpc("auth_clear_failures", { p_key: key });
  },
};

// Adresse IP de la personne. Sur Vercel, « x-real-ip » est posée par Vercel lui-même (impossible à falsifier depuis le navigateur).
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "local"
  );
}

// Empreinte : l'email et l'adresse IP ne sont jamais stockés en clair dans les compteurs.
export function fingerprint(kind: string, value: string): string {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY || "fishflow";
  return `${kind}:${createHmac("sha256", pepper).update(value.trim().toLowerCase()).digest("hex").slice(0, 32)}`;
}

export const limiter = {
  check: (rules: Rule[]) => checkRules(store, rules),
  lock: (keys: LockKey[]) => currentLock(store, keys),
  fail: (keys: LockKey[]) => failure(store, keys),
  ok: (keys: LockKey[]) => success(store, keys),
};

// Réponse « trop de demandes » : code 429, message en français simple et temps d'attente (aussi dans l'en-tête Retry-After).
export function tooMany(seconds: number, message?: string) {
  return NextResponse.json(
    { error: message ?? tooManyMessage(seconds), retryAfter: seconds },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

// Limite simple par adresse IP pour une route : renvoie une réponse 429 si c'est trop, sinon null.
export async function limitByIp(req: Request, name: string, limit: number, windowSeconds = 60) {
  const wait = await limiter.check([{ key: `${name}:${fingerprint("ip", clientIp(req))}`, limit, windowSeconds }]);
  return wait > 0 ? tooMany(wait) : null;
}
