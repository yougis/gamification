## Context

État observé dans `studio/src` : `App.tsx` persiste déjà `studio-theme`, `geoplay-import-history`, `geoplay-menu-replie` et `geoplay-layout-v1` en `localStorage`, mais jamais le jeu édité — `st.present` (`{ game, meta }`, undo/redo en mémoire via `useReducer`) est perdu au rechargement. Côté thème, `theme.css` ne redéfinit sous `.theme-light` que les variables `--surface*`/`--ink*`/`--line*`, tandis que `tailwind.css` fige ses tokens `@theme` en valeurs sombres (`--color-canvas: #08090b`, etc.) et que le `ReactFlow` du graphe tourne sans `colorMode` (rendu par défaut non piloté). Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Brouillon restaurable après rechargement, sans changer le format du JSON exporté.
- Thème clair couvrant 100 % de l'UI visible, graphe inclus, sans régression sombre.

**Non-Goals:**
- Sauvegarde multi-brouillons nommés, historique inter-sessions, sync serveur.
- Nouveau sélecteur de thème (système/auto) : on garde le toggle sombre/clair existant.
- Refonte des composants vers des tokens sémantiques : on mappe les tokens existants, sans renommage.

## Decisions

### D1 — Clé `geoplay-draft-v1` contenant `{ game, meta }`, positions exclues du payload

**Décision** : persister `{ game, meta }` (le `Snap` présent) sous clé versionnée `geoplay-draft-v1`, avec debounce ~500 ms. Les positions ReactFlow (`positions`, état de mise en page déjà persisté via `geoplay-layout-v1`) et la sélection ne sont pas incluses : les positions se recalculent par grille par défaut (`posEffective`) et la sélection est transitoire.

**Alternative écartée** : persister tout l'état `st` (passé/futur de l'undo) — rejeté car volumineux et l'historique d'annulation n'a pas de sens inter-sessions ; on restaure un `Snap` unique comme nouvel état initial (`past: []`, `future: []`).

### D2 — Restauration comme état initial, remplacement à l'import et au nouveau jeu

**Décision** : l'initialiseur du reducer lit `geoplay-draft-v1` (try/catch, validation minimale : `game.nodes` tableau) et l'utilise comme `present` initial. `importerFichier` réussi et « nouveau jeu » écrasent la clé au prochain tick d'autosave (l'état mémoire fait foi, l'effet persiste). Une action « Effacer le brouillon » supprime la clé et réinitialise sur `jeuVide()`.

**Alternative écartée** : bannière « Restaurer le brouillon ? » — rejetée car friction inutile ; l'import et le nouveau jeu restent les seuls remplacements, tous deux explicites.

### D3 — Piloter ReactFlow par `colorMode={theme}` + variables CSS, pas de styles inline par nœud

**Décision** : passer `colorMode` (`"dark"`/`"light"`, mappé depuis le thème) au `<ReactFlow>` de `zoneGraphe` et styler nœuds/arêtes/libellés/minimap/contrôles via les règles `.studio-flow` de `theme.css` en variables (`var(--surface)`, `var(--ink)`, …) pour les deux thèmes. Les nœuds restent au rendu par défaut (option « base pure » de `studio-graph-selection`) : aucun `style` inline de couleur par nœud.

**Alternative écartée** : `style` inline par nœud calculé depuis le thème — rejeté car duplique la logique de statut (draft/tirage/fin/erreur) déjà portée par les classes et casse la mémoïsation des `noeuds`.

### D4 — Rendre les tokens Tailwind sensibles au thème via surcharges `.theme-light`

**Décision** : conserver les noms de tokens (`bg-canvas`, `text-snow`, …) et ajouter sous `.theme-light` des surcharges des custom properties Tailwind correspondantes (ex. `--color-canvas`, `--color-snow`), de sorte que toutes les classes existantes basculent sans retouche des composants. Audit préalable par recherche des hex sombres (`#08090b`, `#111318`, `#181c24`, `#1e2228`, `#e8eaed`, `#6b7280`) hors branding jeu pour lister les usages à vérifier visuellement.

**Alternative écartée** : renommer vers des tokens sémantiques (`bg-app`, `text-primary`) — rejeté car renommage invasif sur tout le Studio pour un gain nul à comportement identique.

### D5 — Le branding jeu reste hors d'atteinte du thème Studio

**Décision** : les couleurs lues depuis le JSON (`game.branding`, couleurs de modules, aperçu `MapView`) ne référencent jamais les variables de thème Studio inversées ; la revue visuelle inclut un jeu avec `primaryColor` saturé (`#ff4400`) dans les deux thèmes pour verrouiller la non-altération.

## Risks / Trade-offs

- [Conflit d'édition avec `studio-graph-selection` (in-progress, même zone `App.tsx`)] → appliquer ce change après, ou rebaser ; les deux touchent `zoneGraphe` et `noeuds`.
- [Brouillon volumineux (gros jeux)] → `localStorage` ~5 Mo ; mitigation : try/catch à l'écriture + bandeau « sauvegarde indisponible », pas de retry agressif.
- [Restauration d'un brouillon invalide post-évolution de schéma] → garde-fou versionné (`-v1`, validation minimale) + fallback jeu vide, jamais de crash.
- [Contraste du mode clair (cyan `#00e5ff` sur fond clair)] → les accents sont conservés par spec, mais vérifier le contraste texte-accent en revue visuelle ; ajuster uniquement les usages texte, pas les variables d'accent.
