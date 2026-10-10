import { AppShell } from "@/components/AppShell";

export default function CGU() {
  return (
    <AppShell size="form">
      <article>
        <h1 className="ff-title mb-8">Conditions générales d'utilisation</h1>

        <div className="space-y-8 text-base text-black/75 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">1. Objet</h2>
            <p>
              Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation
              du site FishFlow (ficheflow.fr), service permettant de générer des supports de révision
              (résumés, fiches, flashcards, quiz) à partir de contenus fournis par l'utilisateur (texte,
              PDF, photo), à l'aide d'un traitement par intelligence artificielle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">2. Accès au service</h2>
            <p>
              L'utilisation de FishFlow nécessite la création d'un compte. L'utilisateur s'engage à
              fournir des informations exactes lors de son inscription et à garder ses identifiants
              confidentiels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">3. Offres et abonnement</h2>
            <p>
              FishFlow propose une offre gratuite limitée à un nombre défini de générations par mois,
              ainsi qu'une offre payante ("FishFlow Pro") donnant accès à des générations illimitées dans le cadre d'un usage normal
              (une limite anti-abus de 50 générations par jour s'applique),
              facturée mensuellement via notre prestataire de paiement Stripe. Le tarif en vigueur est
              affiché sur la page Tarifs du site et peut être amené à évoluer. L'abonnement est
              résiliable à tout moment ; la résiliation prend effet à la fin de la période de
              facturation en cours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">4. Contenu généré</h2>
            <p>
              Le contenu généré par FishFlow résulte d'un traitement automatisé par intelligence
              artificielle. Il peut contenir des imprécisions ou des erreurs. L'utilisateur reste seul
              responsable de la vérification et de l'usage qu'il fait des fiches générées, notamment
              dans un contexte scolaire ou universitaire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">5. Contenu déposé par l'utilisateur</h2>
            <p>
              L'utilisateur garantit disposer des droits nécessaires sur les contenus (textes, PDF,
              photos) qu'il soumet au service. Il s'engage à ne pas déposer de contenu illicite,
              protégé par des droits qu'il ne détient pas, ou portant atteinte aux droits de tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">6. Résiliation et suppression de compte</h2>
            <p>
              L'utilisateur peut demander la suppression de son compte et de ses données à tout moment
              en nous contactant à l'adresse anouarcherrak68100@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">7. Modification des CGU</h2>
            <p>
              Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés de
              toute modification substantielle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">8. Contact</h2>
            <p>Pour toute question relative à ces CGU : anouarcherrak68100@gmail.com</p>
          </section>

          <p className="text-sm text-black/50 pt-6 border-t border-black/10">
            Dernière mise à jour : 11/08/2026
          </p>
        </div>
      </article>
    </AppShell>
  );
}