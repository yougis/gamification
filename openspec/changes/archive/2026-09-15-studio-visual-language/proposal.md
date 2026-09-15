## Why

Le template `exemple_Studio` propose un langage visuel plus lisible que le Studio actuel, mais c’est une maquette statique : il faut en reprendre les principes (coquille, typographie, densité, écrans guidés) sans perdre les fonctionnalités réelles du Studio ni introduire de régression.

## What Changes

- Reprendre le langage visuel du template dans le Studio existant : coquille sidebar + header + écran principal, hiérarchie display/mono/texte, cartes, pastilles de statut, tableaux denses et traces lisibles.
- Mapper les six écrans du template sur les écrans réels existants : composer, importer, relire, valider, prévisualiser, exporter, plus l’écran `config` réel absent du template.
- Restyler le graphe sans remplacer son moteur : conserver ReactFlow et ses interactions, adopter rail de type, pastille de statut, pointillés `draft` et surlignage de sélection.
- Harmoniser validation, import, relecture, prévisualisation et export avec les motifs du template, en gardant les verdicts réels, les gates draft/HOLD et les manifests SHA-256.
- Ne pas copier les données figées du template, ni sa navigation à six sections fixes, ni ses polices distantes.

## Capabilities

### New Capabilities
- Aucune.

### Modified Capabilities
- Aucune. Ce change est purement présentationnel : aucun comportement de spec existante n’est modifié. `skip_specs: true` est déclaré dans `.openspec.yaml`.

## Impact

- **Code concerné** : `studio/src/App.tsx`, `studio/src/components/*`, `studio/src/styles/*`, assets d’interface du Studio uniquement.
- **Aucun impact** : schéma graphe Noeuds/activation/registre/branding/manifest, validateur Draft-07 + applicatif, MCP, runtime natif, orchestrateur, modules, packaging offline.
- **Réseau** : aucune connexion réseau ajoutée ; les polices distantes du template sont exclues pour préserver l’offline-first.
- **Dépendance** : dépend du change non archivé `studio-onepage-spec`, dont l’architecture d’écrans sur état partagé est déjà en place dans `studio/src/App.tsx`.
