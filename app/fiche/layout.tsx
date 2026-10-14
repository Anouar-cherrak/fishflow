import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Ta fiche",
  description: "Ta fiche de révision, l’essentiel, les flashcards et le quiz.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
