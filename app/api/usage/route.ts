import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsage, isProUser } from "@/lib/usage";
import { getApprendreQuota } from "@/lib/apprendre-quota";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const pro = await isProUser(user.id);
  // Questions « Apprendre » encore possibles (essai gratuit, ou limite du jour pour Pro).
  const apprendre = await getApprendreQuota(user.id, pro);
  const apprendreLeft = Math.max(0, apprendre.limit - apprendre.used);

  if (pro) {
    return NextResponse.json({ isPro: true, used: 0, limit: null, remaining: null, apprendreLeft });
  }

  const usage = await getUsage(user.id);
  return NextResponse.json({ isPro: false, ...usage, apprendreLeft });
}
