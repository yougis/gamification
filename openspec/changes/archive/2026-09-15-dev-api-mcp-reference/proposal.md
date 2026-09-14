## Why

Le dossier `docs/dev/` contient uniquement `architecture.md` (vue d'ensemble du moteur). Les développeurs et contributeurs ont besoin de documentation de référence ciblée sur trois axes : l'**API** du runtime et du Studio, l'interface **MCP** (Model Context Protocol) pour l'intégration Studio-runtime, et la référence des **classes, objets et fonctions** des deux côtés (Kotlin et TypeScript). Sans ces documents, chaque développeur doit réinvestiguer le code source pour comprendre les interfaces et les contrats.

## What Changes

- Création de `docs/dev/api-reference.md` — Documentation de référence de l'API : types, interfaces, contrats de données, flux d'exécution
- Création de `docs/dev/mcp-reference.md` — Documentation de référence du protocole MCP : opérations, paramètres, formats de requête/réponse, validation
- Création de `docs/dev/classes-reference.md` — Documentation des classes, objets et fonctions : modèles Kotlin, types TypeScript, fonctions exportées

## Capabilities

### New Capabilities
- `dev-docs-api`: Référence API pour le développeur
- `dev-docs-mcp`: Référence MCP pour le développeur
- `dev-docs-classes`: Référence des classes, objets et fonctions

### Modified Capabilities
- (Aucune — ce change ne modifie pas les exigences de spécification existantes)

## Impact

- Fichiers Markdown ajoutés sous `docs/dev/`
- Aucun changement de code, de schéma ou de comportement runtime
- `skip_specs: true` — aucun delta de spécification requis
- Ce change complète la documentation déjà existante (`architecture.md`, `docs/user/`, `docs/maintainer/`)