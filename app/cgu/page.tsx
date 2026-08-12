import Link from "next/link";
import { Logo, Wordmark } from "@/components/Logo";

export default function CGU() {
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

        <h1 className="text-2xl font-semibold mb-6">Conditions générales d'utilisation</h1>

        <div className="space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="font-semibold text-white mb-2">1. Objet</h2>
            <p>
              Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation
              du site FishFlow (ficheflow.fr), service permettant de générer des supports de révision
              (résumés, fiches, flashcards, quiz) à partir de contenus fournis par l'utilisateur (texte,
              PDF, photo), à l'aide d'un traitement par intelligence artificielle.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">2. Accès au service</h2>
            <p>
              L'utilisation de FishFlow nécessite la création d'un compte. L'utilisateur s'engage à
              fournir des informations exactes lors de son inscription et à garder ses identifiants
              confidentiels.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">3. Offres et abonnement</h2>
            <p>
              FishFlow propose une offre gratuite limitée à un nombre défini de générations par mois,
              ainsi qu'une offre payante ("FishFlow Pro") donnant accès à des générations illimitées,
              facturée mensuellement via notre prestataire de paiement Stripe. Le tarif en vigueur est
              affiché sur la page Tarifs du site et peut être amené à évoluer. L'abonnement est
              résiliable à tout moment ; la résiliation prend effet à la fin de la période de
              facturation en cours.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">4. Contenu généré</h2>
            <p>
              Le contenu généré par FishFlow résulte d'un traitement automatisé par intelligence
              artificielle. Il peut contenir des imprécisions ou des erreurs. L'utilisateur reste seul
              responsable de la vérification et de l'usage qu'il fait des fiches générées, notamment
              dans un contexte scolaire ou universitaire.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">5. Contenu déposé par l'utilisateur</h2>
            <p>
              L'utilisateur garantit disposer des droits nécessaires sur les contenus (textes, PDF,
              photos) qu'il soumet au service. Il s'engage à ne pas déposer de contenu illicite,
              protégé par des droits qu'il ne détient pas, ou portant atteinte aux droits de tiers.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">6. Résiliation et suppression de compte</h2>
            <p>
              L'utilisateur peut demander la suppression de son compte et de ses données à tout moment
              en nous contactant à l'adresse anouarcherrak68100@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">7. Modification des CGU</h2>
            <p>
              Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés de
              toute modification substantielle.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">8. Contact</h2>
            <p>Pour toute question relative à ces CGU : anouarcherrak68100@gmail.com</p>
          </section>

          <p className="text-xs text-white/25 pt-4 border-t border-white/10">
            Dernière mise à jour : 11/08/2026
          </p>
        </div>
      </div>
    </main>
  );
}