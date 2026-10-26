import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { Ocean } from "@/components/Ocean";
import { SiteFooter } from "@/components/SiteFooter";

type Size = "form" | "normal" | "wide";

// Le cadre commun de toutes les pages de l'application : barre du haut + contenu bien proportionné.
// « form » = un formulaire, « normal » = une page de lecture, « wide » = une page avec deux colonnes ou une grille.
// « publicPage » = page publique au design simple (docs/design-simple.md) : fond uni, sans décor animé, avec pied de page.
export function AppShell({ children, size = "normal", nav = true, publicPage = false }: { children: ReactNode; size?: Size; nav?: boolean; publicPage?: boolean }) {
  return (
    <div className="ff-frame" data-calm={publicPage || undefined}>
      <a href="#contenu" className="ff-skip">Aller au contenu</a>
      {!publicPage && <Ocean />}
      {nav && <AppNav />}
      <main id="contenu" tabIndex={-1} className="ff-main outline-none" data-size={size}>
        {children}
      </main>
      {publicPage && <SiteFooter />}
    </div>
  );
}
