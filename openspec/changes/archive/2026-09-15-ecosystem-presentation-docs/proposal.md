## Why

GeoPlay est une plateforme de production de jeux — une "usine à jeux" — mais les créateurs de jeux ont besoin d'une vue d'ensemble claire et non technique de ce que le framework peut faire. Sans une documentation de présentation accessible, les créateurs potentiels ne peuvent pas comprendre les possibilités offertes par l'écosystème : les types de jeux possibles, les conditions d'activation, les modules disponibles, les modes de fonctionnement, et la philosophie offline-first.

Cette documentation de présentation comblera le manque entre la technologie (documentée dans les specs et la documentation technique) et le créateur qui veut savoir **ce qu'il peut créer** sans plonger dans les détails d'implémentation.

## What Changes

- Création d'un **document de présentation de l'écosystème** destiné aux créateurs de jeux, utilisant un langage non technique
- Ce document met en valeur **toute la logique** implémentée dans l'outil : le graphe de jeu, les conditions d'activation, les modules, les modes système, la persistance, le tout en termes accessibles
- Illustrations des scénarios concrets de création de jeux pour valoriser les possibilités

## Capabilities

### New Capabilities
- `presentation-docs` : Documentation de présentation non technique de l'écosystème GeoPlay pour les créateurs de jeux

### Modified Capabilities
- (Aucune — ce change ne modifie pas les exigences de spécification existantes)

## Impact

- Fichier Markdown ajouté sous `docs/`
- Aucun changement de code, de schéma, de spécification ou de comportement runtime
- `skip_specs: true` — aucun delta de spécification requis
- Ce change complète la documentation déjà existante (`docs/user/`, `docs/dev/`, `docs/maintainer/`, `docs/glossary.md`) en ajoutant une couche de présentation accessible