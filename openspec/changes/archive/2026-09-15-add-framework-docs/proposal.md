## Why

Le framework GeoPlay manque de documentation structurée pour ses trois publics cibles : les créateurs de jeux (utilisation du Studio), les architectes et développeurs (moteur natif, MCP, orchestrateur), et les mainteneurs (référence fonctionnelle complète). Sans documentation, chaque nouvelle contribution doit réinvestiguer le code source, et la courbe d'apprentissage pour les créateurs reste abrupte. Le change `710-hold-kiosk-mode` a ajouté des fonctionnalités complexes (HOLD kiosque, journalisation systématique) qui doivent être documentées pour être utilisables.

## What Changes

- Création d'une **documentation utilisateur** pour les créateurs : comment composer un Jeu dans le Studio, utiliser le MCP, configurer les modules, gérer les modes système (triche, preview, HOLD)
- Création d'une **documentation développeur** pour les architectes : architecture du moteur natif, flux d'orchestration, interface MCP, gestion des capteurs, persistence SQLite
- Création d'une **documentation fonctionnelle globale** pour les mainteneurs : référence complète de toutes les capacités, conditions d'activation, états de nœuds, règles de validation
- Mise à jour de la **ROADMAP.md** avec la ligne de documentation et les dépendances

## Capabilities

### New Capabilities
- `docs-creator`: Documentation utilisateur pour les créateurs de jeux GeoPlay
- `docs-developer`: Documentation architecturale pour les développeurs du moteur
- `docs-maintainer`: Référence fonctionnelle globale pour les mainteneurs

### Modified Capabilities
- (Aucune — ce change ne modifie pas les exigences de spécification existantes)

## Impact

- Fichiers Markdown ajoutés sous `docs/`
- `ROADMAP.md` mis à jour avec la ligne de documentation
- Aucun changement de code, de schéma ou de comportement runtime
- `skip_specs: true` — aucun delta de spécification requis
