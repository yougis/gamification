## Context

État observé : `PhoneCanvas` rend un format téléphone portrait figé ; les widgets se créent/déplacent par boutons (pas de DnD entre zones, pas d'édition en place) ; `PropertiesPanel` ne distingue pas styles globaux / écran / widget ; les plugins QCM/puzzle n'exposent aucun bloc de mécanique (réponses, découpe, essais, temps). Voir `proposal.md` et les 4 deltas de `specs/` pour les exigences.

## Goals / Non-Goals

**Goals:**
- Aperçu multi-viewport sans toucher au JSON.
- Styles à 3 niveaux avec héritage lisible dans l'éditeur.
- Blocs QCM et puzzle configurables, défauts globaux surchargeables.

**Non-Goals:**
- Moteur de layout responsive du Player (le JSON reste déclaratif, le natif interprète).
- Nouveaux types de modules au registre (QCM = `QUIZ`, puzzle = `PUZZLE`).
- Drag-and-drop tactile du canvas (souris d'abord, tactile en suivi).

## Decisions

### D1 — Viewports comme état local d'édition

**Décision** : `viewport` (`phone-portrait | phone-landscape | tablet-portrait | tablet-landscape`, défaut phone-portrait) vit dans un `useState` de l'écran screen, redimensionne `PhoneCanvas` (375×667, 667×375, 768×1024, 1024×768) et n'est jamais sérialisé. Les zones `free` utilisent des coordonnées relatives (%, existant) donc survivent au changement de format.

**Alternative écartée** : persister le viewport par écran — figerait la création dans un format et compliquerait le Player, pour aucun gain auteur.

### D2 — Édition en place + DnD HTML5 intra/inter-zones

**Décision** : le `TextWidget` rendu devient `contentEditable` au clic (commit sur blur/Entrée via `setScreenWidget`, Échap annule) ; le DnD utilise l'API HTML5 native (`draggable`, `onDrop` par zone, index cible) et réutilise les opérations MCP existantes (`setScreenWidget`, `moveScreenWidget` étendu inter-zones). Chaque geste reste une opération nommée annulable (undo/redo existant).

**Alternative écartée** : librairie DnD (dnd-kit) — dépendance lourde pour des listes verticales simples ; le natif suffit avec poignées de tri en repli clavier.

### D3 — Héritage styles global → écran → widget, résolution par propriété

**Décision** : `resolveStyles(global, screen, widget)` fusionne par propriété (dernier niveau renseigné gagne), exposée comme utilitaire pur testable. Le panneau affiche chaque niveau avec badge d'origine (global / écran / widget) et champs hérités en lecture seule jusqu'à surcharge. Schéma : `styles` optionnel aux 3 niveaux, `additionalProperties: false`.

**Alternative écartée** : cascade CSS côté Player — imprévisible hors navigateur et non validable en Draft-07 ; la résolution explicite est opposable.

### D4 — Blocs mini-jeux = formulaires du plugin, défauts = résolution locale → globale → module

**Décision** : chaque bloc est le `propertiesPanel` du plugin, étendu aux champs de mécanique ; `resolveMinigameParams(node, global)` retourne valeur + origine pour `maxAttempts`/`timeLimitSeconds`. Sous-schémas AJV étendus (`anyOf` texte/image, `tileRows`/`tileCols` 2–6, entiers bornés). Les questions existantes sans image restent valides (compatibilité ascendante).

**Alternative écartée** : défauts par preset `experienceStyle` — mélangerait identité visuelle et paramètres de jeu, contraire à la séparation navigation/présentation/style.

## Risks / Trade-offs

- [`contentEditable` vs React] → désync DOM/VDOM si l'utilisateur colle du HTML riche ; mitigation : `plaintext-only` + sanitisation à la persistance (texte brut).
- [DnD inter-zones et undo] → déplacer = remove + add (2 ops) ; mitigation : opération MCP composée unique `moveScreenWidgetAcross` pour un seul pas d'undo.
- [Images des réponses QCM dans le pack] → assets à référencer au manifest ; mitigation : réutiliser `registerAsset` existant, pas de nouveau pipeline.
- [Explosion des combinaisons viewport × zone `free`] → mitigation : coordonnées relatives + bornes 2–6 cases puzzle, revue visuelle aux 4 viewports dans les tâches.
