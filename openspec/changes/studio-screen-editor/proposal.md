## Why

Le WYSIWYG v1 ne prévisualise qu'un téléphone portrait figé, ne permet pas de réordonner les zones de texte au drag-and-drop, mélange styles globaux et styles d'écran sans distinction visible, et n'offre aucun bloc de configuration pour les mini-jeux (QCM, puzzle image) avec leurs paramètres propres. L'auteur ne peut donc ni valider le rendu tablette/paysage, ni régler finement textes et modules.

## What Changes

- **Viewports d'aperçu** : l'écran « screen » bascule entre téléphone portrait (375×667), téléphone paysage (667×375) et tablette iPad (768×1024 portrait / 1024×768 paysage). Le viewport est un état d'édition local, jamais persisté dans le JSON.
- **Édition de texte et drag-and-drop** : le contenu des widgets texte est éditable en place (clic → édition, Entrée/blur → persiste via MCP) et les zones de texte se déplacent par glisser-déposer intra-zone et inter-zones.
- **Trois sections de style distinctes** : (1) style global (tout le jeu, `global.screen.styles`), (2) style de l'écran courant (`node.screen.styles`, surcharge le global), (3) style du contenu sélectionné (widget : typo, taille, couleur, alignement, stocké dans `widgets[].styles`). La résolution est global → écran → widget, dernier niveau gagne.
- **Blocs de mini-jeux** : ajout d'un bloc module cohérent avec le type du POI (QCM, puzzle image, …). Chaque bloc expose sa configuration : QCM — nombre de réponses, réponses texte et/ou image, bonne réponse, explication ; puzzle image — image source, nombre de cases de découpe (ex. 3×3, 4×4).
- **Défauts globaux mini-jeux surchargeables** : `global.minigameDefaults` (`maxAttempts`, `timeLimitSeconds` par défaut pour tous les mini-jeux) ; chaque nœud MAY surcharger ces valeurs dans son `module.data`. Absence de surcharge = défaut global ; absence de défaut global = comportement actuel du module.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-screen-builder` : viewports portrait/paysage/tablette, édition texte en place, drag-and-drop des widgets texte, sections style global / écran / contenu sélectionné avec héritage global → écran → widget.
- `module-screen-plugins` : blocs de configuration mini-jeux dans le panneau de propriétés (QCM, puzzle image), champs de style et de mécanique, lecture des défauts globaux avec surcharge locale visible.
- `minigame-modules` : QCM — options de réponse texte et/ou image, nombre de réponses ; puzzle — découpe en N cases ; les deux — `maxAttempts` et `timeLimitSeconds` configurables.
- `game-schema` : Draft-07 — `styles` global (`global.screen.styles`), `styles` par écran (`node.screen.styles`), `styles` par widget (`widgets[].styles`) ; `global.minigameDefaults` ; extensions `data` QCM (options image) et puzzle (découpe).

## Impact

- **Code** : `studio/src/components/wysiwyg/` (`PhoneCanvas` viewports, `WidgetRenderer` édition en place + DnD, `PropertiesPanel` 3 sections, `plugins/` blocs QCM/puzzle), `studio/src/App.tsx` (état viewport local, câblage MCP), `studio/src/game/mcp.ts` (opérations screen existantes + patch styles), `studio/src/game/schema/` (sous-schémas QCM/puzzle, `minigameDefaults`, `styles`).
- **Schéma graphe** : extensions optionnelles uniquement (`styles`, `minigameDefaults`, champs `data`) — compatibilité ascendante, aucun consommateur cassé (Studio MCP, runtime natif, orchestrateur, packaging offline valident en AJV des deux côtés).
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun nouveau type au registre (QCM = `QUIZ`, puzzle = `PUZZLE` existants).
- **Réseau** : aucun — édition et prévisualisation 100 % locales, offline-first inchangé.
- **Dépendance** : s'appuie sur `studio-screen-builder` / `module-screen-plugins` (archivé 2026-09-18) sans les rouvrir.
