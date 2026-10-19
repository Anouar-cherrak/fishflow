import type { Metadata } from "next";
import { bricolage, figtree } from "../fonts";
import { Descente } from "./Descente";
import "./descente.css";

// Démo des animations signature de « La Descente ». Page de travail, à supprimer après validation.
export const metadata: Metadata = {
  title: "Démo de La Descente",
  robots: { index: false, follow: false },
};

export default function DescentePage() {
  return (
    <div className={`${bricolage.variable} ${figtree.variable}`}>
      <Descente />
    </div>
  );
}
