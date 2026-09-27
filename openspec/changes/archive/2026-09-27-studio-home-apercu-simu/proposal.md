## Why

Le tableau de bord HOME se configure dans l'écran Configuration et ne s'aperçoit qu'en texte statique (change archivé `studio-home-accueil`), loin du graphe où l'auteur travaille — et loin de l'essai en cours, seul endroit où temps, rebours et états prennent vie. L'auteur doit voir l'écran global là où il compose (volet des étapes, séparé des étapes car global) et le voir vivre pendant l'essai (rebours qui défilent, états qui changent aux complétions).

## What Changes

- **Toggle « activer home » dans le volet des étapes** : à côté des actions d'ajout d'étape, un bouton bascule qui pose/retire `HOME` dans `global.presentation` via l'opération MCP `setPresentation` (traçée undo/redo, comme les cases de Configuration). Actif = l'entrée d'aperçu apparaît ; inactif = elle disparaît.
- **Entrée d'aperçu « écran global — Accueil »** : section épinglée et visuellement distincte en tête du volet des étapes (pas un nœud : ni sélection multiple, ni suppression, ni arête, ni présence au graphe, ignorée par validation/export). Un clic y sélectionne l'aperçu (pseudo-sélection, jamais un `sel` de nœud).
- **Aperçu visuel branché simu** : dans l'écran Prévisualiser, le tableau est rendu visuellement à partir de l'état d'essai (`done`, tirages, temps `dtMin`, file, actif) avec les mêmes helpers que le player (`timerRemainingMs`, états moteur) : les rebours défilent avec le temps simulé, les POI passent à « fait » aux complétions, l'ouverture proposée suit la tête de file. Le mini-aperçu du volet reste statique (t=0, carte d'identité).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: toggle Home et entrée d'aperçu écran global dans le volet des étapes ; aperçu visuel du tableau branché sur l'essai en Prévisualiser.

## Impact

- **Code** : Studio uniquement (`NodeList` + `App` : toggle, entrée, pseudo-sélection ; écran Prévisualiser : rendu simu via helpers existants `inventory.ts` + `evaluate`). Schéma graphe inchangé, JSON joueur inchangé (l'entrée n'écrit rien).
- **État simu** : lecture seule de l'essai existant ; l'aperçu n'écrit jamais (ni JSON, ni simu).
- **Hors périmètre** : personnalisation visuelle du tableau (couleurs, ordre) ; aperçu player réel (PWA/natif inchangés).
