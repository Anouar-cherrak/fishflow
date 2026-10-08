import Link from "next/link";

// Page affichée quand un lien n'existe pas (ou plus : par exemple une fiche dont le partage a été arrêté).
export default function NotFound() {
  return (
    <main className="min-h-[100dvh] grid place-items-center px-5 text-center" style={{ background: "var(--ff-bg)", color: "var(--ff-fg)" }}>
      <div className="max-w-[420px]">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--ff-accent)" }}>Page introuvable</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Ce lien ne mène nulle part.</h1>
        <p className="mb-7" style={{ opacity: 0.65 }}>
          La page n&apos;existe pas, ou la personne a arrêté de partager cette fiche.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="ff-primary ff-btn">Retour à l&apos;accueil</Link>
          <Link href="/generer" className="ff-secondary">Créer une fiche</Link>
        </div>
      </div>
    </main>
  );
}
