import Link from "next/link";
import type { Metadata } from "next";
import { Logo, Wordmark } from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";
import { FicheCounter } from "@/components/FicheCounter";

export const metadata: Metadata = {
  title: "FishFlow — Fiches de révision, résumés et quiz par IA | Essai gratuit",
  description:
    "Transforme ton cours, PDF ou photo en fiche de révision, résumé, flashcards et quiz en quelques secondes grâce à l'IA. 3 fiches gratuites par mois, sans carte bancaire.",
};

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#F7F5FC] text-[#1E1533]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "FishFlow",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              description: "3 fiches de révision gratuites par mois",
            },
            description:
              "Transforme un cours, un PDF ou une photo en fiche de révision, résumé, flashcards et quiz grâce à l'IA.",
          }),
        }}
      />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <Wordmark className="text-lg" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-[#1E1533]/60 hover:text-[#1E1533] transition">
            Connexion
          </Link>
          <TrackedLink
            href="/signup"
            event="cta_click_header_signup"
            className="text-sm bg-white border border-[#6D28D9]/20 shadow-sm px-4 py-2 rounded-full font-medium hover:border-[#6D28D9]/40 transition"
          >
            Créer un compte
          </TrackedLink>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full max-w-3xl mx-auto text-center px-4 pt-16 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#6D28D9]/15 shadow-sm text-sm text-[#6D28D9] mb-6">
          ⚡ Ta fiche de révision prête en quelques secondes
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-5 leading-tight">
          Transforme ton cours
          <br />
          en <span className="text-[#6D28D9]">fiches de révision.</span>
        </h1>

        <p className="text-[#1E1533]/60 text-lg mb-2 max-w-xl mx-auto">
          Colle un texte, dépose un PDF ou prends ton cours en photo. FishFlow génère résumé, fiche, flashcards et quiz — un outil pensé pour réviser, pas un simple chat généraliste.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 mt-6">
          {["⚡ Rapide", "🎯 Précis", "🧠 Intelligent", "🔒 Sécurisé"].map((tag) => (
            <span key={tag} className="text-sm px-4 py-1.5 rounded-full bg-[#EFEBF7] text-[#1E1533]/70">
              {tag}
            </span>
          ))}
        </div>

        <TrackedLink
          href="/generer"
          event="cta_click_hero"
          className="inline-block px-8 py-3.5 rounded-full font-display font-semibold text-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition shadow-lg shadow-[#6D28D9]/20"
        >
          Essayer gratuitement ✨
        </TrackedLink>
        <p className="text-[#1E1533]/40 text-sm mt-3 mb-4">3 fiches gratuites par mois · Sans carte bancaire</p>

        <FicheCounter />
      </section>

      {/* Exemple concret d'une fiche générée */}
      <section className="w-full max-w-2xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-2">
          Voici à quoi ressemble une fiche FishFlow
        </h2>
        <p className="text-[#1E1533]/50 text-center mb-8 text-sm">
          Exemple généré à partir d'un cours sur la photosynthèse
        </p>

        <div className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-2">
              📝 Résumé
            </p>
            <p className="text-sm text-[#1E1533]/80 leading-relaxed">
              La photosynthèse est le processus par lequel les plantes convertissent la lumière du soleil en énergie chimique, produisant du glucose et de l'oxygène à partir de CO₂ et d'eau.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-2">
              📌 Points clés
            </p>
            <ul className="text-sm text-[#1E1533]/80 space-y-1.5">
              <li className="flex gap-2"><span className="text-[#6D28D9]">•</span> Se déroule dans les chloroplastes</li>
              <li className="flex gap-2"><span className="text-[#6D28D9]">•</span> Nécessite la chlorophylle, la lumière et l'eau</li>
              <li className="flex gap-2"><span className="text-[#6D28D9]">•</span> Produit du glucose et libère de l'oxygène</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide mb-2">
              🎴 Flashcard
            </p>
            <div className="bg-[#EFEBF7] rounded-lg p-3">
              <p className="text-sm text-[#1E1533] font-medium mb-1">Où se déroule la photosynthèse ?</p>
              <p className="text-sm text-[#1E1533]/50">Dans les chloroplastes des cellules végétales</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <TrackedLink
            href="/generer"
            event="cta_click_exemple"
            className="text-sm font-medium text-[#6D28D9] hover:underline"
          >
            Crée la tienne maintenant →
          </TrackedLink>
        </div>
      </section>

      {/* Démonstration — pipeline visuel */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-3">
          Ton cours, transformé en quelques secondes
        </h2>
        <p className="text-[#1E1533]/50 text-center mb-10 max-w-lg mx-auto text-sm">
          Un seul import, quatre supports de révision prêts à l'emploi.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl px-6 py-5 text-center w-full sm:w-auto">
            <div className="text-2xl mb-1">📄</div>
            <p className="text-sm font-medium text-[#1E1533]/80">Cours, PDF ou photo</p>
          </div>

          <div className="text-[#6D28D9]/40 text-2xl rotate-90 sm:rotate-0">→</div>

          <div className="bg-[#EFEBF7] border border-[#6D28D9]/15 rounded-2xl px-6 py-5 text-center w-full sm:w-auto">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Logo size={20} />
            </div>
            <p className="text-sm font-medium text-[#1E1533]">FishFlow analyse</p>
          </div>

          <div className="text-[#6D28D9]/40 text-2xl rotate-90 sm:rotate-0">→</div>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            {[
              { icon: "📝", label: "Résumé" },
              { icon: "📌", label: "Fiche" },
              { icon: "🎴", label: "Flashcards" },
              { icon: "❓", label: "Quiz" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-xl px-3 py-2.5 text-center"
              >
                <div className="text-lg">{item.icon}</div>
                <p className="text-xs font-medium text-[#1E1533]/70">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi FishFlow */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">
          Pourquoi pas juste ChatGPT ?
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: "🎯", title: "Pensé uniquement pour réviser", desc: "Pas de chat à faire dériver : un format structuré, pensé dès le départ pour l'apprentissage." },
            { icon: "⚡", title: "4 formats en un clic", desc: "Résumé, fiche, flashcards et quiz générés en même temps, sans reformuler ta demande 4 fois." },
            { icon: "💾", title: "Tes fiches, sauvegardées", desc: "Retrouve tout ton historique dans « Mes fiches », sans perdre une conversation dans le vide." },
            { icon: "📥", title: "Export PDF prêt à réviser", desc: "Un document propre, téléchargeable, imprimable — pas un texte à copier-coller toi-même." },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl p-5 flex gap-4">
              <div className="text-2xl shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                <p className="text-[#1E1533]/50 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">
          Comment ça marche ?
        </h2>
        <div className="grid sm:grid-cols-4 gap-6">
          {[
            { icon: "📥", title: "1. Importe ton cours", desc: "Texte, PDF ou photo — comme tu veux" },
            { icon: "🔍", title: "2. FishFlow l'analyse", desc: "L'IA comprend le contenu en quelques secondes" },
            { icon: "✨", title: "3. Ta fiche est générée", desc: "Résumé, fiche, flashcards et quiz prêts" },
            { icon: "📤", title: "4. Révise", desc: "Consulte, télécharge, révise efficacement" },
          ].map((step) => (
            <div key={step.title} className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl p-5 text-center hover:shadow-md transition">
              <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-[#6D28D9] flex items-center justify-center text-lg">
                {step.icon}
              </div>
              <h3 className="font-medium text-sm mb-1">{step.title}</h3>
              <p className="text-[#1E1533]/50 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Offres */}
      <section className="w-full max-w-3xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">
          Commence gratuitement, passe Premium quand tu veux
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white border border-[#6D28D9]/10 shadow-sm rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#1E1533]/40 uppercase tracking-wide mb-2">Gratuit</p>
            <p className="text-3xl font-bold mb-1">0 €</p>
            <p className="text-[#1E1533]/40 text-sm mb-5">3 fiches par mois</p>
            <ul className="text-sm text-[#1E1533]/70 space-y-2 mb-6">
              <li>✓ Texte, PDF et photo</li>
              <li>✓ Résumé, fiche, flashcards, quiz</li>
              <li>✓ Export PDF</li>
              <li>✓ Sans carte bancaire</li>
            </ul>
            <TrackedLink
              href="/generer"
              event="cta_click_offer_free"
              className="block text-center w-full py-2.5 rounded-lg font-medium border border-[#6D28D9]/20 hover:bg-[#EFEBF7] transition"
            >
              Créer ma fiche gratuitement
            </TrackedLink>
          </div>

          <div className="bg-[#6D28D9] text-white rounded-2xl p-6 relative shadow-lg shadow-[#6D28D9]/20">
            <span className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full bg-white text-[#6D28D9]">
              Populaire
            </span>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
              Premium
            </p>
            <p className="text-3xl font-bold mb-1">4,99 €<span className="text-base font-normal text-white/60">/mois</span></p>
            <p className="text-white/60 text-sm mb-5">Générations illimitées</p>
            <ul className="text-sm text-white/90 space-y-2 mb-6">
              <li className="font-medium">✓ Fiches illimitées</li>
              <li>✓ Texte, PDF et photo</li>
              <li>✓ Résumé, fiche, flashcards, quiz</li>
              <li>✓ Export PDF</li>
              <li>✓ Résiliable en un clic</li>
            </ul>
            <TrackedLink
              href="/pricing"
              event="cta_click_offer_premium"
              className="block text-center w-full py-2.5 rounded-lg font-medium bg-white text-[#6D28D9] hover:bg-[#F7F5FC] transition"
            >
              Passer Premium
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* Confiance */}
      <section className="w-full max-w-3xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔒", label: "Paiement sécurisé via Stripe" },
            { icon: "↩️", label: "Résiliation en un clic" },
            { icon: "🛡️", label: "Tes fiches restent privées" },
          ].map((item) => (
            <div key={item.label} className="text-[#1E1533]/50 text-sm flex flex-col items-center gap-2">
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="w-full max-w-2xl mx-auto px-4 pb-24 text-center">
        <TrackedLink
          href="/generer"
          event="cta_click_final"
          className="inline-block px-8 py-3.5 rounded-full font-display font-semibold text-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition shadow-lg shadow-[#6D28D9]/20"
        >
          Essayer gratuitement
        </TrackedLink>
        <p className="text-[#1E1533]/40 text-sm mt-3">3 fiches gratuites par mois · Sans carte bancaire</p>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-6 border-t border-[#6D28D9]/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#1E1533]/30 text-sm">© {new Date().getFullYear()} FishFlow</p>
          <div className="flex gap-4 text-sm text-[#1E1533]/30">
            <Link href="/mentions-legales" className="hover:text-[#1E1533]/60 hover:underline">Mentions légales</Link>
            <Link href="/cgu" className="hover:text-[#1E1533]/60 hover:underline">CGU</Link>
            <Link href="/confidentialite" className="hover:text-[#1E1533]/60 hover:underline">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}