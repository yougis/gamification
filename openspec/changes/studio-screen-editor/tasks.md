## 1. Viewports d'aperçu (design D1)

- [x] 1.1 Ajouter le sélecteur de viewport (phone portrait/paysage, tablette portrait/paysage) redimensionnant `PhoneCanvas` (375×667, 667×375, 768×1024, 1024×768) comme état local non persisté ; vérifier : bascule aux 4 formats sans modification du JSON (`tsc --noEmit` passe)
- [x] 1.2 Vérifier les zones `free` en coordonnées relatives aux 4 viewports ; vérifier : aucun widget hors-canvas après bascule

## 2. Texte éditable et déplaçable (design D2)

- [x] 2.1 Édition en place des widgets texte (`contentEditable` plaintext-only, commit blur/Entrée via `setScreenWidget`, Échap annule, sanitisation texte brut) ; vérifier : modification persistée, undo restaure, `tsc --noEmit` passe
- [x] 2.2 Drag-and-drop HTML5 des widgets texte intra-zone et inter-zones via opération MCP composée unique (un pas d'undo), poignées + boutons haut/bas en repli clavier ; vérifier : déplacement persistant des deux côtés, undo en un pas

## 3. Styles à 3 niveaux (design D3)

- [x] 3.1 Étendre le schéma Draft-07 (`global.screen.styles`, `node.screen.styles`, `widgets[].styles`, `additionalProperties: false`) ; vérifier : jeu avec les 3 niveaux accepté, champ inconnu rejeté
- [x] 3.2 Utilitaire pur `resolveStyles` (global → écran → widget, par propriété) + tests unitaires ; vérifier : scénario d'héritage du delta spec (Georgia / 18 / #ff0000)
- [x] 3.3 Trois sections dans `PropertiesPanel` (global / écran / contenu sélectionné) avec badges d'origine et champs hérités en lecture seule jusqu'à surcharge ; vérifier : surcharge écran visible comme héritée avant renseignement

## 4. Blocs mini-jeux (design D4)

- [x] 4.1 Bloc QCM : 2–6 réponses texte et/ou image, bonne réponse, explication, refus formulaire sans bonne réponse ni réponse vide ; vérifier : QCM mixte 4 réponses (2 images) enregistré, cas refus bloqués, `tsc --noEmit` passe
- [x] 4.2 Bloc puzzle image : asset source via `registerAsset`, découpe lignes × colonnes 2–6, aperçu grille (pièces = lignes × colonnes), refus hors bornes ; vérifier : 4×4 → 16 pièces, 1×1 refusé
- [x] 4.3 `global.minigameDefaults` (`maxAttempts` ≥ 1, `timeLimitSeconds` ≥ 0) + surcharge `module.data` + `resolveMinigameParams` (locale → globale → module) affichant valeur et origine ; vérifier : scénarios surcharge locale (30s) et défaut global (3 essais)
- [x] 4.4 Étendre les sous-schémas AJV QCM (`anyOf` texte/image, `maxAttempts`) et PUZZLE (`tileRows`/`tileCols` 2–6, `maxAttempts`, `timeLimitSeconds`) ; vérifier : questions existantes sans image toujours acceptées (non-régression `game-5poi.json`)

## 5. Vérification finale

- [x] 5.1 `npx tsc --noEmit` dans `studio/` ; vérifier : 0 erreur
- [x] 5.2 Rejouer les scénarios des 4 deltas (viewport, édition, DnD, héritage styles, QCM, puzzle, défauts) ; vérifier chaque scénario et consigner le résultat
