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
  const [folders, exams, reviews, log, profile, events, usage, relances] = await Promise.all([
    admin.from("folders").select("name, color, created_at").eq("user_id", user.id),
    admin.from("exams").select("title, exam_date, created_at").eq("user_id", user.id),
    admin.from("card_reviews").select("card_index, box, due_at, last_reviewed_at, times_correct, times_wrong").eq("user_id", user.id),
    admin.from("review_log").select("reviewed_at, correct").eq("user_id", user.id),
    admin.from("profiles").select("is_pro, created_at, email_opt_out, dark_mode, stripe_customer_id").eq("id", user.id).maybeSingle(),
    // Mesures d'usage, compteurs de fiches et e-mails de rappel envoyés : eux aussi font partie de tes données.
    admin.from("events").select("*").eq("user_id", user.id),
    admin.from("usage").select("*").eq("user_id", user.id),
    admin.from("email_relances").select("*").eq("user_id", user.id),
  ]);
  const { stripe_customer_id, ...compte } = profile.data ?? {};

  const exportData = {
    email: user.email,
    exported_at: new Date().toISOString(),
    compte: profile.data ? { ...compte, client_stripe: Boolean(stripe_customer_id) } : null,
    fiches: fiches || [],
    dossiers: folders.data ?? [],
    examens: exams.data ?? [],
    revisions: reviews.data ?? [],
    journal_revisions: log.data ?? [],
    mesures_usage: events.data ?? [],
    compteurs: usage.data ?? [],
    emails_de_rappel: relances.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fishflow-export-${user.id}.json"`,
    },
  });
}
