import Link from "next/link";
import { Logo, Wordmark } from "@/components/Logo";

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
      {/* Halos de couleur animés */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2563EB] rounded-full blur-3xl animate-glow-1 pointer-events-none" />
      <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-[#7C3AED] rounded-full blur-3xl animate-glow-2 pointer-events-none" />
      <div className="absolute bottom-[0%] left-[20%] w-[400px] h-[400px] bg-[#EC4899] rounded-full blur-3xl animate-glow-3 pointer-events-none" />

      {/* Vagues animées en fond */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none opacity-60">
        <svg
          className="absolute w-[200%] h-full animate-wave-1"
          viewBox="0 0 1600 600"
          preserveAspectRatio="none"
        >
          <path
            d="M0,300 C200,200 400,400 600,300 C800,200 1000,400 1200,300 C1400,200 1600,400 1800,300 L1800,600 L0,600 Z M800,300 C1000,200 1200,400 1400,300 C1600,200 1800,400 2000,300 C2200,200 2400,400 2600,300"
            fill="none"
            stroke="#2563EB"
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        </svg>
        <svg
          className="absolute w-[200%] h-full animate-wave-2"
          viewBox="0 0 1600 600"
          preserveAspectRatio="none"
        >
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

      {/* Particules flottantes */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.size} rounded-full bg-white animate-particle pointer-events-none`}
          style={{ top: p.top, left: p.left, animationDelay: p.delay }}
        />
      ))}

      {/* Header */}
      <header className="relative w-full max-w-6xl mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <Wordmark className="text-lg" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition">
            Connexion
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-white/10 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full font-medium hover:bg-white/20 transition"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full max-w-3xl mx-auto text-center px-4 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm text-white/70 mb-6">
          ✨ IA nouvelle génération
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-5 leading-tight">
          Transforme ton cours
          <br />
          en{" "}
          <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">
            fiches de révision.
          </span>
        </h1>

        <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
          Résumés, fiches, flashcards, quiz — générés automatiquement par l'intelligence artificielle.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {["⚡ Rapide", "🎯 Précis", "🧠 Intelligent", "🔒 Sécurisé"].map((tag) => (
            <span
              key={tag}
              className="text-sm px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          href="/generer"
          className="inline-block px-8 py-3.5 rounded-full font-display font-semibold text-lg bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
        >
          Essayer gratuitement ✨
        </Link>
        <p className="text-white/40 text-sm mt-3">3 fiches gratuites par mois, sans carte bancaire.</p>
      </section>

      {/* Comment ça marche */}
      <section className="relative w-full max-w-4xl mx-auto px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">
          Comment ça marche ?
        </h2>
        <div className="grid sm:grid-cols-4 gap-6">
          {[
            { icon: "📥", title: "1. Importer", desc: "Colle ton texte, importe un PDF ou prends une photo" },
            { icon: "🔍", title: "2. Analyser", desc: "Notre IA analyse et comprend ton contenu" },
            { icon: "✨", title: "3. Générer", desc: "Fiches, résumés, flashcards et quiz générés" },
            { icon: "📤", title: "4. Réviser", desc: "Télécharge et révise efficacement !" },
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

      {/* Ce que ça génère */}
      <section className="relative w-full max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
          <h2 className="font-display text-xl font-semibold text-center mb-6">
            Tout ce qu'il te faut pour réviser
          </h2>
          <div className="grid sm:grid-cols-4 gap-4 text-center">
            {[
              { icon: "📝", label: "Résumé" },
              { icon: "📌", label: "Fiche de révision" },
              { icon: "🎴", label: "Flashcards" },
              { icon: "❓", label: "Quiz" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm font-medium text-white/80">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="relative w-full max-w-2xl mx-auto px-4 pb-20 text-center">
        <h2 className="font-display text-xl font-semibold mb-2">Gratuit pour commencer</h2>
        <p className="text-white/60 mb-5">
          3 fiches par mois offertes. Passe Pro pour des générations illimitées, à partir de 4,99€/mois.
        </p>
        <Link
          href="/pricing"
          className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#EC4899] font-medium hover:underline"
        >
          Voir les tarifs →
        </Link>
      </section>

      {/* CTA final */}
      <section className="relative w-full max-w-2xl mx-auto px-4 pb-24 text-center">
        <Link
          href="/generer"
          className="inline-block px-8 py-3.5 rounded-full font-display font-semibold text-lg bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] hover:opacity-90 transition shadow-[0_0_40px_-10px_rgba(124,58,237,0.6)]"
        >
          Essayer gratuitement ✨
        </Link>
      </section>

      {/* Footer */}
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