import { ogImage, ogSize } from "@/lib/og-image";

export const alt = "FishFlow — Gratuit ou Pro : ce qui change.";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogImage("Gratuit ou Pro.", "3 fiches gratuites par mois, ou Pro à 4,99 € par mois. Tu arrêtes quand tu veux.");
}
