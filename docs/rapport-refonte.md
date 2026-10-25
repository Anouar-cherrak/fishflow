# Rapport — refonte complète et sécurité (25/10/2026)

Branches : `refonte-complete` (design) et `securite-complete` (design + sécurité). Rien n'est fusionné dans `main`, rien n'est publié.
Aperçus Vercel (protégés par la connexion Vercel) :
- refonte : https://fishflow-5jpuddgpv-audia-team.vercel.app
- sécurité (contient aussi la refonte) : https://fishflow-s3dzt4i84-audia-team.vercel.app

Captures : `captures/refonte-avant/`, `captures/refonte-apres/` (76 chacune), comparaisons dans `captures/comparaison-refonte/` (dossier local, non publié).

## Ce qui a changé, page par page
- **Logo** : ta raie tracée en vectoriel (brand/raie.svg), nette de 16 px à l'écran entier ; logotype FishFlow ; favicon, icônes PWA, Apple, images de partage (accueil, tarifs, aide) régénérés par `node scripts/brand.mjs`.
- **Accueil** : surface (soleil ou lune et étoiles, vagues, poisson qui saute), puis banc de poissons, ta raie qui passe, méduses ; la lumière baisse en descendant. Section « Tes cours restent à toi », question sur les données, bulles qui suivent le doigt. Baudroie retirée à ta demande.
- **Chargement des fiches** : plein écran opaque, ta raie qui nage, 4 étapes cochées, barre qui ne dit jamais « fini » trop tôt, squelette de fiche, messages « c'est long », écran d'erreur avec Réessayer. La cause de l'effet « éclaté » est corrigée (elle piégeait aussi les fenêtres comme « Passer Pro »).
- **Générer** : réglages dans un volet replié, bouton visible sans défiler sur téléphone. Plus de fiche comptée deux fois par un souci réseau après création.
- **Fiche** : un seul bouton principal, « Supprimer » à part en rouge ; titres très longs plus petits.
- **Flashcards** : la carte se retourne ; les raccourcis clavier ← → marchent enfin (bug d'avant).
- **Mes fiches** : cartes compactes, toute la carte ouvre la fiche.
- **Onglets du bas** : une pastille glisse vers l'onglet ouvert.
- **Connexion / inscription** : logo et promesse, formulaire centré. **Tarifs** : questions sur Pro. **Pages légales** : sommaire. **Apprendre** : bulle plus petite sur téléphone.
- **Cache** : pages et routes du compte toujours « private, no-store » (prouvé par un test).

## Lighthouse avant / après (même machine, serveur local, meilleur de 2)
| Page | Mobile perf | LCP mobile | CLS | TBT | Ordi perf | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| Accueil | 95 → 94 | 2,84 → 2,99 s | 0 → 0 | 72 → 72 ms | 100 → 100 | 94 → 94 | 100 | 100 |
| Tarifs | 96 → 95 | 2,81 → 2,86 s | 0 → 0 | 27 → 62 ms | 100 → 100 | 95 → 95 | 100 | 100 |
| Connexion | 96 → 96 | 2,81 → 2,84 s | 0 → 0 | 23 → 39 ms | 100 → 100 | 94 → 95 | 100 | 100 |
| Générer | 97 → 97 | 2,56 → 2,57 s | 0 → 0 | 46 → 45 ms | 100 → 100 | 94 → 94 | 100 | 63 (noindex voulu) |
| CGU | 97 → 96 | 2,65 → 2,71 s | 0 → 0 | 24 → 42 ms | 100 → 100 | 94 → 94 | 100 | 100 |

Honnêtement : les objectifs « mobile ≥ 95 et LCP < 2,5 s » ne sont pas atteints **en local**, ni avant ni après (mon serveur local n'a ni CDN ni compression de Vercel ; en ligne, le site faisait 100 avec un LCP de 1,2 à 1,7 s). L'accessibilité ne peut pas dépasser 94-95 tant que le zoom est bloqué (audit `meta-viewport`, ton choix). Fluidité : 60 images/s au défilement de tout l'accueil, 55 avec un processeur 4× plus lent, aucune tâche bloquante.

## Tests
- `npm test` : 31 tests, 30 réussis, 1 optionnel (en-têtes réels, CACHE_HTTP=1 : réussi aussi).
- `npm run test:e2e` : 56 parcours Playwright (iPhone, Android, ordinateur × clair, sombre) réussis sans nouvelle tentative : inscription, connexion, déconnexion, génération, erreur + Réessayer, flashcards, quiz, paiement simulé, accessibilité axe, clavier. Serveur simulé dans le navigateur (aucun vrai compte, e-mail ni paiement). Moteur Chromium : le vrai Safari n'est pas testé.
- lint : 0 erreur (7 avertissements, tous dans des fichiers d'avant) ; typecheck et build : OK.
- Relecture par un agent indépendant : 3 points importants corrigés (fiche comptée deux fois, fenêtre de chargement au clavier, partage — partie SQL à faire par toi).

## Sécurité (branche securite-complete) — audit par l'agent security-auditor
Critique : 0 prouvé. Élevé : 1. Moyen : 8. Faible : 13. Aucune clé trouvée dans le code ni l'historique.
Corrigé dans le code (avec tests) : cours d'origine retiré des liens partagés, suppression de compte qui ne laisse plus un abonnement actif, adresse de retour du mot de passe oublié fixe, lecture d'IP unique, déconnexion qui vide le navigateur, bouton « Gérer les cookies », export RGPD complet, limite de taille en régénération, journaux sans détails.

**Appliqué après ton accord (25/10, soir)**, avec tests :
1. Connexion : blocage à 3 erreurs pour « ce compte depuis cette adresse », 10 pour le compte depuis n'importe où, 10 par adresse IP. Un inconnu ne peut plus bloquer ton compte avec 3 faux mots de passe. Code d'inscription : toujours 3 erreurs par compte.
2. Compteurs en panne (base qui ne répond pas, ou SQL de sécurité absent) : connexion, codes et e-mails refusés 1 minute au lieu de tout laisser passer. **Attention : si securite-2026-10.sql n'est pas installé, plus personne ne pourra se connecter.** Vérifie la partie 1 du SQL AVANT de publier.
3. Paiement : le client Stripe existant est réutilisé, un 2e abonnement est refusé tant que le premier tourne, et un double clic dans la même minute ouvre la même page de paiement.
4. Moteur : le cours (et la fiche, pour les régénérations) arrive dans un message séparé des consignes, présenté comme de la matière à réviser ; les phrases du cours qui ressemblent à des ordres sont ignorées. Les consignes du moteur sont inchangées, le cache OpenAI est gardé.

**Encore en attente** : CAPTCHA Turnstile (à activer d'abord dans Supabase, puis je branche le code).

## Ce que TU dois faire (étape par étape)
**Supabase** (SQL Editor) : coller la partie 1 de `supabase/securite-2026-10-25.sql` et m'envoyer le résultat. S'il manque des fonctions, coller `securite-2026-10.sql` et `limites-2026-10.sql`. Puis partie 2 (index unique du partage, et `data - 'sourceText'` dans `get_shared_fiche`). Ensuite, dans Auth : Turnstile (Bot protection), limites (Rate limits), « Leaked password protection », « Secure password change », URL du site `https://fishflow.fr` et seulement tes domaines en redirection ; lancer Security Advisor ; vider `cours-uploads` s'il ne sert plus.
**Stripe** : webhook sur checkout.session.completed, customer.subscription.created/updated/deleted/paused/resumed, charge.refunded, charge.dispute.created ; portail avec annulation ; relances qui finissent en « canceled » ; activer Radar.
**Vercel** : garder la protection des aperçus ; secrets de production non disponibles en Preview ; ajouter `UNSUBSCRIBE_SECRET` et un secret admin différent de `CRON_SECRET`.
**OpenAI** : un budget mensuel maximum.
**npm** : 1 faille « élevée » dans `zod` (venu d'openai/eslint, non utilisé par ton code) ; `npm audit fix` sur une branche.

## Les 10 principaux risques restants
1. Scripts SQL de sécurité peut-être pas installés : toutes les limites seraient coupées.
2. Pas encore de CAPTCHA : on peut attaquer Supabase directement.
3. Une génération réelle n'a pas été testée avec la nouvelle séparation cours / consignes (pas de clé OpenAI ici) : faire 2 ou 3 fiches sur l'aperçu.
4. Si le SQL de sécurité n'est pas installé, la connexion sera refusée partout (choix « refuser en cas de panne »).
5. Le cours d'origine reste lisible via `get_shared_fiche` tant que la partie 2 du SQL n'est pas faite.
6. Performance mobile non mesurée sur Vercel (aperçu protégé) : à vérifier avec PageSpeed après publication.
7. Safari iPhone pas testé (seulement Chromium).
8. Animations de l'accueil jamais testées sur un vrai téléphone d'entrée de gamme.
9. Pas de plafond quotidien sur révisions, dossiers, examens créés depuis le navigateur.
10. Paiement et e-mails jamais testés de bout en bout avec de vraies clés de test (il me faudrait des clés Stripe « test »).

## À tester sur ton vrai téléphone (5 minutes)
1. Accueil en clair puis en sombre : défilement fluide jusqu'en bas, bouton visible tout de suite.
2. Créer une fiche : écran de chargement (raie, étapes, barre), puis la fiche.
3. Flashcards : la carte se retourne bien, rien ne saute.
4. Mes fiches : toucher une carte ouvre la fiche ; Renommer / Classer / Supprimer marchent.
5. Onglets du bas : la pastille glisse ; Ctrl/pincement : le zoom reste bloqué.
