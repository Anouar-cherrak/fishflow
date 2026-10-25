# Refonte complète FishFlow — plan (25/10/2026)

Branche `refonte-complete` (partie de `fix-zoom-ctrl0`, qui contient le zoom Ctrl + 0). Sécurité : branche `securite-complete` partie de celle-ci.
Règles : même identité (océan, « La Descente », raie bleue #2AA9E8), moteur de fiches, limites (lib/limits.ts), Stripe et textes pédagogiques inchangés. Zoom toujours bloqué.

## 0. État des lieux (mesuré le 25/10)

Déjà bon, on garde : tokens dans `app/globals.css`, thème sans clignotement, ZoomGuard, Supabase chargé à la demande, décors en textures canvas après l'affichage, CSP/HSTS, limites de connexion, webhook Stripe.
La démo « La Descente » complète (poisson qui saute, banc, méduses, baudroie, fond marin) avait été prototypée le 19/10 (commit ea90289) puis retirée : la landing actuelle n'a gardé que la palette. On la reprend.

Lighthouse AVANT (serveur local `next start`, Chrome, meilleur de 2 passages) :

| Page | Mobile perf | LCP | CLS | TBT | Ordi perf | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| Accueil | 95 | 2,84 s | 0 | 72 ms | 100 | 94 | 100 | 100 |
| Tarifs | 96 | 2,81 s | 0 | 27 ms | 100 | 95 | 100 | 100 |
| Connexion | 96 | 2,81 s | 0 | 23 ms | 100 | 94 | 100 | 100 |
| Générer | 97 | 2,56 s | 0 | 46 ms | 100 | 94 | 100 | 63 (noindex voulu) |
| CGU | 97 | 2,65 s | 0 | 24 ms | 100 | 94 | 100 | 100 |

Accessibilité bloquée à 94-95 par un seul audit : `meta-viewport` (zoom bloqué, demande explicite). 100 est impossible tant que le zoom reste bloqué.

### Les 15 problèmes les plus gênants
1. **Chargement des fiches éclaté** : voile à 97 % qui laisse voir le formulaire derrière, raie PNG qui tourne en rond, barre qui plafonne à 92 % sans rien dire, aucun squelette, pas d'état « c'est long » ni « réessayer » dans l'écran.
2. **Logo en PNG** (128 px) posé en masque : flou sur écran Retina en grand, icônes 512 px floues, pas de version vectorielle.
3. **La Descente n'est pas là** : la landing est un dégradé bleu nuit uniforme, on ne « plonge » pas (pas de surface, pas de faune).
4. **Hero téléphone** : la scène produit est coupée à droite et tassée (« Fiche de révision » sur 3 lignes) ; on ne voit pas le geste « je colle → la fiche apparaît ».
5. Barre de la landing sur téléphone : le profondimètre prend la place du bouton « Créer un compte ».
6. **Page d'une fiche** : 4 styles de boutons en haut, « Supprimer » collé aux actions, hiérarchie confuse.
7. **Mes fiches** : chaque carte = gros bouton pleine largeur + 3 liens ; 4 fiches = 3 écrans ; illisible avec 50+ fiches.
8. **Générer** : formulaire long, bouton principal sous la ligne de flottaison sur téléphone ; réglages secondaires (niveau, longueur, sorties) au même niveau que le cours.
9. Barre d'onglets du bas flottante qui recouvre le contenu, onglet actif sans indicateur qui glisse.
10. **Flashcards** : la carte change de face d'un coup (pas de retournement).
11. Apprendre : la bulle décorative occupe la moitié de l'écran avant la question.
12. Thème clair : plaques blanches peu détachées du fond, titres de bloc petits et gris (Paramètres).
13. Tarifs (/pricing) : une seule carte Pro, sans comparaison avec Gratuit ni questions — différent de la landing.
14. Connexion / inscription : carte en haut et grand vide dessous sur téléphone, aucune ambiance.
15. Pages légales : longs textes sans sommaire.

## 1. Références (principes retenus, rien de copié)
- [Linear](https://linear.app) : montrer le produit tout de suite, en grand ; même rythme répété pour chaque bloc (titre, une phrase, visuel).
- [Apple AirPods Pro](https://www.apple.com/airpods-pro/) : une idée par section, introduite seule avec son visuel ; le détail part en notes ; le bouton principal revient à chaque étape.
- [Raycast](https://www.raycast.com) : démonstration par étapes lisibles (« Fetching… »), qui inspire les étapes du chargement.
- [Things (Cultured Code)](https://culturedcode.com/things/) : calme, chaque section a le même motif ; animations au service du geste.
- [Brilliant](https://brilliant.org) : produit d'apprentissage montré en action, ton chaleureux et encourageant.
- [Stripe](https://stripe.com) : l'action principale répétée en haut, au milieu et en bas ; preuves concrètes (chez nous : contenu réel, prix réels — aucun chiffre inventé).
- [Teardown Duolingo (Landing Doctors)](https://landingdoctors.com/es/teardowns/duolingo-com) : mascotte = accroche immédiate ; mais rendre clair ce que l'offre payante ajoute (ce que Duolingo floute).

## 2. Système de design (un seul endroit : `app/globals.css`, `:root`)
- **Couleurs** : celles d'aujourd'hui (eau claire / eau profonde, bouton #46B5FF, vert = bonne réponse). Ajout : paliers de profondeur `--ff-depth-0..4` (surface → abysses) partagés landing + appli.
- **Typo** : Bricolage Grotesque 800 (titres) + Figtree (texte). Logotype « FishFlow » en Bricolage, « Flow » en bleu, approche resserrée.
- **Espaces** : multiples de 4 (`--ff-s1..9`). **Rayons** : plaque 28/20, intérieur 18/14, champ 16, pilule.
- **Ombres** : `--ff-plate-shadow` (lumière d'en haut).
- **Mouvement** : `--ff-fast` 140 ms (appui), `--ff-base` 220 ms (transitions, pages), `--ff-slow` 420 ms (entrées), courbes `--ff-ease-out`, `--ff-ease-in-out`, `--ff-ease-drawer`. Transform et opacity uniquement.
- **Bibliothèques** : aucune ajoutée. Tout en CSS + un peu de JS natif (pas de Framer Motion : rien ici ne demande de ressort physique que CSS ne sache faire). Sonner n'est pas utilisé dans le projet.

## 3. Animations (passées au filtre « une animation = un but »)
| Où | But | Mouvement |
|---|---|---|
| Chargement des fiches | état + éviter l'attente muette | raie SVG qui nage (ailes en transform), 4 étapes cochées, barre liée aux étapes, squelette de la fiche qui se remplit ; message « c'est long » après 25 s ; erreur avec « Réessayer » |
| Flashcards | état (question → réponse) | retournement rotateY 420 ms ease-out ; réduit : fondu |
| Onglets du bas | position | pastille qui glisse sous l'onglet actif 220 ms |
| Landing : descente | explication / vie | lumière qui baisse avec le défilement, poisson qui saute (1 fois), raie qui passe, banc, méduses, baudroie au fond ; tout en `pointer-events: none`, pause onglet caché |
| Hero | explication | le cours se tape, le faisceau lit, la fiche se construit ligne à ligne, en boucle calme |
| Boutons | retour au toucher | scale 0,97 en 140 ms (déjà là, généralisé) |
| Fiche prête | joie (rare) | gerbe de bulles (déjà là) |

Rejetés : animer les listes de fiches à chaque visite (fréquent, ralentit), animer le menu au clavier, bouger des données qu'on lit (stats, tableau des prix).

## 4. Landing (de haut en bas)
1. Surface : ciel/soleil (clair) ou nuit (sombre), vagues, logo, promesse « Révise en profondeur. », champ « Colle ton cours » + bouton visibles sans défiler.
2. Démo du produit en action (cours → fiche).
3. Comment ça marche, 3 étapes.
4. Exemples : fiche, flashcards, quiz, révision du jour, Apprendre.
5. Tarifs honnêtes (Gratuit / Pro 4,99 €, jamais « illimité »).
6. Confiance : données privées, paiement Stripe, suppression du compte.
7. Questions fréquentes.
8. Fond de l'océan : appel final.

## 5. Ordre de travail (un commit par phase)
0-1 état des lieux + plan → 2 logo SVG, icônes, tokens → 3 landing → 4 appli (chargement d'abord, puis fiche, mes fiches, générer, flashcards, onglets, connexion) → 5 animations/fluidité → 6 perf + cache (+ test no-store) → 7 sécurité (`securite-complete`) → 8 Playwright, axe, relecture indépendante → 9 previews et rapport.

## 6. Tâches et critères d'acceptation (découpage /plan)
Chaque tâche = un chemin complet, vérifié avant de passer à la suivante.

| # | Tâche | Accepté quand | Vérification |
|---|---|---|---|
| T1 | Logo SVG tracé depuis `brand/logo-source.png` + logotype | SVG < 6 Ko, net à 16 px et 512 px, lisible clair/sombre | rendu PNG 16/32/192/512 regardé à l'œil |
| T2 | Icônes (favicon, 192, 512, maskable, Apple, OG) depuis le SVG | `scripts/brand.mjs` régénère tout ; manifest et metadata pointent dessus | build + capture de l'onglet |
| T3 | Chargement des fiches | plus de PNG ; 4 étapes ; squelette ; état long (> 25 s) ; erreur + Réessayer ; aucun saut (CLS 0) | Playwright : génération bloquée / en erreur / réussie, captures 390 et 1440 |
| T4 | Landing La Descente | bouton visible sans défiler à 390×844 ; décor `pointer-events:none`, pause onglet caché ; réduit = statique | Lighthouse mobile ≥ 95, CLS 0, captures |
| T5 | Pages de l'appli (fiche, mes fiches, générer, flashcards, onglets, connexion, tarifs) | aucune fonction perdue (liste des boutons/liens avant = après) ; zones ≥ 44 px ; texte ≥ 14 px | script de comparaison des liens/boutons, break-ui (0 / 500 fiches, titres très longs) |
| T6 | Cache | pages connectées et API : `private, no-store` ; statiques : immuables | test `tests/cache.test.mjs` |
| T7 | Sécurité (`securite-complete`) | chaque attaque corrigée a son test | `npm test` |
| T8 | Vérification | lint, tsc, build, tests, Playwright mobile/desktop clair/sombre, axe | sorties jointes au rapport |

Points d'arrêt : après T3 (le cœur de l'appli), après T4 (mesure Lighthouse), après T6 (mesure complète), avant tout push.
