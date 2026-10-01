## Why

Positionner une étape sur la carte fait exploser le compteur C1 (~54 erreurs) pour deux causes réelles : le clic carte écrit une condition GEOFENCE sans `predicate` (requis par le schéma, que tous les autres chemins de création fournissent), et un quiz naît avec `questions: []` (rejeté par `minItems: 1`). Pire, l'unique condition invalide matche zéro branche `oneOf` et AJV rapporte chaque échec de chaque variante — du bruit, pas du diagnostic. Ce change éteint les causes et replie le bruit.

## What Changes

- **A — clic carte valide** : la branche création du clic `MapView` écrit `predicate: "enter"` (comme `conditionVide` et le preset « lieu ») ; le drag conserve le `predicate` existant via spread (déjà le cas, verrouillé par test).
- **B — repli oneOf** : quand une condition ne matche aucune variante du `oneOf`, le validateur émet UN constat structuré (« déclencheur 0 : aucune variante — manque probablement `predicate` », avec le champ manquant le plus probable nommé) au lieu des ~50 erreurs brutes AJV.
- **C — quiz seedé** : `donneesDefautModule("QUIZ")` inclut 1 question d'exemple (modifiable/supprimable comme toute donnée) ; le schéma `minItems: 1` est inchangé — un quiz naît valide au lieu de naître en erreur.

## Capabilities

### Modified Capabilities
- `game-validation`: regroupement des échecs `oneOf` en constat unique avec champ probable nommé (rendu via le glossaire fermé existant).

## Impact

- `studio/src/components/MapView.tsx` (1 ligne : branche création du clic) + `studio/src/game/module-screen-plugin.ts` (`donneesDefautModule`) : se conforment aux schémas existants, aucun changement de contrat.
- `studio/src/game/validate.ts` + `diagnostics.ts` (glossaire) : repli oneOf, jamais silencieux (constat + champ, pas de patch).
- Schéma Draft-07 inchangé (`predicate` requis et `questions minItems: 1` déjà en place) ; comportements joueur inchangés.
- Ne touche ni aux valeurs réservées ni au registre ; aucune dépendance à un change non archivé.
