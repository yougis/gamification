## Why

Après une publication réussie, le médaillon affiche « 1 problème » alors que l'écran Valider liste 0 erreur : le compteur est calculé par parsing de texte libre (`rapport.filter(r => !r.includes(": OK"))`), donc tout message de succès (« Publié : … code … », « Export OK : … ») est compté comme une erreur. Cela contredit la spec, qui définit la pastille comme le nombre total d'erreurs C1 + C2.

## What Changes

- Brancher le compteur de la pastille sur la même source que les listes de l'écran Valider (diagnostics C1/C2 de niveau erreur, jamais de parsing de texte libre) ; séparer l'état « rapport d'activité » (messages de succès) de l'état « erreurs ».
- Clarifier le libellé du manifest (« 0 asset » plutôt que « 0 fichier », `game.json` étant ajouté à la génération) pour lever l'ambiguïté constatée.
- Aucun changement de comportement de validation, d'export ou de publication.

## Capabilities

### Modified Capabilities
- `studio-authoring`: source du compteur de la pastille validation (diagnostics, pas texte libre) et libellé du compteur manifest.

## Impact

- `studio/src/App.tsx` : calcul du compteur + libellé (UI uniquement).
- Schéma graphe, validateur, export, catalogue, runtime : inchangés.
- Aucune valeur réservée touchée ; aucun réseau ajouté ; aucune dépendance à un change non archivé.
