import { createAdminClient } from "./supabase/admin";

// Pour changer le quota gratuit plus tard, modifie uniquement cette ligne.
export const FREE_MONTHLY_LIMIT = 3;

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUsage(userId: string) {
  const supabase = createAdminClient();
  const month = currentMonthKey();

  const { data } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  const used = data?.count ?? 0;
  return {
    used,
    limit: FREE_MONTHLY_LIMIT,
    remaining: Math.max(0, FREE_MONTHLY_LIMIT - used),
    allowed: used < FREE_MONTHLY_LIMIT,
  };
}

// Réserve UNE utilisation, de façon atomique (deux demandes en même temps ne passent pas toutes les deux).
// Si la fonction SQL n'est pas encore installée, on retombe sur l'ancienne méthode, qui marche mais moins strictement.
export async function reserveUsage(userId: string, key: string, limit: number): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_usage", { p_user: userId, p_key: key, p_limit: limit });
  if (!error && typeof data === "boolean") return data;

  const { data: row } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", key)
    .maybeSingle();
  const used = row?.count ?? 0;
  if (used >= limit) return false;
  if (row) {
    await supabase.from("usage").update({ count: used + 1 }).eq("user_id", userId).eq("month", key);
  } else {
    await supabase.from("usage").insert({ user_id: userId, month: key, count: 1 });
  }
  return true;
}

// Rend l'utilisation réservée quand la génération a échoué : on ne fait jamais payer un échec.
export async function refundUsage(userId: string, key: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refund_usage", { p_user: userId, p_key: key });
  if (!error) return;

  const { data: row } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", key)
    .maybeSingle();
  if (row && row.count > 0) {
    await supabase.from("usage").update({ count: row.count - 1 }).eq("user_id", userId).eq("month", key);
  }
}

export function monthKey() {
  return currentMonthKey();
}

export async function isProUser(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();

  return data?.is_pro ?? false;
}