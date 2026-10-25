// Textes partagés par la page d'accueil et ses données structurées (app/page.tsx). Contenu réel, rien d'inventé.

export const FAQ: { q: string; a: string }[] = [
  { q: "Comment ça marche, concrètement ?", a: "Tu crées ton compte gratuit. Tu colles ton cours (ou tu envoies un PDF, ou une photo de tes notes) et tu appuies sur « Créer ma fiche ». Moins d'une minute plus tard, tu as ta fiche, tes flashcards et ton quiz. Ensuite, FishFlow te dit chaque jour quelles cartes revoir." },
  { q: "C'est pour qui ?", a: "Pour toute personne qui a un cours à apprendre : collège, lycée, études supérieures, concours, formation. Il te faut juste ton cours, en texte, en PDF ou en photo." },
  { q: "C'est gratuit ?", a: "Oui pour commencer : 3 fiches par mois et un essai d'Apprendre, sans carte bancaire. Avec Pro, tu peux créer jusqu'à 100 fiches par mois." },
  { q: "Je peux arrêter Pro quand je veux ?", a: "Oui, en un clic dans Paramètres. Tu gardes Pro jusqu'à la fin du mois déjà payé." },
  { q: "Les réponses sont-elles vraies ?", a: "Pour les fiches, elles viennent de ton propre cours. Pour les questions d'Apprendre, c'est une IA qui répond : elle peut se tromper, donc pour un détail important, vérifie dans les liens proposés ou dans ton cours." },
  { q: "Que deviennent mes cours et mes fiches ?", a: "Tes fiches restent privées : seul ton compte peut les lire, sauf si tu partages toi-même un lien. Ton cours est envoyé à OpenAI uniquement pour créer ta fiche. Tu peux télécharger toutes tes données et supprimer ton compte quand tu veux, dans Paramètres." },
];

export const TRUST: { title: string; text: string }[] = [
  { title: "Tes fiches restent à toi", text: "Seul ton compte peut les lire. Tu choisis toi-même si tu partages un lien." },
  { title: "Aucune revente", text: "Tes données ne sont ni vendues ni partagées à des fins commerciales." },
  { title: "Paiement par Stripe", text: "FishFlow ne voit jamais ta carte bancaire. Pro s'arrête en un clic." },
  { title: "Tu pars quand tu veux", text: "Télécharge tes données, puis supprime ton compte et tout ce qu'il contient, dans Paramètres." },
];
