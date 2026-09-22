## Why

L'écran Composer du Studio est devenu illisible : chaque panneau (graphe, liste, détail) se pilote par trois commandes redondantes (bouton texte « Replier », bouton molette avec un sous-menu qui contient à nouveau « Replier », états repliés incohérents), et la validation est dupliquée entre un footer dans le Composer et l'écran Valider dédié. Les auteurs perdent du temps en navigation et en scroll dans des panneaux qui ne se rétractent jamais.

## What Changes

- **Règle de repli unique en cascade** : le graphe se rétracte vers la gauche (contre la navigation), la liste et le détail vers la droite, avec des rails empilés à droite dans l'ordre. Le panneau replié laisse un rail fin à son emplacement, les voisins s'étendent.
- **Chevrons à la place des boutons « Replier »** : chevron ancré au bord du panneau, sens = direction du mouvement (`>` pour replier vers la droite, `<` sur le rail pour déplier). Suppression de tous les boutons texte « Replier »/« Déplier »/« Détail ».
- **Rails repliés icône seule + tooltip** : même logique que la navigation des 7 écrans et les tabs de l'Inspecteur (aucun nouveau pattern visuel).
- **Suppression du bouton molette** : les actions de réglage déménagent — Recentrer/Aligner vers une mini-toolbar flottante contextuelle du graphe, réinitialisation des largeurs vers un double-clic sur le Splitter (découvrable via tooltip).
- **Validation hors du Composer** : le footer (`pied` + `listeErreurs`) déménage vers l'écran Valider ; il reste dans le Composer une pastille compacte (`⚠ N problèmes` / `✓ Valide`) cliquable vers Valider, placée dans la barre d'outils du graphe.
- **Composant `Accordeon` unique** : en-tête chevron + titre + badge résumé (compte, origine d'héritage, état), ouverture « contexte seul » à la sélection puis mémoire en localStorage. Appliqué au `PropertiesPanel` WYSIWYG, aux formulaires modules (quiz, puzzle) et aux sous-sections des familles de l'Inspecteur (les tabs à icônes des 9 familles sont conservés).
- Aucun changement au schéma de jeu, au graphe, à la validation bi-couche ni aux opérations MCP : pure refonte de présentation du Studio.

## Capabilities

### New Capabilities

_(aucune — la refonte réorganise des comportements existants, elle n'introduit pas de capacité métier)_

### Modified Capabilities

- `studio-authoring`: l'organisation de l'écran Composer change (règle de repli en cascade vers les bords, rails icon-only, chevrons au lieu des boutons Replier, suppression de la molette et relocalisation de ses actions, pastille validation compacte au lieu du footer détaillé, sections du panneau détail et formulaires modules en accordéon « contexte seul » avec persistance locale).

## Impact

- **Code** : `studio/src/App.tsx` (layout composer, sections graphe/liste/detail/validation, état `mep.repliees`, molette, Splitter), `studio/src/components/NodeList.tsx` (props `boutonPlier`/`boutonMolette`/`panneauMolette`), `studio/src/components/wysiwyg/PropertiesPanel.tsx` + formulaires (`quiz.tsx`, `puzzle.tsx`, `minigame-params.tsx`, `*WidgetProperties.tsx`, `ZoneProperties.tsx`, `ScreenProperties.tsx`, `TemplatePicker.tsx`), nouveau composant `Accordeon` (+ `RailReplie` si non trivial), écran Valider (accueil du footer migré).
- **État persisté** : clé localStorage existante étendue (sections accordéon en plus de `repliees`) — format rétro-compatible (clés absentes = défauts).
- **Aucun impact** : schéma Draft-07, graphe/orchestrateur, runtime player, packaging offline, opérations MCP (mêmes `editGame`/`edit`, seule la présentation change).
