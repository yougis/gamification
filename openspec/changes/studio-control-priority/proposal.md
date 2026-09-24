## Why

Le Studio expose ~100 contrôles (78 boutons dans `App.tsx` + ~25 dans les composants) sans hiérarchie de priorité : le destructif (« Effacer brouillon ») côtoie le quotidien (« Aligner »), et des configurations spécifiques au terrain (rotation `masterId` = révocation radio, secours par code, overrides JSON, bbox/zooms bruts) trônent au premier plan des formulaires. L'auteur ne distingue plus ce qui fait avancer sa maquette de ce qui exige de comprendre le schéma ou casse la prod.

## What Changes

- **Épine officielle** : le `WorkflowStepper` 1→5 (Graphe → Épreuves → Relecture → Validation → Export, `ETAPES` dans `WorkflowStepper.tsx`) devient la référence de priorité de tout contrôle du Studio.
- **Tiers normatifs** : P0 (fait avancer l'étape courante, toujours visible), P1 (contextuel à la sélection, visible quand pertinent), P2 « Avancé » (exige le schéma ou à effet prod dangereux : JSON expert, rotation master, secours code, overrides, viewports d'aperçu, reset layout, effacement brouillon, triche preview) — replié par défaut.
- **« Avancé » = accordéon fermé** (composant `Accordeon` existant, badge d'état) en bas de chaque module/famille, + section avancée dans l'écran Config pour le transverse (bbox/zooms bruts, tileStrategy, glossaire verrouillé). Aucun nouveau pattern visuel.
- ** sanctuarisés tel quel** : menu principal de gauche (7 écrans), pastille validation, rails d'actions, tabs Inspecteur, accordéons « contexte seul » (changes précédents non régressés).
- Aucun changement au schéma de jeu, au graphe, à la validation bi-couche, aux opérations MCP, au runtime player.

## Capabilities

### New Capabilities

_(aucune — réorganisation de la présentation de comportements existants)_

### Modified Capabilities

- `studio-authoring`: chaque contrôle du Studio se voit attribuer un tier de priorité (P0/P1/P2) dérivé du WorkflowStepper ; les contrôles P2 vivent repliés dans des sections « Avancé » par module/famille (et section avancée de l'écran Config pour le transverse), sans changer leur effet.

## Impact

- **Code** : `studio/src/App.tsx` (familles Inspecteur, écrans Relire/Prévisualiser/Importer/Exporter/Config, barre globale), `studio/src/components/wysiwyg/*` (formulaires modules, panneaux position/carte), `studio/src/components/NodeList.tsx` (si re-triage nécessaire) — déplacements + accordéons, aucune logique métier touchée.
- **État** : réutilise la mémoire accordéons existante (`geoplay-accordeons-v1`) ; aucun nouveau persistant.
- **Vérification** : matrice contrôle→tier revue par écran, `tsc --noEmit` au baseline, smokes dev/runtime/pack/screen verts.
- **Aucun impact** : schéma Draft-07, graphe/orchestrateur, runtime player, packaging offline, opérations MCP.
