## Why

Les rails repliés du Composer (change `studio-composer-ux`) sont des culs-de-sac : une seule icône qui ne fait que déplier, alors que chaque panneau possède des sous-menus iconiques (vues et pastille du graphe, 4 créations de la liste, 9 familles du détail). L'auteur doit rouvrir un panneau pour des actions qui n'en ont pas besoin (créer un Lieu, aller à Valider). Par ailleurs les boutons Aligner (et Recentrer) restent visibles dans les vues carte/screen où ils sont des no-ops (`fitView` ne s'applique qu'au canvas ReactFlow).

## What Changes

- **Rails d'actions** : le rail replié expose les icônes du panneau au lieu d'une icône unique (pattern *activity bar*, même logique icône + tooltip que la nav et l'Inspecteur). Deux comportements selon la nature de l'icône, sans exception :
  - *Icônes ACTION* (créer Étape/Lieu/Tirage/Fin, pastille → Valider) : agissent **directement, sans déplier** (via les handlers existants `ajouterEtape`, `setEcran`).
  - *Icônes VUE* (familles 1–9 du détail, vues Graphe/Carte/Screen) : **déplient + activent** la section (famille sélectionnée, vue commutée).
- **Contenu par rail (version curatée, zéro nouvelle icône)** :
  - liste : icône panneau + 4 créations (toutes les icônes existent : `etape`, `lieu`, `tirage`, `fin`) ;
  - détail : icône panneau + 9 familles quand un nœud est sélectionné (icônes existantes), repli icône seule sinon (placeholder, WYSIWYG) ;
  - graphe : icône panneau + 3 vues (`graphe`, `lieu`, `oeil`) + pastille.
- **Chevron supprimé des rails** : l'icône panneau déplie tel quel (tooltip « déplier ») ; les chevrons restent uniquement sur les panneaux ouverts (sens = partir). Les champs texte (recherche, filtre) restent panneau-ouvert uniquement.
- **Toolbar graphe conditionnelle** : Recentrer / Aligner H / Aligner V ne sont rendus que si `vueCentrale === "graphe"` (pastille + chevron restent visibles dans les 3 vues). Règle d'activation Aligner inchangée (< 2 sélectionnés = désactivé + tooltip).
- Aucun changement au schéma de jeu, au graphe, à la validation, aux opérations MCP, aux écrans mobiles (onglets, pas de rails).

## Capabilities

### New Capabilities

_(aucune — généralisation de patterns existants, aucun comportement métier nouveau)_

### Modified Capabilities

- `studio-authoring`: les rails repliés du Composer exposent les sous-menus iconiques du panneau (actions directes vs déplier-activer selon la nature de l'icône, contenus par rail ci-dessus, repli icône seule en l'absence de sélection) ; les actions de manipulation du canvas (Recentrer, Aligner) ne sont visibles qu'en vue graphe.

## Impact

- **Code** : `studio/src/App.tsx` (rails liste/graphe/détail, toolbar graphe conditionnelle, câblage sélection de famille depuis le rail), `studio/src/components/Repli.tsx` (API `RailReplie` étendue : liste d'actions icône + tooltip + état actif + handler), `studio/src/components/NodeList.tsx` (inchangé — les créations utilisent `ajouterEtape` existant).
- **Aucune icône à dessiner** (set existant suffisant, style stroke 1.7 inchangé).
- **État** : sélection de famille remontée ou exposée depuis l'Inspecteur vers le rail (détail de design, pas de nouveau persistant ; mémoire accordéons existante réutilisée).
- **Aucun impact** : schéma Draft-07, graphe/orchestrateur, runtime player, packaging offline, opérations MCP, écrans mobiles.
