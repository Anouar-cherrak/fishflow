import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { SiteFooter } from "@/components/SiteFooter";

type Size = "form" | "normal" | "wide";

// Le cadre commun de toutes les pages : barre du haut + contenu bien proportionné, sur un fond uni (docs/design-simple.md).
// « form » = un formulaire, « normal » = une page de lecture, « wide » = une page avec deux colonnes ou une grille.
// « publicPage » = page publique : texte un peu plus grand et pied de page.
export function AppShell({ children, size = "normal", nav = true, publicPage = false }: { children: ReactNode; size?: Size; nav?: boolean; publicPage?: boolean }) {
  return (
    <div className="ff-frame" data-calm={publicPage || undefined}>
      <a href="#contenu" className="ff-skip">Aller au contenu</a>
      {nav && <AppNav />}
      <main id="contenu" tabIndex={-1} className="ff-main outline-none" data-size={size}>
        {children}
      </main>
      {publicPage && <SiteFooter />}
    </div>
  );
}
