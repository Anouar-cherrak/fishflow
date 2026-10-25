import { ogImage, ogSize } from "@/lib/og-image";

export const alt = "FishFlow — Aide : comment ça marche.";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogImage("Comment ça marche.", "Créer une fiche, réviser avec les flashcards, faire le quiz et préparer un examen.");
}
