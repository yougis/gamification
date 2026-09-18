## Why

Deux corrections bloquent l'usage quotidien du Studio : le jeu en cours d'édition est perdu au rechargement (aucune sauvegarde locale du brouillon), et le mode clair est partiel (fonds et quelques textes seulement — le graphe, ses nœuds/arêtes et les tokens Tailwind restent en couleurs sombres).

## What Changes

- **Autosave du brouillon** : le Studio sauvegarde en continu le jeu en cours d'édition (`game` + `meta`, positions des nœuds, sélection) dans `localStorage` sous une clé versionnée ; au chargement, le brouillon est restauré ; nouveau jeu / import valide remplace le brouillon ; action explicite pour l'effacer.
- **Thème clair complet** : le mode clair couvre toute l'interface, y compris le graphe ReactFlow (fond, nœuds, libellés, arêtes, contrôles, minimap) et les tokens Tailwind (`bg-surface`, `text-…`, `border-rule`, etc.), sans altérer le branding du jeu.
- Les deux corrections restent 100 % locales (aucune requête réseau, rien dans le JSON exporté).

## Capabilities

### New Capabilities

- `studio-draft-autosave`: sauvegarde/restauration locale du jeu en cours d'édition (clé versionnée, debounce, restauration au chargement, remplacement à l'import/nouveau jeu, effacement explicite, dégradation si stockage indisponible).

### Modified Capabilities

- `studio-theme-toggle`: le thème clair SHALL couvrir le graphe (nœuds, libellés, arêtes, fond, contrôles, minimap) et les tokens Tailwind ; ajout d'exigences de couverture totale et de non-régression du thème sombre.

## Impact

- **Code affecté** : `studio/src/App.tsx` (état `st.present`, positions, `sel`, effet d'autosave, `colorMode` ReactFlow), `studio/src/styles/theme.css` (règles `.theme-light` pour nœuds/arêtes ReactFlow), `studio/src/styles/tailwind.css` (tokens clair/sombre), éventuellement `NodeList.tsx` / `MapView.tsx` si couleurs codées en dur.
- **Aucun changement de schéma graphe** (Noeuds/activation/registre/branding/manifest) : rien à propager au runtime natif, à l'orchestrateur ni aux modules.
- **Aucune valeur réservée** (`CONDITIONAL`/`WINDOW`) ni nouveau module au registre.
- **Aucune connexion réseau** : `localStorage` uniquement, conforme au offline-first ; le JSON exporté ne contient aucune trace du thème ni du brouillon.
- **Coordination** : `studio-graph-selection` (in-progress) touche la même zone graphe de `App.tsx` — appliquer dans l'ordre ou rebaser.
