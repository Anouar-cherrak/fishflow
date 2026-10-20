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

  // RGPD : toutes les données liées au compte, pas seulement les fiches.
  const [folders, exams, reviews, log, profile] = await Promise.all([
    admin.from("folders").select("name, color, created_at").eq("user_id", user.id),
    admin.from("exams").select("title, exam_date, created_at").eq("user_id", user.id),
    admin.from("card_reviews").select("card_index, box, due_at, last_reviewed_at, times_correct, times_wrong").eq("user_id", user.id),
    admin.from("review_log").select("reviewed_at, correct").eq("user_id", user.id),
    admin.from("profiles").select("is_pro, created_at, email_opt_out, dark_mode").eq("id", user.id).maybeSingle(),
  ]);

  const exportData = {
    email: user.email,
    exported_at: new Date().toISOString(),
    compte: profile.data ?? null,
    fiches: fiches || [],
    dossiers: folders.data ?? [],
    examens: exams.data ?? [],
    revisions: reviews.data ?? [],
    journal_revisions: log.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fishflow-export-${user.id}.json"`,
    },
  });
}
