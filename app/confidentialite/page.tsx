import Link from "next/link";
import { Logo, Wordmark } from "@/components/Logo";

export default function Confidentialite() {
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

        <h1 className="text-2xl font-semibold mb-6">Politique de confidentialité</h1>

        <div className="space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="font-semibold text-white mb-2">1. Données collectées</h2>
            <p>Lors de l'utilisation de FishFlow, nous collectons :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Ton adresse email et mot de passe (lors de la création de compte)</li>
              <li>Les contenus que tu soumets pour génération (texte, PDF, photo)</li>
              <li>Les fiches générées, sauvegardées dans ton compte</li>
              <li>Des données techniques liées à ton abonnement (statut Pro, historique de paiement, gérées par Stripe)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">2. Utilisation des données</h2>
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
            <h2 className="font-semibold text-white mb-2">3. Sous-traitants et prestataires</h2>
            <p>Pour fonctionner, FishFlow s'appuie sur les prestataires suivants :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-white/80">Supabase</strong> — hébergement de la base de données et gestion des comptes</li>
              <li><strong className="text-white/80">OpenAI</strong> — traitement des contenus soumis pour générer les fiches de révision</li>
              <li><strong className="text-white/80">Stripe</strong> — traitement des paiements pour l'abonnement FishFlow Pro</li>
              <li><strong className="text-white/80">Vercel</strong> — hébergement du site</li>
            </ul>
            <p className="mt-2">
              Ces prestataires peuvent traiter tes données dans le cadre strict de la fourniture de
              leur service, conformément à leurs propres politiques de confidentialité.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">4. Conservation des données</h2>
            <p>
              Tes données sont conservées tant que ton compte est actif. Tu peux demander la
              suppression de ton compte et de tes données à tout moment.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">5. Tes droits</h2>
            <p>
              Conformément au RGPD, tu disposes d'un droit d'accès, de rectification, de suppression et
              de portabilité de tes données. Pour exercer ces droits, contacte-nous à l'adresse :{" "}
              anouarcherrak68100@gmail.com
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">6. Cookies</h2>
            <p>
              FishFlow utilise des cookies strictement nécessaires au fonctionnement du site (maintien
              de ta session de connexion). Aucun cookie publicitaire ou de mesure d'audience tiers
              n'est utilisé à ce jour.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-white mb-2">7. Contact</h2>
            <p>
              Pour toute question relative à cette politique de confidentialité :{" "}
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