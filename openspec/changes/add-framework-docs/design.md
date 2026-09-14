## Context

Le projet GeoPlay possède un socle complet (changes 000 à 710) avec des spécifications détaillées, un moteur natif (Kotlin), un Studio MCP (TypeScript), et des schemas JSON Draft-07. La documentation actuelle est limitée aux commentaires dans le code et aux fichiers de spec OpenSpec. Les trois publics cibles ont des besoins distincts :

- **Créateurs** : besoin d'un guide pas-à-pas pour composer des jeux dans le Studio, sans connaissances techniques approfondies
- **Développeurs** : besoin de comprendre l'architecture du moteur, le flux d'orchestration, et l'interface MCP
- **Mainteneurs** : besoin d'une référence fonctionnelle exhaustive couvrant tous les changements validés

Le change `710-hold-kiosk-mode` a été archivé avec des spécifications complètes sous `openspec/specs/`. Ces mêmes specs servent de source primaire pour la documentation.

## Goals / Non-Goals

**Goals:**
- Fournir une documentation utilisateur créateur accessible et pratique
- Documenter l'architecture du moteur et l'interface MCP pour les développeurs
- Créer une référence fonctionnelle exhaustive pour les mainteneurs
- Mettre à jour la ROADMAP pour refléter le nouveau changement de documentation

**Non-Goals:**
- Ne pas modifier le comportement du code ou des schemas
- Ne pas créer de nouvelles fonctionnalités
- Ne pas dupliquer le contenu des specs OpenSpec existantes
- Ne pas implémenter de fonctionnalité technique

## Decisions

- **Format Markdown** : utilisation de Markdown pour la cohérence avec les specs OpenSpec et la compatibilité avec les outils existants (GitHub, VS Code, etc.)
- **Structure en trois documents** : un par public cible plutôt qu'un seul document monolithique, pour maintenir la lisibilité et permettre des mises à jour indépendantes
- **Source primaire** : les specs OpenSpec sous `openspec/specs/` servent de référence pour le contenu fonctionnel, évitant toute divergence
- **ROADMAP.md** : mise à jour directe du fichier existant pour ajouter la ligne `800-add-framework-docs`
- **Placement** : les fichiers de documentation seront placés sous `docs/` à la racine du projet (à créer)

## Risks / Trade-offs

- [Risk] La documentation peut devenir obsolète si les specs changent → [Mitigation] Indiquer dans chaque doc que les specs OpenSpec sont la source de vérité
- [Risk] Le volume de documentation peut être intimidant → [Mitigation] Structurer par public cible avec navigation claire
- [Risk] Les exemples peuvent ne pas couvrir tous les cas d'usage → [Mitigation] Utiliser les fixtures de test existantes (game-5poi.json) comme cas d'illustration

## Open Questions

- Où placer exactement les fichiers de documentation ? `docs/` racine ou `docs/user/`, `docs/dev/`, `docs/maintain/` ?
- Le format de sortie doit-il inclure des liens vers les specs OpenSpec ou des références directes ?
- Faut-il générer automatiquement une partie de la documentation à partir des specs (via script) ?
