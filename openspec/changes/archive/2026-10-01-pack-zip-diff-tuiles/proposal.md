## Why

Le JSON seul ne fait pas un jeu jouable offline : images et tuiles de carte doivent voyager avec, mais l'export Studio ne produit aucun pack transférable (fichiers téléchargés un par un, aucun `.zip`), et mettre à jour un jeu installé exige aujourd'hui de tout réimporter. Il faut un pack unique transférable, des mises à jour différentielles (seuls les éléments modifiés voyagent), et un index spatial des tuiles permettant d'ajouter/retirer intelligemment des tuiles et de charger selon la zone.

## What Changes

- Export Studio « Pack complet (.zip) » : `game.json` + `manifest.json` + assets + tuiles + nouvel index `tiles.json`, en un seul fichier (taille affichée avant génération, assemblage en streaming).
- Nouveau `tiles.json` (compatible TileJSON : bornes, zooms, stratégie, liste `{z,x,y}`) : fait foi pour l'univers des tuiles (chargement intelligent viewport/radius, calcul des ajouts/retraits). Le `manifest.json` reste la source d'intégrité (SHA-256 par fichier).
- Mise à jour différentielle côté player : le player compare le manifest installé au manifest du nouveau pack (zip ou service) et n'applique que les différences (ajoutés/modifiés copiés, supprimés effacés, tout vérifié, bascule atomique). Le Studio produit toujours un pack complet ; aucun format de diff sur le fil.
- Import existant (fichier/URL/catalogue) réutilisé comme voie d'entrée des packs complets et des mises à jour.

## Capabilities

### New Capabilities
- `offline-tile-index`: index spatial `tiles.json` des tuiles d'un pack (univers, bornes, zooms, stratégie) pour chargement et diff intelligents.

### Modified Capabilities
- `offline-pack`: pack `.zip` transférable unique + mise à jour différentielle par comparaison de manifests (jeu, images, tuiles).
- `player-install`: ouverture et mise à jour depuis un pack complet (zip), avec contrôle de taille avant application.

## Impact

- Code : Studio (`mcp.ts` assemblage zip + `tiles.json`, écran Exporter avec taille), `PackManager` Android (application de diff, lecture `tiles.json`), shared (parsing `PackManifest`/`tiles.json` en commun si besoin).
- Schéma jeu inchangé ; `manifest.json` et `tiles.json` versionnés dans le pack (pas de migration de JSON auteur).
- Volumes : tuiles potentiellement lourdes — stratégies bbox/radius existantes + taille annoncée + confirmation au-delà du seuil existant.
- Non-couvert : rendu natif des tuiles (change dédié déjà acté), partage pair-à-pair, diff côté serveur.
