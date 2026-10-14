import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Mes examens",
  description: "Prépare un examen : combien de cartes revoir chaque jour.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
