import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

// Page de connexion / inscription : sur ordinateur, le message de FishFlow à gauche et le formulaire à droite.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell size="wide">
      <div className="grid gap-10 lg:gap-20 lg:grid-cols-2 items-center lg:min-h-[60vh]">
        <div className="hidden lg:grid gap-7 content-center ff-fade-up relative">
          <p className="ff-title" aria-hidden="true">Révise en profondeur.</p>
          <p className="ff-lead">Colle un cours, FishFlow en fait une fiche de révision, des flashcards et un quiz. Tu poses aussi n&apos;importe quelle question, avec les sources.</p>
          <ul className="grid gap-3 text-black/80">
            {["3 fiches gratuites par mois", "Sans carte bancaire", "Tes fiches restent privées"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-accent" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-center ff-fade-up">
          <div className="bg-surface border border-black/10 rounded-3xl p-6 sm:p-9">
            {children}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
