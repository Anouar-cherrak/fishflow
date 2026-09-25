import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("dark_mode, email_opt_out")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    darkMode: data?.dark_mode ?? false,
    emailOptOut: data?.email_opt_out ?? false,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json();

  // Whitelist strict des colonnes modifiables depuis ce endpoint — jamais is_pro, stripe_customer_id, etc.
  const update: Record<string, boolean> = {};
  if (typeof body.darkMode === "boolean") update.dark_mode = body.darkMode;
  if (typeof body.emailOptOut === "boolean") update.email_opt_out = body.emailOptOut;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("profiles").update(update).eq("id", user.id);

  return NextResponse.json({ success: true });
}
