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

export async function incrementUsage(userId: string) {
  const supabase = createAdminClient();
  const month = currentMonthKey();

  const { data } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (data) {
    await supabase
      .from("usage")
      .update({ count: data.count + 1 })
      .eq("user_id", userId)
      .eq("month", month);
  } else {
    await supabase.from("usage").insert({ user_id: userId, month, count: 1 });
  }
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