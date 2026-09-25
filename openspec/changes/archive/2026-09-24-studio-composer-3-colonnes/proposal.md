## Why

Le Composer affiche aujourd'hui `[graphe | liste] + detail`, avec les trois panneaux repliables. L'auteur perd le repère spatial : la liste des étapes (entrée de création et de navigation) flotte au centre-droit, le graphe peut disparaître entièrement une fois replié, et la zone centrale ne donne aucune garantie de stabilité visuelle.

## What Changes

- Ordre fixe en 3 colonnes sur grand écran (`lg+`) : **liste à gauche, graphe/carte/screen au centre, détail à droite**.
- Le panneau central n'est **jamais repliable** : pas de chevron, pas de rail, toujours visible en `flex-1` ; il s'agrandit quand les panneaux latéraux se réduisent.
- La liste reste repliable à gauche (rail fin : icône + 4 actions de création Étape/Lieu/Tirage/Fin conservées).
- Le détail reste repliable à droite (rail fin : icône + 9 familles de l'Inspecteur conservées, comportement inchangé).
- Les actions de l'ex-rail graphe (vues Graphe/Carte/Screen + pastille) migrent dans la toolbar du panneau central ; la pastille rail disparaît (doublon de la barre globale).
- Migration `geoplay-layout-v1` : clé `repliees.graphe` ignorée/nettoyée, forçage déplié au chargement.
- Vue étroite (`<lg`, onglets) inchangée.
- **BREAKING (UI uniquement)** : les scénarios « Repli en cascade », « Rail d'actions du graphe », « Toolbar graphe conditionnelle » de la spec sont réécrits ; aucun changement du schéma graphe.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: ordre des 3 panneaux du Composer, règle de repli (centre non repliable), rails latéraux et migration layout.

## Impact

- Code : `studio/src/App.tsx` (réordonnancement, suppression `repliees.graphe`, 2 splitters latéraux `liste|centre` et `centre|detail`), toolbar centrale (vues + pastille), nettoyage `geoplay-layout-v1`. `Repli.tsx` réutilisé tel quel.
- Aucun impact schéma graphe (Noeuds/activation/registre/branding/manifest) : pas de consommateur (Studio MCP, runtime natif, orchestrateur, modules, packaging offline) à mettre à jour.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : mise en page 100 % locale.
- Aucune dépendance à un change précédent non archivé.
