import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Mes fiches",
  description: "Toutes tes fiches de révision, rangées par matière.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
