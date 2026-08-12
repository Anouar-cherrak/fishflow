import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsage, isProUser } from "@/lib/usage";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const pro = await isProUser(user.id);
  if (pro) {
    return NextResponse.json({ isPro: true, used: 0, limit: null, remaining: null });
  }

  const usage = await getUsage(user.id);
  return NextResponse.json({ isPro: false, ...usage });
}