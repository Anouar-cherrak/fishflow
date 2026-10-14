import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Conditions d’utilisation",
  description: "Les conditions générales d’utilisation de FishFlow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
