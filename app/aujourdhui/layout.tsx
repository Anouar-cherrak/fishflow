import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Aujourd’hui",
  description: "Ton objectif du jour, tes cartes à revoir et ta progression.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
