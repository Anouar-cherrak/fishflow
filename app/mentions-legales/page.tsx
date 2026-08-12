import Link from "next/link";
import { Logo, Wordmark } from "@/components/Logo";

export default function MentionsLegales() {
  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={20} />
          <Wordmark className="text-sm" />
        </div>

        <Link href="/" className="text-sm text-white/50 hover:text-white mb-6 inline-block transition">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-2xl font-semibold mb-6">Mentions légales</h1>

        <div className="space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="font-semibold text-white mb-2">Éditeur du site</h2>
            <p>
              Le site FishFlow (ficheflow.fr) est édité par :<br />
              CHERRAK Anouar<br />
              Statut : Entrepreneur individuel (micro-entreprise)<br />
              Numéro SIRET : 943 781 740 00015<br />
              Adresse : 261 rue de Bâle, 68100 Mulhouse, France<br />
              Email de contact : anouarcherrak68100@gmail.com
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Directeur de la publication</h2>
            <p>CHERRAK Anouar</p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Hébergement</h2>
            <p>
              Le site est hébergé par :<br />
              Vercel Inc.<br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              vercel.com
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, structure, design, logo) est la propriété de
              CHERRAK Anouar, sauf mention contraire. Toute reproduction non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">Contact</h2>
            <p>
              Pour toute question relative à ces mentions légales, tu peux nous contacter à l'adresse :{" "}
              anouarcherrak68100@gmail.com
            </p>
          </section>

          <p className="text-xs text-white/25 pt-4 border-t border-white/10">
            Dernière mise à jour : 11/08/2026
          </p>
        </div>
      </div>
    </main>
  );
}