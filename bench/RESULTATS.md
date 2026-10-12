# Banc d'essai FishFlow — ancien moteur contre nouveau moteur

Mesuré le 12/10/2026 sur 10 vrais cours très différents + 1 photo de notes manuscrites
(textes Wikipédia, coupés à la taille d'un vrai cours : 7 000 à 15 000 caractères, 55 000 pour l'histoire en Pro).

**Correcteur** : gpt-5-mini (plus fort que le moteur), avec une liste figée de 15 à 45 notions clés par cours.
Il note chaque fiche contre le cours :

- **couverture** : % des notions clés présentes ;
- **profondeur** : % des notions clés vraiment expliquées (pas juste citées) ;
- **complétude** : 0 absente, 1 citée, 2 expliquée, ramené sur 100 ;
- **faits exacts** : nombre d'informations du cours, justes, contenues dans la fiche ;
- **exactitude** : % des affirmations de la fiche qui sont bien dans le cours (rien d'inventé, rien de faux) ;
- **cartes / quiz** : % de flashcards et de questions justes et bien posées.

## Moyenne sur les 11 cas

| | Ancien | Nouveau | Gain |
|---|---|---|---|
| Couverture | 59,8 % | 98,9 % | ×1,65 (plafonné à 100 %) |
| **Profondeur** | 24,7 % | 97,6 % | **×4,0** |
| Complétude | 42,3 | 98,3 | ×2,3 |
| **Faits exacts dans la fiche** | 8,5 | 55,5 | **×6,6** |
| Exactitude | 93,5 % (6 erreurs) | 99,7 % (2 erreurs) | meilleure |
| Longueur de la fiche | ~175 mots | ~1 930 mots | ×11 |
| Flashcards justes | 94,5 % (6,5 cartes) | 97,6 % (14 cartes) | |
| Quiz juste | 87,1 % (6,9 questions) | 96,7 % (8,7 questions) | |
| Temps | ~9 s | ~32 s (65 s pour 55 000 caractères) | |
| Coût OpenAI | ~0,1 centime | ~2,5 centimes (12 centimes pour 55 000 caractères) | |

La couverture ne peut pas être multipliée par 4 : l'ancien moteur citait déjà 60 % des notions (souvent en un mot).
Le gain se voit sur la profondeur (×4) et sur la quantité d'informations justes (×6,6).

## Détail par cours (nouveau moteur, gpt-4.1-mini)

| Cours | Complétude avant → après | Faits avant → après | Erreurs avant → après | Verdict |
|---|---|---|---|---|
| Photo de notes (SVT, la cellule) | 53 → 100 | 6 → 20 | 3 → 0 | Bien |
| Histoire — Révolution française (55 000 car.) | 31 → 100 | 7 → 150 | 0 → 0 | Bien |
| Code de la route — priorités | 33 → 100 | 9 → 50 | 1 → 0 | Bien |
| Biologie — photosynthèse | 36 → 96 | 10 → 55 | 1 → 0 | Bien |
| Droit — classification des contrats | 33 → 98 | 10 → 61 | 1 → 0 | Bien |
| Maths — Pythagore | 52 → 93 | 10 → 40 | 0 → 0 | Bien |
| Informatique — tri rapide | 41 → 100 | 10 → 31 | 0 → 0 | Bien |
| Économie — l'inflation | 35 → 96 | 7 → 48 | 0 → 0 | Bien |
| Philosophie — la caverne | 60 → 98 | 9 → 54 | 0 → 0 | Bien |
| Littérature — Le Petit Prince | 38 → 100 | 8 → 65 | 0 → 2 | Moyen (2 dates confondues) |
| Anglais — faux-amis | 53 → 100 | 7 → 36 | 0 → 0 | Bien |

## Choix du modèle (même moteur, 2 cours)

| Modèle | Complétude | Exactitude | Coût par fiche |
|---|---|---|---|
| gpt-4o-mini | 68 | 96 % | ~0,7 centime |
| **gpt-4.1-mini** (retenu) | **97** | **98–100 %** | ~2,5 centimes |

gpt-4o-mini rate un tiers des notions et invente plus. gpt-4.1-mini coûte environ 3 fois plus, mais reste à quelques centimes par fiche.

## Ratés trouvés pendant les essais, et corrigés

1. Le contrôle « corrigeait » le cours avec ses propres connaissances (rond-point / giratoire) → règle « le cours fait foi ».
2. Sur des notes courtes, le moteur ajoutait des explications absentes du cours (rôle des chloroplastes…) → règle « si le cours ne fait que nommer, la fiche aussi ».
3. « L'essentiel en 5 lignes » arrivait parfois en un seul bloc → découpage automatique en 5 lignes.
4. Encadrés « À retenir » entièrement surlignés → 2 surlignages au plus par partie, aucun dans l'encadré.
5. Termes entre guillemets et tournures « IA » → mis en gras, tics retirés automatiquement.
6. « Régénérer » redonnait les mêmes flashcards → résultat volontairement différent.

## Refaire le banc d'essai

Avec une clé dans `.env.local` :

```
node --env-file=.env.local bench/run.mjs old
node --env-file=.env.local bench/run.mjs new
node --env-file=.env.local bench/judge.mjs old
node --env-file=.env.local bench/judge.mjs new
```

## Vérification de la version finale (4 cours relancés)

Photo 100 / 0 erreur · Code de la route 100 / 0 erreur · Maths 98 / 1 imprécision · Littérature 100 / 0 erreur (les 2 dates confondues ont disparu).
