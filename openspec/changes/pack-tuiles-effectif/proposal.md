## Why

Le change `smart-tile-caching` a livré le menu « Packs de carte » (création, multi-cache, pack actif) mais le pack « généré » ne contient aucune tuile : `creerPack` n'enregistre qu'une fiche (bbox, zooms, estimation). En conséquence, le widget carte du Screen et l'aperçu Home restent schématiques même avec un pack actif, et le pack exporté n'embarque toujours aucune tuile. Ce change rend le pack effectif de bout en bout : câblage de l'actif dans les rendus, tuiles visibles en prévisualisation auteur, puis téléchargement réel des octets.

## What Changes

- **Phase A — cohérence** : `MapWidgetRenderer` (PhoneCanvas vue Screen + aperçu Home) consomme `fondEffectifWidget()` : pastille « pack actif » quand les tuiles de l'actif sont disponibles, repli fond uni + message sinon. Aucune nouvelle donnée.
- **Phase B — tuiles visibles en prévisualisation auteur** : le PhoneCanvas charge les tuiles via la source existante du Studio (proxy dev `/tiles`, en ligne) quand un pack actif existe, avec badge « aperçu en ligne » ; sans actif ni réseau, repli schématique inchangé.
- **Phase C — pack réel** : la génération télécharge les octets des tuiles (bbox × zooms du pack), le serveur les stocke avec leurs SHA-256, le manifest les référence fichier par fichier, l'export les embarque. Politique d'usage du provider (OSM) respectée : attribution obligatoire, throttle, pas de pré-chargement massif hors zone.

## Capabilities

### Modified Capabilities
- `offline-pack`: la génération produit de vrais octets de tuiles (téléchargement, stockage serveur, manifest, export) au lieu d'une fiche d'estimation.
- `studio-screen-builder`: l'aperçu auteur du widget carte reflète le pack actif (pastille/repli en phase A, tuiles réelles en ligne en phase B).

## Impact

- `studio/src/components/wysiwyg/widgets/MapWidgetRenderer.tsx` : phases A + B (consomme `fondEffectifWidget`, chargement tuiles preview).
- `studio/src/game/tile-packs.ts`, `studio/src/game/pack.ts` : phase C (téléchargement, assemblage manifest tuiles).
- `catalog/server.js`, `studio/src/game/catalog.ts` : phase C (stockage et transport des octets, au-delà des métas actuelles).
- `studio/src/game/mcp.ts` (`exportPackFull`) : phase C (embarque les tuiles du pack actif).
- Réseau : phases B (preview auteur en ligne, badgée) et C (téléchargement auteur au moment de la génération) — **le parcours joueur reste strictement offline-first** : après vérification du pack, aucun réseau (même exception déjà admise pour la visite initiale de la PWA).
- Aucune modification du schéma graphe (Noeuds/activation/registre/branding) : `tilePackId` existe déjà ; le manifest `{path, version, size, sha256}` couvre déjà les tuiles comme fichiers.
- Dépend de `smart-tile-caching` (terminé, 20/20, en attente d'archive) qui fournit menu, store, pack actif et résolveurs de fond.
