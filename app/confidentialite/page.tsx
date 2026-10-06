import { AppShell } from "@/components/AppShell";

export default function Confidentialite() {
  return (
    <AppShell size="form">
      <article>
        <h1 className="ff-title mb-8">Politique de confidentialité</h1>

        <div className="space-y-8 text-base text-black/75 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">1. Données collectées</h2>
            <p>Lors de l'utilisation de FishFlow, nous collectons :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Ton adresse email et mot de passe (lors de la création de compte)</li>
              <li>Les contenus que tu soumets pour génération (texte, PDF, photo)</li>
              <li>Les fiches générées, sauvegardées dans ton compte</li>
              <li>Des données techniques liées à ton abonnement (statut Pro, historique de paiement, gérées par Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">2. Utilisation des données</h2>
            <p>Tes données sont utilisées uniquement pour :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Te permettre d'accéder à ton compte et à tes fiches</li>
              <li>Générer les supports de révision que tu demandes</li>
              <li>Gérer ton abonnement le cas échéant</li>
            </ul>
            <p className="mt-2">
              Nous ne vendons ni ne partageons tes données personnelles à des tiers à des fins
              commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">3. Sous-traitants et prestataires</h2>
            <p>Pour fonctionner, FishFlow s'appuie sur les prestataires suivants :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-black">Supabase</strong> — hébergement de la base de données et gestion des comptes</li>
              <li><strong className="text-black">OpenAI</strong> — traitement des contenus soumis pour générer les fiches de révision</li>
              <li><strong className="text-black">Stripe</strong> — traitement des paiements pour l'abonnement FishFlow Pro</li>
              <li><strong className="text-black">Vercel</strong> — hébergement du site</li>
            </ul>
            <p className="mt-2">
              Ces prestataires peuvent traiter tes données dans le cadre strict de la fourniture de
              leur service, conformément à leurs propres politiques de confidentialité.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">4. Conservation des données</h2>
            <p>
              Tes données sont conservées tant que ton compte est actif. Tu peux demander la
              suppression de ton compte et de tes données à tout moment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">5. Tes droits</h2>
            <p>
              Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, de suppression et
              de portabilité de tes données. Pour exercer ces droits, contacte-nous à l'adresse :{" "}
              anouarcherrak68100@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">6. Cookies</h2>
            <p>
              FishFlow utilise des cookies strictement nécessaires au fonctionnement du site (maintien
              de ta session de connexion). Aucun cookie publicitaire ou de mesure d'audience tiers
              n'est utilisé à ce jour.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight text-black mb-2">7. Contact</h2>
            <p>
              Pour toute question relative à cette politique de confidentialité :{" "}
              anouarcherrak68100@gmail.com
            </p>
          </section>

          <p className="text-sm text-black/50 pt-6 border-t border-black/10">
            Dernière mise à jour : 11/08/2026
          </p>
        </div>
      </article>
    </AppShell>
  );
}