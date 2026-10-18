import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Aide",
  description: "De petites animations pour comprendre chaque fonction.",
  alternates: { canonical: "/aide" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
