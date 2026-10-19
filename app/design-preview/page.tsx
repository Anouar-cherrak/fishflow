import type { Metadata } from "next";
import { previewFontVars } from "./fonts";
import { Preview } from "./Preview";
import "./preview.css";

// Page de travail : les 3 directions d'identité à comparer. À supprimer une fois la direction choisie.
export const metadata: Metadata = {
  title: "Prévisualisation des directions",
  robots: { index: false, follow: false },
};

export default function DesignPreviewPage() {
  return (
    <div className={previewFontVars}>
      <Preview />
    </div>
  );
}
