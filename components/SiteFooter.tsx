import Link from "next/link";
import { CookieChoice } from "@/components/CookieChoice";

// Pied de page commun des pages publiques (accueil, tarifs, connexion, pages légales…).
export function SiteFooter() {
  return (
    <footer className="ff-footer">
      <div className="ff-footer-in">
        <p>© {new Date().getFullYear()} FishFlow, projet créé par un étudiant en MMI.</p>
        <nav aria-label="Liens du site">
          <Link href="/pricing">Tarifs</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">CGU</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <CookieChoice />
        </nav>
      </div>
    </footer>
  );
}
