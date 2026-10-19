# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Étudiants et lycéens de 17 à 25 ans, francophones, surtout sur téléphone (souvent un Android d'entrée de gamme), parfois sur ordinateur. Ils ont un cours à apprendre (texte, PDF, photo de notes) et peu de temps : la veille d'un contrôle, dans le bus, le soir.

## Product Purpose
FishFlow transforme un cours en fiche de révision, puis en flashcards et en quiz, et fait réviser chaque jour (série, objectif du jour, rappels). On peut aussi poser une question (Apprendre) et préparer un examen. Succès : l'étudiant colle son cours, obtient une fiche claire en moins d'une minute, et revient réviser les jours suivants.

## Positioning
Le chemin complet cours → fiche → flashcards → quiz → révision espacée, en français, avec des réponses honnêtes sur leurs limites (sources citées dans Apprendre).

## Operating Context
Mobile d'abord (360–390 px), barre d'onglets du bas dans l'appli, connexion Supabase, paiement Stripe, e-mails Resend, PWA installable. Thèmes clair et sombre.

## Capabilities and Constraints
- Gratuit : 3 fiches/mois, 5 dernières fiches gardées, 1 question Apprendre. Pro : 4,99 €/mois, 100 fiches/mois (10/jour), 20 questions/jour (lib/limits.ts). Ne jamais changer prix, Stripe ni limites.
- Moteur de fiches et logique des limites hors du périmètre design.
- Performance : PageSpeed mobile ≥ 90, LCP < 2,5 s, CLS 0 ; décors en SVG/CSS légers.
- Accessibilité : Lighthouse 100, clavier, focus visible, WCAG AA.

## Brand Commitments
- Nom « FishFlow », « Flow » en bleu. Univers : l'océan (lumière qui descend, profondeur, bulles, petits poissons).
- Mascotte : raie manta bleu ciel #2AA9E8, dessin d'Anouar (public/brand/logo*.png) — ne pas redessiner. Elle peut être mise en scène en grand sur la landing (accord du 19/10/2026).
- Couleur de marque : bleu des boutons (#38BDF8 / #2AA9E8). Vert réservé à « bonne réponse ».
- Ton : tutoiement, français simple, clair, chaleureux, énergique, mignon sans être enfantin.

## Evidence on Hand
Pas de témoignages, chiffres d'usage ni logos d'écoles : ne pas en inventer. Exemples de démonstration (ciel bleu, trou noir, photosynthèse) déjà dans components/landing/Landing.tsx. Ne jamais écrire d'usages que FishFlow ne fait pas.

## Product Principles
1. Le cours de l'étudiant est le héros : tout part de « colle ton cours ».
2. Rapide sur un vieux téléphone avant d'être joli.
3. Honnête : pas de promesse ni de chiffre inventé.
4. Réviser doit donner envie de revenir le lendemain.

## Accessibility & Inclusion
WCAG AA, prefers-reduced-motion respecté, zones tactiles 44 px, textes en français clair.
