# Banc d'essai « Apprendre » — ancien contre nouveau

Mesuré le 12/10/2026 sur 20 questions très différentes (sciences, histoire, maths, informatique, psychologie,
questions écrites en langage SMS, actualité 2022, et une demande dangereuse qui doit être refusée),
lancées 5 par 5 sur l'adresse de test Vercel. Correcteur : gpt-5-mini (bench/judge-apprendre.ts).

## Ce qui n'allait pas

1. L'IA répondait de mémoire, puis cherchait Wikipédia après coup, seulement pour illustrer.
2. La recherche demandait le texte de 3 articles d'un coup sans `exintro` : Wikipédia ne renvoie alors le texte
   que du premier article. Les autres étaient jetés, puis un filtre IA écartait souvent le dernier.
   Résultat : 4 questions sur 19 seulement avaient une source pertinente.
3. Les renvois [1] [2] étaient prévus à l'écran mais jamais remplis.
4. FishFlow ne s'identifiait pas auprès de Wikipédia (règle de Wikipédia), et aucun nouvel essai en cas de refus passager.

## Nouveau fonctionnement (lib/apprendre-engine.ts)

1. L'IA prépare 2 recherches en français et 1 à 2 en anglais.
2. FishFlow charge le texte complet des meilleurs articles (anglais en renfort), garde les passages qui parlent de la question.
3. L'IA répond à partir de ces passages, avec un renvoi [n] par point ; seules les sources citées sont affichées.
4. Images libres choisies parmi les articles cités.

## Résultats (19 questions de connaissance + 1 refus)

| | Ancien | Nouveau (gpt-4.1-mini) | Essai gpt-4.1 |
|---|---|---|---|
| Réponses avec une source pertinente | 4 / 19 | **19 / 19** | 19 / 19 |
| Points avec un renvoi [n] | 0 % | **99 %** | 99 % |
| Réponses avec image | 4 / 19 | **19 / 19** | 19 / 19 |
| Qualité (correcteur, /10) | 7,05 | 7,21 | 7,53 |
| Imprécisions relevées par réponse | 1,9 | 2,6 | 2,5 |
| Temps | 3 s | 5 s | 6 s |
| Coût par question | ~0,05 centime | ~0,2 centime | ~0,9 centime |
| Demande dangereuse | refusée | refusée | refusée |

Les « imprécisions » sont relevées par un correcteur très sévère : il s'agit surtout de simplifications
(« chaque participant a une copie du registre ») ou de détails présents dans Wikipédia. Les nouvelles réponses
sont plus précises et contiennent plus de faits, donc plus de choses à reprocher. gpt-4.1 complet améliore un peu
la qualité mais coûte 4,4 fois plus : gpt-4.1-mini est retenu.
