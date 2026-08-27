import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("fiches")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}