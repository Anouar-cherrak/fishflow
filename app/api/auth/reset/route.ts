import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { clientIp, limiter, tooMany } from "@/lib/security/limiter";
import { mailRules } from "@/lib/security/auth-limits";
import { asEmail, readJson } from "@/lib/security/validate";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

// Mot de passe oublié. La réponse est la même que le compte existe ou non (on ne révèle pas qui est inscrit).
export async function POST(req: Request) {
  const body = await readJson(req);
  const email = asEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Cette adresse email n'est pas valide. Vérifie-la." }, { status: 400 });

  const wait = await limiter.check(mailRules(req, "reset", email));
  if (wait) return tooMany(wait);

  // Adresse de retour choisie dans une liste fixe (lib/site-url.ts), jamais tirée de la demande ; Supabase la vérifie aussi.
  const supabase = await createAuthClient(clientIp(req));
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl(req)}/reset-password/confirm` });
  if (error?.status === 429) return tooMany(60);
  if (error) console.error("Mot de passe oublié : envoi refusé", error.status, error.code);
  return NextResponse.json({ ok: true });
}
