## Why

Le Studio GeoPlay utilise encore des propriétés CSS inline (`style={{}}`) et des variables CSS (`var(--ink)`) dans `App.tsx`, alors que **Tailwind CSS v4** est déjà configuré mais sous-utilisé. Le projet `exemple_Studio` (Figma Make) démontre un style cohérent et lisible en plein soleil avec un thème sombre, des classes Tailwind directes et une organisation en écrans. Cette refactorisation adopte ce même style dans le Studio GeoPlay pour unifier l'approche visuelle, réduire la dette technique CSS, et améliorer la lisibilité des composants.

## What Changes

- **Conversion des `style={{}}` vers des classes Tailwind** dans `src/App.tsx` (202 occurrences)
- **Ajout d'un `@theme` block** dans `src/styles/tailwind.css` définissant la palette de couleurs du Studio comme utilitaires Tailwind (`bg-panel`, `text-snow`, `border-rule`, etc.)
- **Adoption du thème sombre** du `exemple_Studio` : `#08090b` canvas, `#111318` panel, `#1e2228` rule, accent cyan `#00e5ff`
- **Maintien de ReactFlow** avec conversion des styles ReactFlow vers le système CSS/Tailwind existant
- **Conservation des classes CSS** `.btn`, `.champ`, `.carte`, `.puce` dans `theme.css` (pas de suppression ni de refonte des composants existants)

## Capabilities

### New Capabilities
- `studio-tailwind-theme`: Définition du thème Studio dans le `@theme` Tailwind v4 avec la palette de couleurs, les radii, les ombres et les tokens typographiques

### Modified Capabilities
- (aucune — le comportement spéc de l'interface est inchangé ; seule l'implémentation visuelle change)

## Impact

- **Fichiers modifiés** : `src/App.tsx` (conversion visuelle), `src/styles/tailwind.css` (ajout `@theme`), `src/styles/theme.css` (ajout tokens Tailwind si nécessaire)
- **Aucun changement de comportement** : les écrans, leurs fonctions, la validation, le graphe et le runtime restent intacts
- **Pas de changement de schéma** : le JSON du jeu, le modèle Draft-07 et le registre de modules ne sont pas impactés
- **Compatibilité ascendante** : le thème Victorien (`theme-victorian`) reste supporté via `data-theme="victorian"`
