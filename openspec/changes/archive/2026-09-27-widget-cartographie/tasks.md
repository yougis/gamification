## 1. Schéma et types

- [x] 1.1 Étendre le discriminant Widget du schéma Draft-07 (`game-schema.json`) avec la variante `map` (`source`, `background` enum fermée, `poiStyle`, `volet`, `styles`, `additionalProperties: false`) + enum `source.kind` démarrant à `steps`
- [x] 1.2 Étendre l'union `Widget` de `studio/src/game/types.ts` (`MapWidget`, source, volet, bouton à état lié) sans toucher aux variantes existantes
- [x] 1.3 Revalider l'exemple `game-5poi.json` + un jeu fixture avec widget carte (couches 1+2 vertes, non-régression)

## 2. Validation applicative

- [x] 2.1 Avertissement `filter: all` + discovery non-`VISIBLE_NOW` (catégorie dédiée, nœud fautif nommé)
- [x] 2.2 Avertissement source steps sur jeu sans nœud éligible (HOME-seul), sans rejet
- [x] 2.3 Rejet kind `source` inconnu en C1 (couvert par 1.1, ajouter le cas au rapport de validation)

## 3. Studio auteur (canvas + propriétés)

- [x] 3.1 Renderer canvas statique du widget carte réutilisant le moteur carto (`MapView.tsx` : fond, marqueurs, cercles, sans interaction joueur)
- [x] 3.2 Panneau propriétés : source + filtre (mention d'éventement pour `all`), fond (choix fermé pack-only), icônes par état + reset unitaire, édition du volet — via opérations MCP nommées (undo/redo)
- [x] 3.3 Création du volet par défaut (texte + bouton à état lié) à la pose du widget, jamais réappliqué ensuite
- [x] 3.4 État fond uni + rappel non bloquant quand ni `global.map` ni `indoorPlans`

## 4. Rendu joueur (PWA + natif/Compose)

- [x] 4.1 Renderer PWA : fond pack offline, marqueurs + icônes d'état temps réel, cercles, position + trace GPX, sélection → volet (zéro event, vérifié au journal)
- [x] 4.2 Bouton volet `Ouvrir` (éligible, présentation sans event) / `Verrouillé` (désactivé, sans effet) ; POI non découvert = aucun marqueur
- [x] 4.3 Plein écran carte depuis HOME (remplace HOME, retour via entrée Accueil, un seul à la fois, inaccessible pendant modale ACTIVE)
- [x] 4.4 Parité Compose (même contrat, terminal simulé Studio comme référence d'attente)

## 5. Non-régression et compatibilité

- [x] 5.1 Jeux existants sans `map` : validation et rendus inchangés (0 erreur ajoutée)
- [x] 5.2 Widget `map` sur vieux moteur : placeholder non bloquant, partie continue
- [x] 5.3 `openspec validate --specs` vert + relecture des scenarios du change (chaque scenario = cas de test manuel)
