import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, emailLayout } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json();
  const { subject, message } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: "subject et message sont requis." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users || [];

  let envoyes = 0;
  const erreurs: string[] = [];

  for (const user of users) {
    if (!user.email) continue;
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const result = await resend.emails.send({
        from: "FishFlow <noreply@fishflow.fr>",
        to: user.email,
        subject,
        html: emailLayout(`<p style="color:#333333;font-size:15px;">${message}</p>`),
      });
      if (result.error) {
        erreurs.push(JSON.stringify(result.error));
      } else {
        envoyes++;
      }
    } catch (err: any) {
      erreurs.push(err?.message || JSON.stringify(err));
    }
  }

  return NextResponse.json({ envoyes, totalUsers: users.length, erreurs: erreurs.slice(0, 3) });
}