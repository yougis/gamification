## Why

Recréer à la main des objets d'un jeu à l'autre (icônes, descriptions, réglages) est fastidieux et source d'incohérence. Le catalogue publie déjà des jeux complets (`listGames`/`fetchPack`) : l'écran Inventaire doit pouvoir y puiser un objet existant au lieu de le ressaisir.

## What Changes

- Dans l'écran Inventaire (dépend du change `studio-inventory-menu`) : action « Importer depuis le catalogue » → choix d'un jeu publié → choix d'un de ses objets → copie dans le jeu courant (nouvel `id` proposé si collision).
- L'icône/`image` de l'objet importé SHALL être ré-enregistrée dans le manifest du jeu courant (téléchargée depuis le pack source) ; l'objet importé conserve la provenance d'origine (`providerId`, licence, `sourceUrl` = jeu source) pour respecter l'exigence de traçabilité.
- L'objet importé est ensuite un objet comme les autres (éditable, référençable) : aucune liaison maintenue avec le jeu source.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : écran Inventaire — import d'objet depuis le catalogue.
- `game-inventory` : objet importé — provenance conservée, asset ré-enregistré.

## Impact

- Studio uniquement : écran Inventaire + `catalog.ts` (`fetchPack`) + circuit manifest existant + méta provenance.
- Schéma graphe inchangé (aucun nouveau champ) ; validateur inchangé (l'objet importé est validé comme un objet natif).
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Réseau : lecture seule vers le catalogue (jeux publiés) — **exception justifiée à l'offline-first** : phase auteur uniquement, jamais pendant le jeu joueur (le pack reste 100 % offline après export).
- Dépend du change `studio-inventory-menu` (écran hôte) non encore archivé.
