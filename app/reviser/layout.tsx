import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Réviser",
  description: "Les cartes à revoir aujourd’hui.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
