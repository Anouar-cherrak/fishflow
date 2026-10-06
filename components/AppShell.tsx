import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";

type Size = "form" | "normal" | "wide";

// Le cadre commun de toutes les pages de l'application : barre du haut + contenu bien proportionné.
// « form » = un formulaire, « normal » = une page de lecture, « wide » = une page avec deux colonnes ou une grille.
export function AppShell({ children, size = "normal", nav = true }: { children: ReactNode; size?: Size; nav?: boolean }) {
  return (
    <div className="ff-frame">
      {nav && <AppNav />}
      <main className="ff-main" data-size={size}>
        {children}
      </main>
    </div>
  );
}
