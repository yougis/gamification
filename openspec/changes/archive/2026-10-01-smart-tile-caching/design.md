## Context

Le Player GeoPlay stocke les tuiles cartographiques offline dans le pack via le manifest `global.map`. Actuellement, la bbox est définie manuellement par l'auteur dans le JSON. En mode indoor, des tuiles sont téléchargées alors qu'aucune carte n'est nécessaire. Pour les jeux outdoor, la bbox est souvent trop large, gaspillant du stockage sur mobile.

Le système de cache actuel dans `pack.ts` vérifie le SHA-256 par fichier et supporte le différentiel, mais n'a pas de logique de sélection des tuiles à inclure, ni de menu auteur dédié, ni de persistance serveur des packs générés.

Voir proposal.md (Why) pour la motivation et specs/offline-pack/spec.md pour le contrat comportemental (menu, cache serveur, multi-cache, liaison Fond).

## Goals / Non-Goals

**Goals:**
- Centraliser toute la configuration tuiles dans un menu Studio « Packs de carte » (zéro JSON manuel).
- Mettre en cache côté serveur les packs générés, téléchargeables avec les jeux JSON.
- Gérer plusieurs caches par projet : liste, suppression confirmée, désignation d'un unique pack actif (`global.map.tilePackId`).
- Réutiliser le Fond existant `"tuiles du pack"` du widget map comme point d'accès, sans nouvelle valeur.

**Non-Goals:**
- Téléchargement dynamique de tuiles au runtime (offline-first = tout dans le pack).
- Cache des tuiles par le navigateur (c'est natif mobile).
- Support de providers de tuiles autres que MapLibre (la spec dit Mapbox exclu).
- Gestion du stockage (quota, nettoyage) — c'est le rôle de l'OS.
- Nouveau type de fond réseau ou nouvelle valeur `background` (réutilisation verbatim de `pack-tiles`).

## Decisions

### D1: tileStrategy et tilePackId comme champs dans global.map

**Choix:** `tileStrategy`, `tileRadiusMeters` et `tilePackId` sont des champs optionnels dans `global.map`, pas des champs séparés dans `global`.

**Raison:** Les stratégies et la désignation du pack sont une configuration de la carte, pas un concept séparé. Cela garde la hiérarchie cohérente, suit le contrat `offline-pack` existant et évite de creuser le schema. Absents = comportement actuel (compat ascendante).

**Alternative rejetée :** champs au niveau `global` (proposition initiale) — disperse la config carte en deux endroits et contredit la spec parente.

### D2: Calcul au Studio (MCP) pas au Player

**Choix:** La bbox optimale est calculée par le Studio lors de l'export (MCP `buildManifest`), pas par le Player au runtime.

**Raison:** Le Player est offline-first — il ne peut pas télécharger des tuiles supplémentaires après coup. La décision doit être prise au moment de la création du pack. Le Player lit simplement la bbox depuis le manifest.

### D3: Pré-chargement adaptatif par navigationModel

**Choix:** Le Player adapte la bbox de pré-chargement selon le `navigationModel` du jeu, pas selon l'`experienceStyle`.

**Raison:** Le `navigationModel` décrit comment le joueur se déplace (librement, guidé, etc.), ce qui détermine directement la zone à couvrir. L'`experienceStyle` concerne l'identité visuelle, pas la zone géographique.

### D4: Menu Packs de carte comme porte unique

**Choix:** Toute la configuration tuiles (provider, bbox, zooms, attribution, stratégie, radius, estimation, génération, progression) vit dans le menu « Packs de carte », via opérations MCP nommées annulables (undo natif). Pas de doublon dans la config globale ni d'édition JSON experte pour les tuiles.

**Raison:** Un seul endroit à documenter et tester ; les opérations existantes (`setTileStrategy`, `computeOptimalBbox`) y sont exposées au lieu d'être dispersées.

**Alternative rejetée :** éparpiller les champs dans la config globale — l'auteur ne verrait jamais l'estimation ni l'état de génération.

### D5: Cache serveur des packs générés

**Choix:** Chaque pack généré est persisté côté serveur (id, nom, snapshot config, manifest tuiles `{path, version, size, sha256}`, taille, date, statut) et proposé au téléchargement avec le `game.json`. L'export du jeu embarque les tuiles du pack actif désigné.

**Raison:** Évite de régénérer à chaque export, permet le partage (catalogue) et le différentiel existant fichier par fichier. Aucune exception à l'offline-first côté joueur : après téléchargement vérifié, tout est local.

**Alternative rejetée :** cache purement local navigateur — perdu au changement de poste, non partageable.

### D6: Multi-cache avec un seul actif

**Choix:** N packs par projet, un seul `tilePackId` actif. Suppression avec confirmation listant l'usage (actif ou non) ; supprimer l'actif retire la désignation sans invalider le jeu (repli fond uni). Désigner = poser `tilePackId` via MCP (undo).

**Raison:** L'auteur itère sur les emprises/zooms sans perdre les essais précédents, tout en gardant l'export déterministe (un seul pack fait foi).

### D7: Liaison via le Fond existant, sans nouveau background

**Choix:** Le dropdown Fond du widget map garde ses valeurs (`pack-tiles` / `indoor-plan` / `solid`). `pack-tiles` résout le pack actif (`tilePackId`) au rendu ; sans actif ni tuiles, repli fond uni avec marqueurs et position.

**Raison:** Zéro changement de schéma widget, zéro migration ; la spec `studio-screen-builder` (fonds pack-only) reste valide verbatim.

## Risks / Trade-offs

- **[Taille du pack]** → La réduction des tuiles peut être significative (50-80% pour les jeux indoor). Risque positif : moins de stockage, plus de rapidité.
- **[Précision du calcul]** → Le calcul bbox dépend de la précision des positions des POI. Si les positions sont approximatives, le pré-chargement peut être insuffisant. Mitigation : buffer de sécurité (200-500m) + estimation visible dans le menu avant génération.
- **[Compatibilité manifest]** → Ajouter `tileStrategy`/`tilePackId` au manifest ne casse pas les packs existants (champs absents = comportement actuel). Risque minimal.
- **[Performance calcul]** → Le calcul bbox est O(n) sur les POI. Pour des jeux raisonnables (<100 POI), c'est négligeable.
- **[Cache serveur]** → Stockage et invalidation côté serveur (packs orphelins après suppression de projet). Mitigation : suppression explicite + TTL/quotas documentés, jamais de purge silencieuse d'un pack actif.
- **[Désignation orpheline]** → `tilePackId` pointant vers un pack supprimé côté serveur. Mitigation : la suppression de l'actif retire la désignation dans la même opération ; à l'import, un id inconnu est ignoré avec avertissement (repli uni), jamais un rejet.
