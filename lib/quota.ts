// Limites d'usage branchées sur la base Supabase (table « usage » + fonctions SQL atomiques).
// Toutes les valeurs sont dans lib/limits.ts ; la logique est dans lib/quota-core.ts.

import { createHash } from "node:crypto";
import { clientIp } from "./security/limiter";
import { createAdminClient } from "./supabase/admin";
import { reserve as reserveCore, recordCost as recordCostCore, status as statusCore, type CounterStore, type Kind } from "./quota-core";
import { refundUsage, reserveUsage } from "./usage";

const store: CounterStore = {
  // consume_usage verrouille le compteur pendant la mise à jour : deux demandes en même temps ne passent jamais toutes les deux.
  consume: (userId, key, limit) => reserveUsage(userId, key, limit),
  refund: (userId, key) => refundUsage(userId, key),
  async read(userId, keys) {
    const { data } = await createAdminClient().from("usage").select("month, count").eq("user_id", userId).in("month", keys);
    const out: Record<string, number> = {};
    for (const row of (data ?? []) as { month: string; count: number }[]) out[row.month] = row.count;
    return out;
  },
  async add(userId, key, amount) {
    const admin = createAdminClient();
    const { error } = await admin.rpc("add_usage", { p_user: userId, p_key: key, p_amount: amount });
    if (!error) return;
    // Fonction SQL pas encore installée : addition simple (suffisant pour un filet de sécurité sur le coût).
    const { data: row } = await admin.from("usage").select("count").eq("user_id", userId).eq("month", key).maybeSingle();
    if (row) await admin.from("usage").update({ count: row.count + amount }).eq("user_id", userId).eq("month", key);
    else await admin.from("usage").insert({ user_id: userId, month: key, count: amount });
  },
  async rate(key, limit) {
    const { data, error } = await createAdminClient().rpc("consume_rate", { p_key: key, p_limit: limit });
    if (error || typeof data !== "boolean") return null;
    return data;
  },
};

// L'adresse IP n'est jamais stockée telle quelle : seulement une empreinte, effacée au bout de quelques minutes.
function ipKey(req: Request): string | null {
  // Même lecture de l'adresse que le reste du site (lib/security/limiter.ts).
  const ip = clientIp(req);
  if (ip === "local") return null;
  return createHash("sha256").update(`fishflow:${ip}`).digest("hex").slice(0, 24);
}

export function reserveFor(req: Request, userId: string, pro: boolean, kind: Kind) {
  return reserveCore(store, { userId, pro, kind, ipKey: ipKey(req) });
}

export function recordCost(userId: string, usd: number) {
  return recordCostCore(store, userId, usd).catch((e) => console.error("Coût non enregistré :", e?.message || e));
}

export function quotaStatus(userId: string, pro: boolean) {
  return statusCore(store, userId, pro);
}
