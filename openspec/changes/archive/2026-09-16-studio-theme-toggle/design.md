## Context

Le Studio utilise un thème sombre imposé via CSS variables dans `theme.css` (`:root`). Un thème alternatif `.theme-victorian` existe déjà (Sherlock Holmes) — il prouve que le pattern de classe CSS sur `<html>` fonctionne. L'éditeur de nom du jeu (`game.branding.name`) n'est accessible que dans le panneau Configuration globale (écran dédié, depth 4 dans la hiérarchie). Le build error `mcp.ts` mentionné par l'utilisateur est résolu (`tsc --noEmit` passe).

## Goals / Non-Goals

**Goals:**
- Bouton de bascule sombre/clair dans la barre globale, persisté dans `localStorage`
- Thème clair via `.theme-light` sur `<html>`, variables CSS redéfinies
- Nom du jeu éditable inline dans la barre globale
- Compatibilité avec le thème existant `.theme-victorian`

**Non-Goals:**
- Pas de thèmes additionnels beyond dark/light (victorian reste un calque séparé)
- Pas de synchronisation du choix de thème entre appareils
- Pas de thème clair pour le Player mobile (uniquement Studio)

## Decisions

### 1. Pattern CSS : classe `.theme-light` sur `<html>`

**Choix** : ajouter `.theme-light { --surface: #fafafa; ... }` dans `theme.css`, identique au pattern `.theme-victorian`. Le body lit les variables depuis `:root` ou la classe, sans condition JS.

**Alternatives considérées** :
- `data-theme="light"` sur `<html>` → même résultat, mais `.theme-*` est le pattern existant (victorian)
- Variables en JS via `document.documentElement.style.setProperty` → plus de contrôle, mais casse le CSS-first et complique le victorian

**Rationale** : le pattern `.theme-*` est déjà validé par `.theme-victorian`, les variables sont resolves par CSS, pas besoin de JS pour le rendu.

### 2. Persistence : `localStorage` avec clé `studio-theme`

**Choix** : `localStorage.getItem("studio-theme")` au mount, `localStorage.setItem` au toggle. Pas de contexte React ni de provider — un simple `useState` + `useEffect` dans `App`.

**Alternatives considérées** :
- Context React + provider → surdimensionné pour 2 valeurs
- `sessionStorage` → perd le choix à la fermeture du navigateur
- Cookie → inutile, pas de serveur

**Rationale** : `localStorage` est simple, suffisant, et ne nécessite aucune dépendance.

### 3. Nom du jeu inline dans le header

**Choix** : champ `<input>` dans le header, entre le nom de l'écran et les stats de nœuds. Utilise le même `edit` + `setBranding` que le panneau. Le champ est caché si `relecture` (lecture seule).

**Alternatives considérées** :
- Bouton « Renommer » qui ouvre une modale → plus de clics, moins ergonomique
- Éditeur dans le panneau uniquement → déjà le cas, pas d'amélioration

**Rationale** : un input inline est le pattern le plus direct. Le `edit` callback gère déjà l'historique undo/redo.

### 4. Build error `mcp.ts` : déjà résolu

Le build error `type` sur `RequestInit` à la ligne 37 de `mcp.ts` est résolu (tsc passe). L'erreur concernait probablement un état antérieur du fichier. Aucune action requise.

## Risks / Trade-offs

- **[Risk] Clash avec `.theme-victorian`** → `.theme-victorian` a ses propres couleurs. Si un jeu utilise le thème victorian, le bouton de bascule ne doit PAS écraser le victorian. **Mitigation** : le bouton ne gère que dark/light. Le victorian reste un calque séparé configuré par le jeu. Si les deux sont actifs, `.theme-victorian` gagne (ordre dans CSS).

- **[Risk] Flash FOUC (Flash of Unstyled Content)** → au rechargement, le thème sombre s'applique d'abord, puis le thème clair est restauré depuis `localStorage`. **Mitigation** : script inline dans `<head>` qui lit `localStorage` avant le rendu du body, ou `document.documentElement.classList.add` dans un `<script>` bloquant. Au POC, le flash est acceptable (thème sombre par défaut = 0.1s de flash).

- **[Risk] Input nom dans le header vole l'espace** → le header est déjà dense (stats, undo/redo, export). **Mitigation** : input avec `max-width: 200px`, tronqué avec `text-overflow: ellipsis`.
