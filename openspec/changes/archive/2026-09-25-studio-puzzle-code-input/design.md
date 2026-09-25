## Context

Voir proposal.md (Why). État actuel observé :
- `studio/src/components/wysiwyg/plugins/puzzle.tsx` : `PuzzleEditorPreview` (grille numérotée), `PuzzlePropertiesPanel` (image + découpe 2–6 + défauts globaux), `PuzzlePlayerRenderer` = alias de l'aperçu (non jouable). Branché dans `studio/src/game/modules.ts` (pattern QUIZ).
- `studio/src/game/schema/puzzle.json` : `tileRows`/`tileCols` 2–6, `maxAttempts`, `timeLimitSeconds`, `mode: slide|drag` (jamais consommé).
- CODE_INPUT : type condition (schéma inline + règle C2 `CODE_INPUT requiert un code`), entrée registre (`module-registry.ts`, `registry.json`) référençant `code-input.json` **absent**, aucun screenPlugin, aucun rendu joueur.
- Contrat `ModuleScreenPlugin` (`module-screen-plugin.ts`) : `editorPreview`, `propertiesPanel`, `playerRenderer(data, branding, experienceStyle, onComplete)`, `customizableStyles`, `defaultScreen`, `zoneNeeds`.

## Goals / Non-Goals

**Goals:**
- Puzzle jouable dans le Studio (preview + terminal « Jeux ») avec les deux mécaniques du schéma.
- Étape cadenas créable et jouable de bout en bout (Studio + validation + preview).
-Images découpées côté client sans nouveau pipeline d'assets.

**Non-Goals:**
- Persistance SQLite de la progression puzzle (socle natif, déjà spécifié côté runtime ; le Studio garde l'état en mémoire de session comme le simulateur actuel).
- Clavier physique du puzzle (l'accessibilité clavier du Studio passe par les contrôles natifs : tap-à-tap au clavier via focus + Entrée).
- Nouveaux assets cadenas (CSS/SVG uniquement).

## Decisions

- **Découpe par `background-position`.** Chaque tuile = `div` avec l'image source en fond, `background-size: cols*100% rows*100%` et position décalée par index d'origine. Aucun canvas, aucune génération de fichiers, aucun changement du pack. Alternative écartée : découper en fichiers au build (complexifie manifest + offline-pack pour zéro gain auteur).
- **Mélange Fisher-Yates avec garde anti-résolu.** Le mélange initial est rejeté s'il reproduit l'ordre résolu ; la graine reste locale (pas persistée : le runtime natif persistera, cf. Non-Goals).
- **`slide` par défaut, `drag` en glisser-déposer HTML5 tactile + souris.** `slide` = premier tap sélectionne (anneau visible), second tap échange ; `drag` = pointeur suit le doigt/souris puis ancre sur la tuile cible (événements pointeur, pas de lib). Le clavier utilise le chemin `slide` (focus + Entrée = tap).
- **CODE_INPUT calqué sur QUIZ.** Nouveau `plugins/code-input.tsx` avec les 3 composants + `codeInputScreenPlugin`, branché dans `modules.ts` sur l'entrée existante (une ligne, même pattern). Schéma `code-input.json` calqué sur `puzzle.json` (const version, `additionalProperties: false`, `if/then` essais ? non : champs simples + `maxAttempts`/`timeLimitSeconds` optionnels), monté dans `validate.ts` par `addSchema` + règle C2 module symétrique de la condition.
- **Cadenas CSS/SVG générique.** Corps + anse en divs/SVG inline, code masqué par pastilles, accents via `branding.primaryColor` avec repli couleur système. Aucun chemin d'asset dans le JSON.

## Risks / Trade-offs

- [Risk] `background-position` sur images pack (chemins locaux) : l'aperçu éditeur doit résoudre le même chemin que le joueur → Mitigation : réutiliser la résolution d'image existante des widgets image (pas de nouveau loader).
- [Risk] `code-input.json` : tout écart avec le pattern des 5 schémas casse la compile AJV → Mitigation : copier la structure `puzzle.json`, valider par `test:screen`/smokes existants.
- [Risk] Régression tsc (baseline ~99) → Mitigation : compteur avant/après, zéro nouvelle erreur.
