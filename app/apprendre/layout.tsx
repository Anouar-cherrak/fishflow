import type { Metadata } from "next";

// Titre de l'onglet du navigateur pour cette page (le modèle « … · FishFlow » est dans app/layout.tsx).
export const metadata: Metadata = {
  title: "Apprendre",
  description: "Pose une question, reçois une réponse claire avec des sources.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
