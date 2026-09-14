## Context

GeoPlay est un framework de jeux geolocalises avec deux composants principaux : le Studio (auteur React/Vite) et le Player (natif Android). La documentation actuelle est disperse sous `docs/` (cahier de specifications, dossier de communication, glossaire) mais il n'existe pas de README a la racine ni de guide de prise en main rapide. L'absence de point d'entree unique freine l'onboarding des trois publics cibles.

## Goals / Non-Goals

**Goals:**
- Offrir un README a la racine avec un chemin d'onboarding en moins de 5 minutes pour chaque public
- Documenter l'installation et la configuration de l'environnement de dev
- Clarifier les roles de chaque outil (Studio MCP, runtime natif, orchestrateur)
- Fournir des instructions reproductibles et verifiables

**Non-Goals:**
- Ne pas dupliquer la documentation technique detaillee de `docs/`
- Ne pas remplacer ROADMAP.md qui contient la strategie du projet
- Ne pas documenter les API internes du code source

## Decisions

- **Structure du README** : Sections separates par public (createur, integrateur, dev) avec une procedure de demarrage rapide pour chacun
- **Placement** : `README.md` a la racine pour visibilite maximale ; details techniques sous `docs/dev/`, `docs/user/`, `docs/maintainer/`
- **Commandes verifiables** : Chaque section de setup inclut une commande verifiable (ex: `npm run dev`, `./gradlew assembleDebug`)
- **Format** : Markdown simple, pas de template lourd, pour faciliter les contributions

## Risks / Trade-offs

- [Documentation peut devenir stale] → Mitigation : pointer vers les commandes et scripts existants plutot que des instructions manuelles
- [Redondance avec docs/ existants] → Mitigation : README fait uniquement de l'onboarding rapide, pas de reference complete

## Open Questions

- Faut-il un `README.md` distinct pour `studio/` et `player/` ou un seul a la racine ? (Decision prise : un seul a la racine, avec sous-sections)
