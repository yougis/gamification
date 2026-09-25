## 1. Puzzle — tuiles mélangées

- [x] 1.1 Remplacer la grille numérotée de `PuzzleEditorPreview` par l'image source découpée en tuiles (`background-position`) affichées mélangées (Fisher-Yates, garde anti-résolu) avec compteur, et vérifier visuellement le mélange + l'état vide sans image
- [x] 1.2 Extraire les utilitaires purs (découpe, mélange, test de complétion) testables sans React et vérifier chaque fonction par appel direct (mélange jamais résolu, complétion exacte)

## 2. Puzzle — déplacement et complétion

- [x] 2.1 Implémenter `PuzzlePlayerRenderer` interactif en `mode: "slide"` (tap-à-tap sélection + échange, clavier via focus + Entrée) avec complétion → `onComplete` et essais/temps → `onTimeout`, et vérifier une partie complète 3×3 dans le terminal « Jeux »
- [x] 2.2 Ajouter le `mode: "drag"` (glisser-déposer aux événements pointeur, tactile + souris) avec repli `slide` si `mode` absent, et vérifier le déplacement d'une tuile dans chaque mode

## 3. CODE_INPUT — schéma et validation

- [x] 3.1 Créer `studio/src/game/schema/code-input.json` (`code` requis non vide, `maxAttempts`, `timeLimitSeconds`, `hint`, messages, `additionalProperties: false`), le monter en AJV dans `validate.ts` comme les 5 schémas socle, et vérifier qu'un module sans `code` est rejeté avec le nœud nommé
- [x] 3.2 Ajouter la règle C2 module CODE_INPUT (symétrique de la condition) et vérifier le rejet + la traduction `erreurFR` le cas échéant

## 4. CODE_INPUT — screenPlugin cadenas

- [x] 4.1 Créer `plugins/code-input.tsx` (cadenas CSS/SVG, aperçu éditeur + panneau propriétés : code, longueur, indice, essais via défauts globaux + 9 familles) et le brancher dans `modules.ts`, et vérifier l'affichage dans le canvas sans placeholder
- [x] 4.2 Implémenter le rendu joueur (pavé de saisie, vérification, succès → `onComplete`, échec → essais puis `onTimeout`, accents branding) et vérifier une saisie complète dans le terminal « Jeux » avec un jeu sans asset

## 5. Non-régression

- [x] 5.1 Passer `tsc --noEmit` sans nouvelle erreur par rapport au baseline, les smokes dev/runtime/pack/screen verts, et rejouer les scénarios spec (mélange, slide, drag, complétion, code correct/incorrect, cadenas sans asset) en modes sombre/clair
