# FishFlow — design simple (règles, 26/10/2026)

But : qu'un inconnu comprenne chaque page en 5 secondes. Moins d'éléments, plus d'espace, rien de décoratif.
Ces règles valent pour tout le site. Les pages publiques les appliquent déjà ; les pages de l'appli suivront.
Le code commun est dans `app/globals.css` (bloc « Design simple ») et `components/AppShell.tsx` (`publicPage`).

## Couleurs
- **Fond** : bleu nuit `#011B46` (sombre) ou blanc bleuté `#F7FAFE` (clair). Un aplat, sans dégradé ni lueur.
- **Texte** : `--ff-fg` (principal), `--ff-fg-2` (secondaire). Jamais de texte gris posé sur du bleu.
- **Un seul bleu d'accent** `--ff-accent` (#46B5FF) : le bouton principal et rien d'autre de décoratif.
  Liens dans le texte : `--ff-accent-strong` (contraste AA sur le fond).
- Vert = bonne réponse, rouge = erreur. Aucune autre couleur.

## Texte
- Polices du site : Bricolage Grotesque (titres), Figtree (texte).
- **3 tailles de titre** : `h1` 32→48 px (`.ff-title`), `h2` 24→32 px (`.ff-h2`), `h3` 20 px.
- Texte courant : 17 px (16 px minimum partout), interligne 1,6, lignes de 65 caractères maximum.
- Un seul `h1` par page, titres dans l'ordre (h1 → h2 → h3).

## Composants
- **Bouton principal** `.ff-primary` : pilule bleue unie, texte bleu nuit, 48 px de haut. **Un seul par écran.**
- **Bouton secondaire** `.ff-secondary` : même forme, fond transparent, bordure fine.
- **Lien** : souligné, couleur d'accent lisible.
- **Champ** `.ff-field` + étiquette `.ff-label` toujours visible ; erreur `.ff-error` sous le champ,
  reliée par `aria-describedby`, avec la solution (« Écris ton adresse email. Exemple : … »).
- **Cartes** : seulement pour montrer un objet réel (une fiche). Pour le reste : de l'espace et un filet.
- Bordure ou ombre seulement si elle sert (séparer, montrer qu'on peut cliquer). Pas de halo.
- Icônes : SVG simples, jamais d'emoji.

## Mouvement
- La mascotte (la raie) et le bleu nuit portent l'ambiance océan. Pas de décor animé.
- **Une animation courte et utile par page au maximum** (ex. : la réponse d'une question qui s'ouvre).
  Jamais déclenchée par le défilement.
- Retour au toucher : le bouton s'enfonce un peu (`scale(.97)`, 140 ms).
- `prefers-reduced-motion` : tout mouvement est coupé.

## Mots
- Phrases courtes, tutoiement, verbes d'action : « Colle ton cours », « Crée ta fiche ».
- Pas de jargon, pas de formule creuse (« révolutionne », « booste », « en profondeur »).
- Chaque bouton dit ce qu'il fait. Chaque erreur dit quoi faire.
- Aucun faux chiffre, faux avis ni faux logo.

## Accessibilité (à vérifier à chaque page)
- Contraste AA : 4,5:1 pour le texte, 3:1 pour les gros titres et les contours de champs.
- Tout marche au clavier, focus visible (contour bleu 3 px), ordre de tabulation logique.
- Zones tactiles d'au moins 44 px. Aucun défilement horizontal à 360, 390 et 768 px.
- Images utiles : texte alternatif. Décors : `aria-hidden`.
- Contrôle automatique : `node scripts/audit-public.mjs captures/<dossier>` (axe + captures + poids).
