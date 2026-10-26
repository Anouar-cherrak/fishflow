// Textes partagés par la page d'accueil, ses données structurées (app/page.tsx) et la page Tarifs. Contenu réel, rien d'inventé.
import type { Fiche } from "@/lib/fiche-engine";

export const FAQ: { q: string; a: string }[] = [
  { q: "Quelle différence avec ChatGPT ?", a: "Pas de consigne à écrire : tu colles ton cours, c'est tout. FishFlow en fait une fiche, des flashcards et un quiz, à partir de ton cours à toi. Tout reste au même endroit : tes fiches sont rangées dans « Mes fiches », par matière, et FishFlow te dit chaque jour quelles cartes revoir." },
  { q: "C'est vraiment gratuit ?", a: "Oui. Le compte gratuit donne 3 fiches par mois, avec leurs flashcards et leur quiz, sans carte bancaire. Pro coûte 4,99 € par mois pour 100 fiches. Tu l'arrêtes quand tu veux, en un clic dans Paramètres." },
  { q: "Mes cours restent privés ?", a: "Oui. Seul ton compte peut lire tes fiches, sauf si tu partages toi-même un lien. Ton cours est envoyé à OpenAI uniquement pour créer ta fiche, et tes données ne sont pas vendues. Tu peux tout télécharger et supprimer ton compte dans Paramètres." },
  { q: "Les réponses sont-elles justes ?", a: "Les fiches viennent de ton propre cours. Pour les questions posées dans Apprendre, c'est une IA qui répond : elle peut se tromper, donc pour un détail important, vérifie dans les liens proposés ou dans ton cours." },
];

// Exemple de fiche montré sur l'accueil (cours de SVT sur la photosynthèse), affiché avec les vrais composants de fiche.
export const EXAMPLE: { title: string; essentiel: string[]; fiche: Fiche } = {
  title: "La photosynthèse",
  essentiel: [
    "La photosynthèse transforme l'énergie de la lumière en énergie chimique.",
    "Elle a lieu dans les **chloroplastes**, grâce à la chlorophylle.",
    "Réactifs : eau + CO₂. Produits : glucose + O₂.",
  ],
  fiche: {
    sections: [
      { title: "Où et comment ?", blocks: [
        { type: "liste", text: "Les acteurs :", items: ["Les chloroplastes, dans les cellules des feuilles", "La chlorophylle, pigment vert qui capte la lumière", "Les stomates, par où entre le CO₂"] },
        { type: "piege", text: "La phase « sombre » ne se fait pas la nuit : elle ne dépend simplement pas directement de la lumière." },
      ] },
    ],
  },
};
