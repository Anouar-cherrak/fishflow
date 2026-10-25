import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export const runtime = "nodejs";

// Retour de Google (via Supabase) : on échange le code contre la session, puis on renvoie vers une page de FishFlow.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const fail = (raison: string) => NextResponse.redirect(new URL(`/login?erreur=${raison}`, origin));

  // La personne a cliqué sur « Annuler » chez Google.
  if (searchParams.get("error")) return fail(searchParams.get("error") === "access_denied" ? "google-annule" : "google");

  const code = searchParams.get("code");
  if (!code) return fail("google");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // Adresse non vérifiée par Google : on refuse (Supabase ne relie déjà les comptes que sur une adresse vérifiée).
  if (error || !data.user?.email_confirmed_at) {
    if (!error) await supabase.auth.signOut();
    return fail("google");
  }

  const target = new URL(safeNext(searchParams.get("next")), origin);
  return NextResponse.redirect(target.origin === origin ? target : new URL("/generer", origin));
}
