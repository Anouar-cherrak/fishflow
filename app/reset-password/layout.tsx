import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Reçois un lien pour choisir un nouveau mot de passe.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
