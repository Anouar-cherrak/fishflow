import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Créer une fiche",
  description: "Colle un cours, envoie un PDF ou une photo : FishFlow en fait une fiche, des flashcards et un quiz.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
