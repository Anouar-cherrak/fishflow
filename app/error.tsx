"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";

// Page affichée quand une page plante (réseau coupé, serveur qui ne répond pas…) : un seul bouton, réessayer.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell size="form" publicPage>
      <div className="py-10 sm:py-16">
        <h1 className="ff-title mb-3">Oups, la page n&apos;a pas pu s&apos;afficher.</h1>
        <p className="ff-muted ff-measure mb-8">Vérifie ta connexion à Internet, puis réessaie. Tes fiches ne sont pas perdues.</p>
        <button type="button" onClick={() => retry()} className="ff-primary">Réessayer</button>
        <p className="mt-6">
          <Link href="/" className="ff-link inline-flex items-center min-h-[44px]">Retour à l&apos;accueil</Link>
        </p>
      </div>
    </AppShell>
  );
}
