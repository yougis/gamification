# Profil Maintaineur

Ce document decrit le cycle de vie des changes, l'archive, la mise a jour
du schema et les regles de compatibilite pour le projet GeoPlay.

## Cycle de vie des changes

Les changes suivent le workflow OpenSpec spec-driven :

1. **Proposer** : `/opsx:propose` pour creer un change avec tous les artefacts
2. **Planifier** : `proposal.md` → `specs/` → `design.md` → `tasks.md`
3. **Appliquer** : `/opsx:apply` pour implementer les taches
4. **Archiver** : `/opsx:archive` pour finaliser et archiver le change

Le projet suit un roadmap avec des changes numeroutes :
- `000` socle (framework de base)
- `100`-`500` changes fonctionnels (schema, navigation, inventory, etc.)
- `600`-`640` changes divers

## Archive des changes

Quand un change est archive :
- Resumer l'impact sur le schema graphe/registre si modifie
- Propager l'information aux changes suivants (Studio, moteur, orchestrateur,
  modules, packaging offline)
- Verifier que la compatibilite ascendante est maintenue

## Mise a jour du schema

Toute modification du schema Draft-07 doit :
1. Identifier les consommateurs impactes (Studio MCP, runtime natif,
   orchestrateur, modules, packaging offline)
2. Verifier que l'exemple `game-5poi.json` reste valide (non-regression)
3. Verifier que les deux couches (Draft-07 + applicative) acceptent le changement
4. Mettre a jour `openspec/specs/game-schema/spec.md`

## Compatibilite ascendante

- Un jeu BASIC existant fonctionne sans modification fonctionnelle
- Les nouvelles proprietes (discovery, effects, inventory) sont optionnelles
- Les types inconnus en `module.type` restent valides en couche 1
- Le moteur ignore les types inconnus gracieusement
- Le schema verifie `minEngineVersion` a l'ouverture : moteur trop vieux = refus

## Regles spec-driven

- Les regles de spec vivent dans `openspec/config.yaml` et `openspec/specs/`
- `AGENTS.md` ne fixe que des regles de code generales
- Chaque spec doit etre testable avec des scenarios Given/When/Then
- Les changements de schema doivent etre propages a tous les consommateurs

## Principes structurants appliques

- Le cycle de vie des changes suit le workflow spec-driven
- L'archive resume l'impact schema pour les changes suivants
- La compatibilite ascendante est une priorite (non-regression)
- Toute modification du schema doit identifier les consommateurs impactes
