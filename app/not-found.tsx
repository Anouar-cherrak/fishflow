import Link from "next/link";
import { AppShell } from "@/components/AppShell";

// Page affichée quand un lien n'existe pas (ou plus : par exemple une fiche dont le partage a été arrêté).
export default function NotFound() {
  return (
    <AppShell size="form" publicPage>
      <div className="py-10 sm:py-16">
        <h1 className="ff-title mb-3">Cette page n&apos;existe pas.</h1>
        <p className="ff-muted ff-measure mb-8">
          Le lien est peut-être faux, ou la personne a arrêté de partager cette fiche.
        </p>
        <Link href="/" className="ff-primary">Retour à l&apos;accueil</Link>
      </div>
    </AppShell>
  );
}
