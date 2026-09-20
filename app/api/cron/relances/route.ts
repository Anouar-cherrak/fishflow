import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, emailLayout } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users || [];

  let mensuelEnvoyes = 0;
  let inactiviteEnvoyes = 0;

  for (const user of users) {
    if (!user.email) continue;

    const { data: dernieresFiches } = await admin
      .from("fiches")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const derniereActivite = dernieresFiches?.[0]?.created_at
      ? new Date(dernieresFiches[0].created_at)
      : new Date(user.created_at);

    const joursInactif = Math.floor((now.getTime() - derniereActivite.getTime()) / (1000 * 60 * 60 * 24));

    const { data: dejaMensuel } = await admin
      .from("email_relances")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", `mensuel-${currentMonthKey}`)
      .limit(1);

    if (!dejaMensuel?.length) {
      try {
        await resend.emails.send({
          from: "FishFlow <noreply@fishflow.fr>",
          to: user.email,
          subject: "Tes fiches gratuites sont renouvelées ce mois-ci",
          html: emailLayout(
            `<p style="color:#333333;font-size:15px;">Un nouveau mois commence, et tes fiches gratuites sont de retour ! Transforme un nouveau cours en fiche de révision en quelques secondes.</p>`
          ),
        });
        await admin.from("email_relances").insert({ user_id: user.id, type: `mensuel-${currentMonthKey}` });
        mensuelEnvoyes++;
      } catch (err) {
        console.error("Erreur envoi email mensuel:", err);
      }
    }

    if (joursInactif >= 7) {
      const seuil = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: dejaInactivite } = await admin
        .from("email_relances")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "inactivite")
        .gte("sent_at", seuil)
        .limit(1);

      if (!dejaInactivite?.length) {
        try {
          await resend.emails.send({
            from: "FishFlow <noreply@fishflow.fr>",
            to: user.email,
            subject: "Ça fait un moment... reviens réviser avec FishFlow",
            html: emailLayout(
              `<p style="color:#333333;font-size:15px;">Tu n'as pas généré de fiche depuis un moment. Un cours à réviser ? FishFlow s'en occupe en quelques secondes.</p>`
            ),
          });
          await admin.from("email_relances").insert({ user_id: user.id, type: "inactivite" });
          inactiviteEnvoyes++;
        } catch (err) {
          console.error("Erreur envoi email inactivité:", err);
        }
      }
    }
  }

  return NextResponse.json({ mensuelEnvoyes, inactiviteEnvoyes, totalUsers: users.length });
}