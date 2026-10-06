import { createAdminClient } from "./supabase/admin";

// « Apprends n'importe quoi » est une fonctionnalité Pro.
// Les comptes gratuits ont UN essai en tout. Les Pro ont une limite par jour contre les abus.
// Les compteurs utilisent la table « usage » existante, avec une clé dans la colonne « month ».
export const FREE_TRIAL_LIMIT = 1;
export const PRO_DAILY_LIMIT = 20;

const TRIAL_KEY = "apprendre-essai";

function dailyKey() {
  return `apprendre-${new Date().toISOString().slice(0, 10)}`;
}

export async function getApprendreQuota(userId: string, pro: boolean) {
  const key = pro ? dailyKey() : TRIAL_KEY;
  const limit = pro ? PRO_DAILY_LIMIT : FREE_TRIAL_LIMIT;

  const { data } = await createAdminClient()
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", key)
    .maybeSingle();

  const used = data?.count ?? 0;
  return { key, limit, used, allowed: used < limit };
}

export async function bumpApprendreUsage(userId: string, key: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", key)
    .maybeSingle();

  if (data) {
    await supabase.from("usage").update({ count: data.count + 1 }).eq("user_id", userId).eq("month", key);
  } else {
    await supabase.from("usage").insert({ user_id: userId, month: key, count: 1 });
  }
}
