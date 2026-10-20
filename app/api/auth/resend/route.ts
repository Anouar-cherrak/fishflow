import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { clientIp, limiter, tooMany } from "@/lib/security/limiter";
import { mailRules } from "@/lib/security/auth-limits";
import { waitText } from "@/lib/security/limiter-core";
import { asEmail, readJson } from "@/lib/security/validate";

export const runtime = "nodejs";

// Nouveau code d'inscription : 1 par minute et 5 par heure pour une adresse, 20 par heure pour une adresse IP.
export async function POST(req: Request) {
  const body = await readJson(req);
  const email = asEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Cette adresse email n'est pas valide. Vérifie-la." }, { status: 400 });

  const wait = await limiter.check(mailRules(req, "resend", email));
  if (wait) return tooMany(wait, `Tu as déjà demandé un code. Attends ${waitText(wait)}, puis réessaie (regarde aussi dans tes spams).`);

  const supabase = await createAuthClient(clientIp(req));
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error?.status === 429) return tooMany(60);
  if (error) return NextResponse.json({ error: "Impossible de renvoyer le code pour l'instant. Réessaie dans une minute." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
