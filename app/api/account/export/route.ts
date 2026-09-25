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
  const { data: fiches } = await admin
    .from("fiches")
    .select("title, data, created_at, best_score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const exportData = {
    email: user.email,
    exported_at: new Date().toISOString(),
    fiches: fiches || [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fishflow-export-${user.id}.json"`,
    },
  });
}
