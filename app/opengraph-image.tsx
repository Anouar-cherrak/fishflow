import { ogImage, ogSize } from "@/lib/og-image";

export const alt = "FishFlow — Révise en profondeur : ton cours devient une fiche, des flashcards et un quiz.";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogImage("Révise en profondeur.", "Colle ton cours : FishFlow en fait une fiche, des flashcards et un quiz en moins d'une minute.");
}
