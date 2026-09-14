## Context

Le projet GeoPlay possède deux bases de code principales : le **Studio** (TypeScript, serveur MCP) et le **Player** (Kotlin natif, runtime iOS/Android). Le dossier `docs/dev/` ne contient actuellement qu'un seul fichier : `architecture.md` (vue d'ensemble). Les sources révèlent des interfaces riches :

**TypeScript (Studio)** : `mcp.ts`, `types.ts`, `validate.ts`, `runtime.ts`, `modules.ts`, `evaluate.ts`, `pack.ts`, `i18n-ui.ts`
**Kotlin (Player)** : `GameEngine.kt`, `GameMcp.kt`, `GameModels.kt`, `GameDao.kt`, `GameDatabase.kt`, `GameRepository.kt`, `PackManager.kt`, `GeoPlayApplication.kt`, `MainActivity.kt`, `GameFragments.kt`, `Adapters.kt`

Ces sources implémentent des contrats importants (MCP, validation double couche, persistence SQLite, module registry) qui doivent être documentés pour tout développeur contribuant au projet.

## Goals / Non-Goals

**Goals:**
- Fournir une référence API complète pour le runtime et le Studio
- Documenter l'interface MCP (contrat Studio ↔ Runtime)
- Lister et décrire toutes les classes, objets et fonctions des deux côtés
- Permettre à tout développeur de comprendre et contribuer au projet sans réinvestiguer le code

**Non-Goals:**
- Ne pas modifier le comportement du code ou des schemas
- Ne pas créer de nouvelles fonctionnalités
- Ne pas remplacer `architecture.md` — le compléter
- Ne pas implémenter de fonctionnalité technique

## Decisions

- **Trois documents séparés** : API, MCP, et Classes — pour maintenir la lisibilité et permettre des mises à jour indépendantes
- **Source primaire** : les fichiers source Kotlin et TypeScript servent de vérité pour la référence des classes/fonctions
- **Format Markdown** : cohérence avec le reste de la documentation
- **Placement** : fichiers placés sous `docs/dev/` (`api-reference.md`, `mcp-reference.md`, `classes-reference.md`)
- **Langage** : référence technique (TypeScript/Kotlin) mais accessible au développeur familier du framework

## Risks / Trade-offs

- [Risk] La référence des classes peut devenir obsolète si le code change → [Mitigation] Indiquer que les sources sont la source de vérité, et mentionner la version du code couverte
- [Risk] Le MCP peut évoluer sans mise à jour de la doc → [Mitigation] Mentionner que les specs OpenSpec et les fichiers source sont les sources de vérité
- [Risk] Volume potentiellement important de documentation → [Mitigation] Se concentrer sur les interfaces publiques, pas sur les détails d'implémentation internes

## Open Questions

- Faut-il inclure les tests (`GameEngineTest.kt`) dans la référence des classes ?
- Le MCP doit-il documenter les messages bruts (JSON) ou uniquement les opérations de haut niveau ?
- Les UI components (`GameFragments.kt`, `Adapters.kt`) doivent-ils être documentés dans la référence des classes ?