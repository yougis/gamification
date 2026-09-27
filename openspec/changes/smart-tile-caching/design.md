## Context

Le Player GeoPlay stocke les tuiles cartographiques offline dans le pack via le manifest `global.map`. Actuellement, la bbox est définie manuellement par l'auteur dans le JSON. En mode indoor, des tuiles sont téléchargées alors qu'aucune carte n'est nécessaire. Pour les jeux outdoor, la bbox est souvent trop large, gaspillant du stockage sur mobile.

Le système de cache actuel dans `pack.ts` vérifie le SHA-256 par fichier et supporte le différentiel, mais n'a pas de logique de sélection des tuiles à inclure.

## Goals / Non-Goals

**Goals:**
- Ajouter des stratégies de cache intelligent pour les tuiles cartographiques
- Calculer automatiquement la bbox selon la stratégie
- Exclure les tuiles non nécessaires (indoor, hors zone)
- Adapter le pré-chargement au mode de navigation

**Non-Goals:**
- Téléchargement dynamique de tuiles au runtime (offline-first = tout dans le pack)
- Cache des tuiles par le navigateur (c'est natif mobile)
- Support de providers de tuiles autres que MapLibre (la spec dit Mapbox exclu)
- Gestion du stockage (quota, nettoyage) — c'est le rôle de l'OS

## Decisions

### D1: tileStrategy comme champ dans global.map

**Choix:** `tileStrategy` est un champ optionnel dans `global.map`, pas un champ séparé dans `global`.

**Raison:** Les stratégies de tuiles sont une configuration de la carte, pas un concept séparé. Cela garde la hiérarchie cohérente et évite de creuser le schema.

### D2: Calcul au Studio (MCP) pas au Player

**Choix:** La bbox optimale est calculée par le Studio lors de l'export (MCP `buildManifest`), pas par le Player au runtime.

**Raison:** Le Player est offline-first — il ne peut pas télécharger des tuiles supplémentaires après coup. La décision doit être prise au moment de la création du pack. Le Player lit simplement la bbox depuis le manifest.

### D3: Pré-chargement adaptatif par navigationModel

**Choix:** Le Player adapte la bbox de pré-chargement selon le `navigationModel` du jeu, pas selon l'`experienceStyle`.

**Raison:** Le `navigationModel` décrit comment le joueur se déplace (librement, guidé, etc.), ce qui détermine directement la zone à couvrir. L'`experienceStyle` concerne l'identité visuelle, pas la zone géographique.

## Risks / Trade-offs

- **[Taille du pack]** → La réduction des tuiles peut être significative (50-80% pour les jeux indoor). Risque positif : moins de stockage, plus de rapidité.

- **[Précision du calcul]** → Le calcul bbox dépend de la précision des positions des POI. Si les positions sont approximatives, le pré-chargement peut être insuffisant. Mitigation : buffer de sécurité (200-500m).

- **[Compatibilité manifest]** → Ajouter `tileStrategy` au manifest ne casse pas les packs existants (champ absent = comportement actuel). Risque minimal.

- **[Performance calcul]** → Le calcul bbox est O(n) sur les POI. Pour des jeux raisonnables (<100 POI), c'est négligeable.
