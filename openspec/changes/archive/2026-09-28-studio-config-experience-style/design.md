## Context

Voir `proposal.md` (Why). État observé : `ExperienceStylePanel` (`App.tsx:3053+`, 5+ écrivains `edit` brut racine avec libellé historique « setExperienceStyle ») contourne l'opération MCP `setExperienceStyle` (`mcp.ts:711`, écrit `global`). Le type `Game` (`types.ts:358`) déclare la clé racine, le schéma la rejette — divergence type/schéma.

## Goals / Non-Goals

**Goals:**
- Plus aucune écriture Studio hors `global.experienceStyle`.
- Jeux déjà empoisonnés réparés à l'ouverture (migration annulable).
- Récidive impossible à la compilation (type resserré).

**Non-Goals:**
- Pas de changement du schéma, du Player ni de la résolution du preset.
- Pas de retouche du message C1 trompeur (sujet séparé).
- Pas de migration des autres clés racine éventuelles (seule `experienceStyle` est traitée).

## Decisions

- **Réutiliser `setExperienceStyle`, pas de nouvelle op d'écriture** : le panneau appelle l'op existante via `editGame` (historique Nommé conservé, libellé honnête cette fois).
- **Migration à l'ouverture, global gagne** : le `global` initialisé par `jeuVide` est la référence saine ; la racine n'apporte que des dimensions que le global n'a pas. Alternative écartée : migration silencieuse au chargement sans undo — refusée (garantie P0 : toute action UI passe par une opération nommée journalisée).
- **Retirer la clé du type `Game`** plutôt que l'y garder en « dépréciée » : le schéma ne l'a jamais acceptée, il n'y a pas de contrat à préserver.

## Risks / Trade-offs

- [Jeux avec racine seule (sans global)] → Mitigation : la fusion couvre ce cas (toutes les dimensions racine sont reprises).
- [Appels `game.experienceStyle` ailleurs que le panneau] → Mitigation : recherche exhaustive des lecteurs avant retrait du type ; chaque lecteur bascule sur `game.global?.experienceStyle`.
