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

const PARTICLES = [
  { top: "15%", left: "10%", delay: "0s", size: "w-1 h-1" },
  { top: "25%", left: "85%", delay: "1s", size: "w-1.5 h-1.5" },
  { top: "45%", left: "5%", delay: "2s", size: "w-1 h-1" },
  { top: "60%", left: "92%", delay: "0.5s", size: "w-2 h-2" },
  { top: "35%", left: "50%", delay: "1.5s", size: "w-1 h-1" },
  { top: "70%", left: "20%", delay: "3s", size: "w-1.5 h-1.5" },
  { top: "10%", left: "60%", delay: "2.5s", size: "w-1 h-1" },
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white overflow-hidden relative">
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

      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2563EB] rounded-full blur-3xl animate-glow-1 pointer-events-none" />
      <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-[#7C3AED] rounded-full blur-3xl animate-glow-2 pointer-events-none" />
      <div className="absolute bottom-[0%] left-[20%] w-[400px] h-[400px] bg-[#EC4899] rounded-full blur-3xl animate-glow-3 pointer-events-none" />

      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none opacity-60">
        <svg className="absolute w-[200%] h-full animate-wave-1" viewBox="0 0 1600 600" preserveAspectRatio="none">
          <path
            d="M0,300 C200,200 400,400 600,300 C800,200 1000,400 1200,300 C1400,200 1600,400 1800,300 L1800,600 L0,600 Z M800,300 C1000,200 1200,400 1400,300 C1600,200 1800,400 2000,300 C2200,200 2400,400 2600,300"
            fill="none"
            stroke="#2563EB"
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        </svg>
        <svg className="absolute w-[200%] h-full animate-wave-2" viewBox="0 0 1600 600" preserveAspectRatio="none">
          <path
            d="M0,380 C200,300 400,460 600,380 C800,300 1000,460 1200,380 C1400,300 1600,460 1800,380 L1800,600 L0,600 Z"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
        </svg>
        <svg
          className="absolute w-[200%] h-full animate-wave-1"
          viewBox="0 0 1600 600"
          preserveAspectRatio="none"
          style={{ animationDuration: "30s" }}
        >
          <path
            d="M0,220 C200,140 400,300 600,220 C800,140 1000,300 1200,220 C1400,140 1600,300 1800,220"
            fill="none"
            stroke="#EC4899"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
        </svg>
      </div>

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.size} rounded-full bg-white animate-particle pointer-events-none`}
          style={{ top: p.top, left: p.left, animationDelay: p.delay }}
        />
      ))}

      <header className="relative w-full max-w-6xl mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <Wordmark className="text-lg" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition">
            Connexion
          </Link>
          <TrackedLink
            href="/signup"
            event="cta_click_header_signup"
            className="text-sm bg-white/10 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full font-medium hover:bg-white/20 transition"
          >
            Créer un compte
          </TrackedLink>
        </div>
      </header>

      <section className="relative w-full max-w-3xl mx-auto text-center px-4 pt-16 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm text-white/70 mb-6">
          ⚡ Ta fiche de révision prête en quelques secondes
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-5 leading-tight">
          Transforme ton cours
          <br />
          en{" "}
          <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">
            fiches de révision.
          </span>
        </h1>

        <p className="text-white/60 text-lg mb-2 max-w-xl mx-auto">
          Colle un texte, dépose un PDF ou prends ton cours en photo. FishFlow génère résumé, fiche, flashcards et quiz — un outil pensé pour réviser, pas un simple chat généraliste.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 mt-6">
          {["⚡ Rapide", "🎯 Précis", "🧠 Intelligent", "🔒 Sécurisé"].map((tag) => (
            <span key={tag} className="text-sm px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
              {tag}
            </span>
          ))}
        </div>

        <TrackedLink
          href="/generer"
          event="cta_click_hero"
          className="inline-block px-8 py-3.5 rounded-full font-display font-semibold text-lg bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
        >
          Essayer gratuitement ✨
        </TrackedLink>
        <p className="text-white/40 text-sm mt-3 mb-4">3 fiches gratuites par mois · Sans carte bancaire</p>

        <FicheCounter />
      </section>

      {/* Exemple concret d'une fiche générée */}
      <section className="relative w-full max-w-2xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-2">
          Voici à quoi ressemble une fiche FishFlow
        </h2>
        <p className="text-white/50 text-center mb-8 text-sm">
          Exemple généré à partir d'un cours sur la photosynthèse
        </p>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
              📝 Résumé
            </p>
            <p className="text-sm text-white/80 leading-relaxed">
              La photosynthèse est le processus par lequel les plantes convertissent la lumière du soleil en énergie chimique, produisant du glucose et de l'oxygène à partir de CO₂ et d'eau.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
              📌 Points clés
            </p>
            <ul className="text-sm text-white/80 space-y-1.5">
              <li className="flex gap-2"><span className="text-[#7C3AED]">•</span> Se déroule dans les chloroplastes</li>
              <li className="flex gap-2"><span className="text-[#7C3AED]">•</span> Nécessite la chlorophylle, la lumière et l'eau</li>
              <li className="flex gap-2"><span className="text-[#7C3AED]">•</span> Produit du glucose et libère de l'oxygène</li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
              🎴 Flashcard
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-sm text-white font-medium mb-1">Où se déroule la photosynthèse ?</p>
              <p className="text-sm text-white/50">Dans les chloroplastes des cellules végétales</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <TrackedLink
            href="/generer"
            event="cta_click_exemple"
            className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#EC4899] hover:underline"
          >
            Crée la tienne maintenant →
          </TrackedLink>
        </div>
      </section>

      <section className="relative w-full max-w-4xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-3">
          Ton cours, transformé en quelques secondes
        </h2>
        <p className="text-white/50 text-center mb-10 max-w-lg mx-auto text-sm">
          Un seul import, quatre supports de révision prêts à l'emploi.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-6 py-5 text-center w-full sm:w-auto">
            <div className="text-2xl mb-1">📄</div>
            <p className="text-sm font-medium text-white/80">Cours, PDF ou photo</p>
          </div>

          <div className="text-white/30 text-2xl rotate-90 sm:rotate-0">→</div>

          <div className="bg-gradient-to-br from-[#2563EB]/20 via-[#7C3AED]/20 to-[#EC4899]/20 border border-white/10 backdrop-blur-md rounded-2xl px-6 py-5 text-center w-full sm:w-auto">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Logo size={20} />
            </div>
            <p className="text-sm font-medium text-white">FishFlow analyse</p>
          </div>

          <div className="text-white/30 text-2xl rotate-90 sm:rotate-0">→</div>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            {[
              { icon: "📝", label: "Résumé" },
              { icon: "📌", label: "Fiche" },
              { icon: "🎴", label: "Flashcards" },
              { icon: "❓", label: "Quiz" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-3 py-2.5 text-center"
              >
                <div className="text-lg">{item.icon}</div>
                <p className="text-xs font-medium text-white/70">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative w-full max-w-4xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">
          Pourquoi pas juste ChatGPT ?
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              icon: "🎯",
              title: "Pensé uniquement pour réviser",
              desc: "Pas de chat à faire dériver : un format structuré, pensé dès le départ pour l'apprentissage.",
            },
            {
              icon: "⚡",
              title: "4 formats en un clic",
              desc: "Résumé, fiche, flashcards et quiz générés en même temps, sans reformuler ta demande 4 fois.",
            },
            {
              icon: "💾",
              title: "Tes fiches, sauvegardées",
              desc: "Retrouve tout ton historique dans « Mes fiches », sans perdre une conversation dans le vide.",
            },
            {
              icon: "📥",
              title: "Export PDF prêt à réviser",
              desc: "Un document propre, téléchargeable, imprimable — pas un texte à copier-coller toi-même.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 flex gap-4"
            >
              <div className="text-2xl shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative w-full max-w-4xl mx-auto px-4 pb-20">
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
            <div
              key={step.title}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 text-center hover:bg-white/10 transition"
            >
              <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-lg">
                {step.icon}
              </div>
              <h3 className="font-medium text-sm mb-1">{step.title}</h3>
              <p className="text-white/50 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative w-full max-w-3xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">
          Commence gratuitement, passe Premium quand tu veux
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Gratuit</p>
            <p className="text-3xl font-bold mb-1">0 €</p>
            <p className="text-white/40 text-sm mb-5">3 fiches par mois</p>
            <ul className="text-sm text-white/70 space-y-2 mb-6">
              <li>✓ Texte, PDF et photo</li>
              <li>✓ Résumé, fiche, flashcards, quiz</li>
              <li>✓ Export PDF</li>
              <li>✓ Sans carte bancaire</li>
            </ul>
            <TrackedLink
              href="/generer"
              event="cta_click_offer_free"
              className="block text-center w-full py-2.5 rounded-lg font-medium border border-white/15 hover:bg-white/10 transition"
            >
              Créer ma fiche gratuitement
            </TrackedLink>
          </div>

          <div className="bg-gradient-to-br from-[#2563EB]/15 via-[#7C3AED]/15 to-[#EC4899]/15 border border-[#7C3AED]/40 backdrop-blur-md rounded-2xl p-6 relative">
            <span className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#EC4899]">
              Populaire
            </span>
            <p className="text-xs font-semibold bg-gradient-to-r from-[#2563EB] to-[#EC4899] bg-clip-text text-transparent uppercase tracking-wide mb-2">
              Premium
            </p>
            <p className="text-3xl font-bold mb-1">4,99 €<span className="text-base font-normal text-white/50">/mois</span></p>
            <p className="text-white/40 text-sm mb-5">Générations illimitées</p>
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
              className="block text-center w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition"
            >
              Passer Premium
            </TrackedLink>
          </div>
        </div>
      </section>

      <section className="relative w-full max-w-3xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔒", label: "Paiement sécurisé via Stripe" },
            { icon: "↩️", label: "Résiliation en un clic" },
            { icon: "🛡️", label: "Tes fiches restent privées" },
          ].map((item) => (
            <div key={item.label} className="text-white/50 text-sm flex flex-col items-center gap-2">
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <section className="relative w-full max-w-2xl mx-auto px-4 pb-24 text-center">
        <TrackedLink
          href="/generer"
          event="cta_click_final"
          className="inline-block px-8 py-3.5 rounded-full font-display font-semibold text-lg bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
        >
          Essayer gratuitement
        </TrackedLink>
        <p className="text-white/40 text-sm mt-3">3 fiches gratuites par mois · Sans carte bancaire</p>
      </section>

      <footer className="relative w-full max-w-5xl mx-auto px-4 py-6 border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-sm">© {new Date().getFullYear()} FishFlow</p>
          <div className="flex gap-4 text-sm text-white/30">
            <Link href="/mentions-legales" className="hover:text-white/60 hover:underline">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-white/60 hover:underline">
              CGU
            </Link>
            <Link href="/confidentialite" className="hover:text-white/60 hover:underline">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}