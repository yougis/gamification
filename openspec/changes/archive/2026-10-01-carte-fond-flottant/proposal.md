## Why

Un widget carte `pleinEcran` peint aujourd'hui AU-DESSUS du contenu texte (couche breakout après les zones), alors que l'usage demandé est l'inverse : carte en arrière-plan plein écran, modules de contenu (textes) flottant par-dessus, carte restant visible et navigable. Les zones ne se superposent jamais (flex vertical strict, aucun z-index pilotable), donc cet habillage est aujourd'hui impossible à composer — et serait divergent entre Studio et players sans parité garantie dès ce change.

## What Changes

- Nouveau modèle à 3 strates par écran : FOND (un widget `pleinEcran` déclaré en arrière-plan — la carte en premier cas d'usage — interactif : drag/zoom), FLOTTANT (contenu header/content/footer par-dessus, carte visible dans les creux), OVERLAY (modale existante au sommet, inchangée).
- Partage des événements pointeur : la strate flottante est transparente sauf sur les widgets eux-mêmes (texte sélectionnable, zones vides → drag carte).
- Authoring : sélecteur de calque + œil par strate (même pattern que la surimpression) pour composer et sélectionner à travers les couches.
- Parité garantie : même empilement Studio (canvas + terminal) et players (KMP partagé + PWA) ; ordre d'implémentation Studio → KMP → PWA avec test de parité (même écran, 3 rendus comparés).

## Capabilities

### Modified Capabilities
- `studio-screen-builder`: strate fond + strate flottante (superposition pilotée, sélection de calque auteur).
- `viewer-orchestrator`: même modèle de strates côté player (fond navigable, flottant lisible, parité natif/PWA).

## Impact

- Schéma : nouvelle déclaration d'assignation de strate (détail au design ; `pleinEcran` existant conservé) ; validateur C1/C2 étendu en conséquence.
- Studio : canvas, terminal simulé, panneau de propriétés (sélecteur de calque).
- Players : renderer KMP partagé + coquille PWA (même contrat d'empilement).
- Hors périmètre : réparation de données existantes (ex. clés de zones hors nomenclature, manuelles) ; fond raster offline player (déjà différé ailleurs) ; surfacing `additionalProperty` C1 (fil séparé).
