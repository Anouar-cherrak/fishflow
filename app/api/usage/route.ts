import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProUser } from "@/lib/usage";
import { quotaStatus } from "@/lib/quota";

export const runtime = "nodejs";

// Ce qu'il reste à la personne (fiches, questions Apprendre, régénérations). Les limites sont dans lib/limits.ts.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const pro = await isProUser(user.id);
  const s = await quotaStatus(user.id, pro);

  return NextResponse.json({
    ...s,
    // Anciens champs, gardés pour les écrans qui les lisent encore.
    used: s.fichesMonthLimit - s.fichesLeftMonth,
    limit: s.fichesMonthLimit,
    remaining: pro ? null : s.fichesLeftMonth,
  });
}
