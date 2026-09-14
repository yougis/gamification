## Context

Le projet GeoPlay possède un écosystème complet : un Studio d'auteur, un moteur de runtime natif (Kotlin), un serveur MCP (TypeScript), des schémas de validation JSON, et une documentation existante sous `docs/` (guide créateur, architecture développeur, référence fonctionnelle mainteneur, glossaire). Cependant, ces documents techniques décrivent le "comment" du système. Les créateurs de jeux ont besoin d'un document qui leur présente le "quoi" et le "pourquoi" en termes simples : qu'est-ce que je peux créer, comment ça fonctionne visuellement, quelles possibilités le framework offre.

Le changement `800-add-framework-docs` a déjà créé la documentation technique pour trois publics. Ce nouveau changement `ecosystem-presentation-docs` complète cette base en ajoutant une couche de présentation accessible, non technique, mettant en valeur toute la logique implémentée.

## Goals / Non-Goals

**Goals:**
- Fournir une documentation de présentation de l'écosystème GeoPlay en langage non technique
- Montrer toute la logique implémentée dans l'outil de manière accessible
- Valoriser les possibilités de création de jeux pour les créateurs
- Expliquer les concepts clés (graphe, modules, conditions, modes) sans jargon technique

**Non-Goals:**
- Ne pas modifier le comportement du code ou des schemas
- Ne pas créer de nouvelles fonctionnalités
- Ne pas dupliquer le contenu des documents techniques existants
- Ne pas implémenter de fonctionnalité technique
- Ne pas remplacer la documentation existante

## Decisions

- **Format Markdown** : utilisation de Markdown pour la cohérence avec le reste de la documentation
- **Approche par scénarios concrets** : chaque section illustre un cas de création de jeu réel pour rendre les concepts tangibles
- **Langage non technique** : éviter les termes techniques ou les expliquer immédiatement ; utiliser des analogies du monde réel
- **Valeur ajoutée** : ce document complète les docs techniques existantes ; il ne les remplace pas
- **Placement** : le fichier sera placé sous `docs/` à la racine (ex. `docs/ecosystem-presentation.md`)
- **Structure** : présentation de l'écosystème → ce que le créateur peut faire → comment ça marche visuellement → les possibilités concrètes

## Risks / Trade-offs

- [Risk] Le document peut devenir obsolète si les fonctionnalités changent → [Mitigation] Mentionner que les specs OpenSpec sont la source de vérité technique
- [Risk] Trop simplifier peut perdre en précision → [Mitigation] Utiliser des exemples concrets et liés à des cas réels
- [Risk] Le document peut sembler trop "marketing" et pas assez technique → [Mitigation] Être honnête sur les capacités et limitations connues

## Open Questions

- Le document doit-il inclure des visuels (schémas, captures d'écran du Studio) ?
- Faut-il un lien direct vers le glossaire pour chaque terme technique mentionné ?
- Le format doit-il être un seul fichier ou plusieurs sections ?