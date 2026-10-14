import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Crée ton compte gratuit : 3 fiches par mois, sans carte bancaire.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
