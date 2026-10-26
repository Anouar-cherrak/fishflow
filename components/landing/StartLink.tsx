"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";

// Le bouton principal de l'accueil. Déjà connecté : il ouvre l'appli. Sans cookie de session, Supabase n'est pas chargé.
export function StartLink({ event }: { event: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!hasAuthCookie()) return;
    import("@/lib/supabase/client")
      .then(({ createClient }) => createClient().auth.getSession())
      .then(({ data }) => setSignedIn(!!data.session))
      .catch(() => {});
  }, []);
  return signedIn ? (
    <Link href="/generer" className="ff-primary lp-cta">Ouvrir FishFlow</Link>
  ) : (
    <TrackedLink href="/generer" event={event} className="ff-primary lp-cta">Créer ma première fiche</TrackedLink>
  );
}
