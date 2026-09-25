import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("id");

  if (!userId) {
    return new Response("Lien invalide.", { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("profiles").update({ email_opt_out: true }).eq("id", userId);

  return new Response(
    `<!DOCTYPE html>
    <html lang="fr">
      <head><meta charset="utf-8" /><title>Désinscription — FishFlow</title></head>
      <body style="font-family: Arial, sans-serif; text-align:center; padding:60px 20px; color:#111111;">
        <h2 style="margin-bottom:12px;">Tu es désinscrit des emails FishFlow</h2>
        <p style="color:#666666;">Tu ne recevras plus d'emails de relance ou d'annonce. Les emails essentiels liés à ton compte (confirmation, sécurité) continueront d'être envoyés.</p>
        <a href="https://fishflow.fr" style="display:inline-block;margin-top:24px;color:#22C55E;font-weight:600;text-decoration:none;">Retour à FishFlow</a>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
