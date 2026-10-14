import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Gratuit ou Pro",
  description: "Ce que tu as avec le compte gratuit et avec FishFlow Pro.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
