## Why

GeoPlay manque d'un point d'entree unique pour ses trois publics cibles. Les nouveaux createurs de jeux, les integrateurs d'outils et les developpeurs doivent fouiller le code source et la documentation disperse pour comprendre comment installer le projet, configurer leur environnement de dev et lancer leur premier Jeu. L'absence de README de prise en main rapide freine l'onboarding et augmente le cout de contribution.

## What Changes

- Creation d'un **README.md** a la racine du projet avec la procedure de prise en main rapide pour les trois publics (createur, integrateur, dev)
- Creation d'un guide de demarrage rapide pour les **createurs de jeux** (Studio, MCP, composition d'un Jeu)
- Creation d'un guide pour les **integrateurs d'outils** (infrastructure, deployment, modes systeme HOLD/triche/preview)
- Creation d'un guide pour les **developpeurs** (installation env de dev, structure du projet, commandes de build/test)
- Mise a jour de la **ROADMAP.md** avec la reference a la documentation

## Capabilities

### New Capabilities
- (Aucune — ce change est purement documentaire)

### Modified Capabilities
- (Aucune — aucune exigence de specification n'est modifiee)

## Impact

- Fichiers Markdown et README ajoutes a la racine et sous `docs/`
- `ROADMAP.md` mis a jour
- Aucun changement de code, de schema ou de comportement runtime
- `skip_specs: true` — aucun delta de specification requis
