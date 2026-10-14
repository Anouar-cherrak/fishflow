import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { Ocean } from "@/components/Ocean";

type Size = "form" | "normal" | "wide";

// Le cadre commun de toutes les pages de l'application : barre du haut + contenu bien proportionné.
// « form » = un formulaire, « normal » = une page de lecture, « wide » = une page avec deux colonnes ou une grille.
export function AppShell({ children, size = "normal", nav = true }: { children: ReactNode; size?: Size; nav?: boolean }) {
  return (
    <div className="ff-frame">
      <a href="#contenu" className="ff-skip">Aller au contenu</a>
      <Ocean />
      {nav && <AppNav />}
      <main id="contenu" tabIndex={-1} className="ff-main outline-none" data-size={size}>
        {children}
      </main>
    </div>
  );
}
