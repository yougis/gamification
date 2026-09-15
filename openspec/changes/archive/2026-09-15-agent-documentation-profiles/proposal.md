## Why

Le projet GeoPlay est une plateforme de production de jeux geolocalises offline avec une architecture a couches (Studio, Jeu, Moteur/Runtime) et des regles structurales complexes (graphe d'activation, registre de modules, offline-first, HOLD kiosque). L'agent principal actuel (`AGENTS.md`) ne reflete pas de maniere structurante les principes fondamentaux du systeme, ce qui entraîne des incoherences dans la generation de code et la prise de decisions. De plus, il n'existe pas de documentation cible pour les differents profils de parties prenantes (utilisateur, createur, developpeur, mainteneur, financeur/partenaire), rendant la communication et l'adoption difficiles.

## What Changes

- **Mise a jour de `AGENTS.md`** : integration des grands principes structurants du systeme comme regles transverse explicites, avec separation claire entre regles de code generales et regles de spec (vivant dans `openspec/config.yaml` et `openspec/specs/`).
- **Creation de profils de documentation** : production ou mise a jour de documentation technique et fonctionnelle pour chaque profil :
  - **Utilisateur** : comment jouer, navigation, interaction avec les POI
  - **Createur** : comment composer un jeu dans le Studio, utiliser le MCP, valider et exporter
  - **Developpeur** : architecture, integration des modules, schema Draft-07, validation
  - **Maintaineur** : cycle de vie des changes, archive, mise a jour du schema, compatibilite
  - **Financeur/Partenaire** : valeur commerciale, modele économique, ROI, integration en borne
- **Mise en place d'un systeme de profils dans l'agent** : l'agent principal doit pouvoir adapter ses reponses et ses actions selon le profil cible, en integrant les principes structurants comme filtre de decision.

## Capabilities

### New Capabilities
- `agent-documentation-profiles` : systeme de profils de documentation technique et fonctionnelle pour les parties prenantes du projet GeoPlay, defini dans `AGENTS.md` et les fichiers de documentation associes.

### Modified Capabilities
- (Aucune — ce changement ne modifie pas les exigences spec-level des capabilities existantes)

## Impact

- **`AGENTS.md`** : refonte pour integrler les principes structurants et les profils
- **Documentation** : fichiers de documentation cibles pour chaque profil (dans `docs/` ou structure equivalente)
- **OpenSpec** : le fichier `.openspec.yaml` du changement declare `skip_specs: true` car aucun comportement spec-level n'est modifie
- **Outils** : les skills existants (geoplay-spec-validator, geoplay-graph-architect, etc.) continuent de fonctionner sans modification
