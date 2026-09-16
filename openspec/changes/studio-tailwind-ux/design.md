## Context

Le Studio (`studio/src/App.tsx`, 2262 lignes) utilise des propriétés CSS inline (`style={{}}`) et des variables CSS personnalisées (`var(--ink)`, `var(--panel)`, etc.) définies dans `src/styles/theme.css`. Tailwind CSS v4 (`@tailwindcss/vite`) est déjà installé et configuré dans `vite.config.ts` mais l'App.tsx en utilise très peu (363 `className=`, majoritairement pour des utilitaires de base). Le projet `exemple_Studio` (716 lignes, Figma Make) démontre un style cohérent avec des classes Tailwind directes et un thème sombre.

## Goals / Non-Goals

**Goals:**
- Adopter le thème sombre et la palette de couleurs du `exemple_Studio` dans le Studio GeoPlay
- Convertir les `style={{}}` en classes Tailwind pour un code plus lisible et maintenable
- Ajouter un `@theme` block définissant les tokens du Studio comme utilitaires Tailwind
- Garder la structure actuelle (6 écrans, barre globale, ReactFlow) intacte

**Non-Goals:**
- Changer le comportement des écrans ou des composants (pas de refonte fonctionnelle)
- Supprimer ou réécrire les classes CSS `.btn`, `.champ`, `.carte`, `.puce` (elles restent en CSS)
- Changer le système de thème (Victorien reste supporté)
- Remplacer ReactFlow par un graphe SVG custom
- Changer les breakpoints ou ajouter de nouveaux composants UI

## Decisions

**1. `@theme` block dans `tailwind.css` plutôt que `tailwind.config.js`.**
Tailwind CSS v4 utilise le `@theme` directive dans le CSS (pas de fichier config JS). La palette sera définie dans `src/styles/tailwind.css`. *Pourquoi :* cohérence avec l'approche v4 du projet et pas de configuration supplémentaire.

**2. Palette de couleurs du Studio = palette du `exemple_Studio`**.
Les couleurs suivent le `exemple_Studio` : canvas `#08090b`, panel `#111318`, rule `#1e2228`, accent cyan `#00e5ff`, snow `#e8eaed`, fog `#6b7280`, dim `#374151`. *Pourquoi :* le `exemple_Studio` a prouvé que cette palette est lisible en plein soleil et cohérente.

**3. Conversion progressive écran par écran.**
L'App.tsx est convertie ordre : barre globale → Composer (canvas + inspecteur) → Importer → Relire → Valider → Prévisualiser → Exporter → Config. *Pourquoi :* la barre globale est le cœur de l'interface et sa conversion donne immédiatement un résultat visible.

**4. Classes CSS `.btn`, `.champ`, `.carte`, `.puce` conservées.**
Ces classes sont déjà définies dans `theme.css` avec des min-height 44px, des focus visibles, etc. Les remplacer par Tailwind ajouterait de la complexité sans gain. *Pourquoi :* ces classes sont déjà thématisées via les CSS vars et supportent le thème Victorien.

**5. Les `style={{}}` dans ReactFlow restent en CSS ou sont convertis via des utilitaires Tailwind.**
Les styles ReactFlow spécifiques (`.react-flow__node`, `.react-flow__edge`, etc.) restent dans `theme.css`. Les éléments ReactFlow stylisables via Tailwind seront convertis. *Pourquoi :* ReactFlow gère son propre SVG et certains styles nécessitent des sélecteurs CSS.

## Risks / Trade-offs

- [Risque] La conversion de 202 `style={{}}` peut introduire des bugs visuels subtils (positions, tailles, couleurs) → Mitigation : vérification `npx tsc --noEmit` + relecture visuelle écran par écran
- [Risque] Le thème Victorien (`theme-victorian`) peut ne pas être compatible avec les classes Tailwind ajoutées → Mitigation : le `@theme` block définit les tokens de base ; le thème Victorien override les vars CSS qui alimentent les classes `.btn`/`.champ`
- [Trade-off] Certains `style={{}}` complexes (calculs dynamiques, positions) restent en ligne → accepté car ils nécessitent une logique JS
- [Trade-off] La taille du fichier `App.tsx` peut augmenter légèrement avec des classes Tailwind plus longues → compensé par une meilleure lisibilité

## Migration Plan

1. Ajouter le `@theme` block dans `tailwind.css`
2. Convertir la barre globale et la navigation latérale (écran le plus visible)
3. Convertir Composer (canvas + inspecteur + config)
4. Convertir les écrans restants un par un
5. Vérification `npx tsc --noEmit` après chaque écran
6. Tests de regression visuels

**Rollback** : revert du commit UI. Le JSON produit reste identique. Les CSS vars restent dans `theme.css` pour les classes `.btn`/`.champ`/`.carte`/`.puce`.

## Open Questions

1. **Breakpoints personnalisés** : le Studio a besoin de breakpoints spécifiques pour le responsive ? Le `exemple_Studio` n'en utilise pas (il est plein écran). → Supposé : pas de breakpoints personnalisés pour l'instant.
2. **Typographie** : le `exemple_Studio` utilise `Inter` comme police d'affichage. Le Studio utilise `system-ui`. → Décidé : garder `system-ui` (offline-first, pas de police distante).
3. **Radii et espacements** : utiliser les valeurs actuelles de `theme.css` (`--rayon-s: 6px`, `--rayon-m: 10px`, etc.) ou celles du `exemple_Studio` ? → Décidé : garder les valeurs actuelles du Studio dans le `@theme`.
