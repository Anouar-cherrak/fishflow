import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, emailLayout, unsubscribeHeaders } from "@/lib/resend";
import { isCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Rappel du soir : « tu as N cartes à revoir ». Un mail au maximum tous les 3 jours,
// jamais si la personne a déjà révisé aujourd'hui, jamais si elle s'est désinscrite.
const MIN_CARTES = 3;
const PAUSE_JOURS = 3;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // Interrupteur : les mails automatiques sont en pause tant que EMAILS_AUTO n'est pas "oui" (variable Vercel).
  // Raison : trop de relances ignorées ou signalées en spam abîment la réputation du domaine, et les codes d'inscription en souffrent.
  if (process.env.EMAILS_AUTO !== "oui") {
    return NextResponse.json({ pause: true, envoyes: 0 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const debutJour = new Date(now);
  debutJour.setUTCHours(0, 0, 0, 0);
  const seuilPause = new Date(now.getTime() - PAUSE_JOURS * 24 * 60 * 60 * 1000).toISOString();

  // 1. Cartes à revoir, comptées par personne.
  const { data: dues } = await admin.from("card_reviews").select("fiche_id").lte("due_at", now.toISOString()).limit(20000);
  const parFiche = new Map<string, number>();
  for (const r of dues ?? []) parFiche.set(r.fiche_id, (parFiche.get(r.fiche_id) ?? 0) + 1);
  if (parFiche.size === 0) return NextResponse.json({ envoyes: 0 });

  const { data: fiches } = await admin.from("fiches").select("id, user_id").in("id", Array.from(parFiche.keys()));
  const parUser = new Map<string, number>();
  for (const f of fiches ?? []) parUser.set(f.user_id, (parUser.get(f.user_id) ?? 0) + (parFiche.get(f.id) ?? 0));

  const candidats = Array.from(parUser.entries()).filter(([, n]) => n >= MIN_CARTES);
  if (candidats.length === 0) return NextResponse.json({ envoyes: 0 });

  // 2. Exclusions : désinscrits, déjà révisé aujourd'hui, déjà relancé récemment.
  const { data: optOut } = await admin.from("profiles").select("id").eq("email_opt_out", true);
  const exclus = new Set((optOut ?? []).map((r) => r.id));

  const { data: faitAujourdhui } = await admin.from("review_log").select("user_id").gte("reviewed_at", debutJour.toISOString());
  for (const r of faitAujourdhui ?? []) exclus.add(r.user_id);

  const { data: recents } = await admin.from("email_relances").select("user_id").like("type", "rappel-%").gte("sent_at", seuilPause);
  for (const r of recents ?? []) exclus.add(r.user_id);

  let envoyes = 0;
  for (const [userId, n] of candidats) {
    if (exclus.has(userId)) continue;
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (!email) continue;
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const result = await sendMail({
        from: "FishFlow <noreply@fishflow.fr>",
        to: email,
        subject: `${n} carte${n > 1 ? "s" : ""} à revoir aujourd'hui`,
        html: emailLayout(
          `<p style="color:#333333;font-size:15px;">Tu as <strong>${n} carte${n > 1 ? "s" : ""}</strong> à revoir aujourd'hui. Ça prend quelques minutes, et c'est ce qui fait que ça reste en tête.</p>`,
          "Revoir mes cartes",
          "https://fishflow.fr/aujourdhui",
          `https://fishflow.fr/api/unsubscribe?id=${userId}`
        ),
        headers: unsubscribeHeaders(userId),
      });
      if (!result.error) {
        await admin.from("email_relances").insert({ user_id: userId, type: `rappel-${now.toISOString().slice(0, 10)}` });
        envoyes++;
      }
    } catch (err) {
      console.error("Erreur envoi rappel:", err);
    }
  }
  return NextResponse.json({ envoyes });
}
