import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUnsubscribe } from "@/lib/unsubscribe";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function optOut(req: Request): Promise<boolean> {
  const params = new URL(req.url).searchParams;
  const userId = params.get("id");
  // Le lien doit porter la signature de FishFlow : on ne peut pas désinscrire quelqu'un d'autre en devinant son identifiant.
  if (!userId || !UUID.test(userId) || !isValidUnsubscribe(userId, params.get("t"))) return false;
  const admin = createAdminClient();
  await admin.from("profiles").update({ email_opt_out: true }).eq("id", userId);
  return true;
}

export async function GET(req: Request) {
  if (!(await optOut(req))) {
    return new Response("Ce lien n'est pas valable. Pour ne plus recevoir d'e-mails, va dans FishFlow, puis Paramètres.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(
    `<!DOCTYPE html>
    <html lang="fr">
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Désinscription — FishFlow</title></head>
      <body style="margin:0;min-height:100vh;min-height:100svh;font-family: Arial, sans-serif; text-align:center; padding:60px 20px; color:#052036; background:linear-gradient(180deg,#E4F5FE,#9AD3EF);box-sizing:border-box;">
        <div style="max-width:460px;margin:0 auto;background:#FBFEFF;border-radius:28px 28px 20px 20px;padding:32px 24px;box-shadow:0 24px 48px -30px rgba(5,32,54,.45);">
          <h1 style="font-size:22px;margin:0 0 12px;">Tu es désinscrit des emails FishFlow</h1>
          <p style="color:#2D506B;margin:0;line-height:1.55;">Tu ne recevras plus d'emails de relance ou d'annonce. Les emails essentiels liés à ton compte (confirmation, sécurité) continueront d'être envoyés.</p>
          <a href="https://fishflow.fr" style="display:inline-block;margin-top:24px;background:#38BDF8;color:#052036;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:999px;">Retour à FishFlow</a>
        </div>
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
