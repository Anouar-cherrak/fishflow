// Polices des 3 directions (page de prévisualisation seulement, à supprimer après le choix).
import { Albert_Sans, Atkinson_Hyperlegible_Next, Big_Shoulders, Bricolage_Grotesque, Figtree, Young_Serif } from "next/font/google";

export const bigShoulders = Big_Shoulders({ subsets: ["latin"], weight: "variable", axes: ["opsz"], variable: "--fA-display", preload: false });
export const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: "variable", variable: "--fA-body", preload: false });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: "variable", axes: ["opsz", "wdth"], variable: "--fB-display", preload: false });
export const figtree = Figtree({ subsets: ["latin"], weight: "variable", variable: "--fB-body", preload: false });
export const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--fC-display", preload: false });
export const albert = Albert_Sans({ subsets: ["latin"], weight: "variable", variable: "--fC-body", preload: false });

export const previewFontVars = [bigShoulders, atkinson, bricolage, figtree, youngSerif, albert].map((f) => f.variable).join(" ");
