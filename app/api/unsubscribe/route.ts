import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function optOut(req: Request): Promise<boolean> {
  const userId = new URL(req.url).searchParams.get("id");
  if (!userId || !UUID.test(userId)) return false;
  const admin = createAdminClient();
  await admin.from("profiles").update({ email_opt_out: true }).eq("id", userId);
  return true;
}

export async function GET(req: Request) {
  if (!(await optOut(req))) {
    return new Response("Lien invalide.", { status: 400 });
  }

  return new Response(
    `<!DOCTYPE html>
    <html lang="fr">
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Désinscription — FishFlow</title></head>
      <body style="font-family: Arial, sans-serif; text-align:center; padding:60px 20px; color:#111111;">
        <h1 style="font-size:22px;margin-bottom:12px;">Tu es désinscrit des emails FishFlow</h1>
        <p style="color:#555555;">Tu ne recevras plus d'emails de relance ou d'annonce. Les emails essentiels liés à ton compte (confirmation, sécurité) continueront d'être envoyés.</p>
        <a href="https://fishflow.fr" style="display:inline-block;margin-top:24px;color:#15803D;font-weight:600;text-decoration:none;">Retour à FishFlow</a>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// Désinscription « en un clic » : Gmail et Outlook envoient un POST sur ce lien (en-tête List-Unsubscribe-Post).
export async function POST(req: Request) {
  const ok = await optOut(req);
  return new Response(null, { status: ok ? 200 : 400 });
}
