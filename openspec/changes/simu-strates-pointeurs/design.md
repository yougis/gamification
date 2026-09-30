## Context

Voir proposal.md (Why). État actuel : en simu, `rendreSorti` ne met `pointer-events-none` que quand non interactif (donc jamais en simu), et `WidgetRenderer` remet `pointer-events-auto` sur TOUS les wrappers dès que `flottant && !traversant` (`WidgetRenderer.tsx` L185). Les conteneurs `coucheFond`/`couchePleinEcran` (`absolute inset-0`) n'ont aucune neutralisation. En édition, la sélection au clic et le routage par calques fonctionnent et restent hors périmètre de changement.

## Goals / Non-Goals

**Goals:**
- Zéro rectangle attrape-clics invisible en simu.
- Contrôles actionnables (boutons, carte, module) prioritaires dans leurs bornes.
- Chute systématique vers le fond sinon ; overlay non fermable modal assumé.

**Non-Goals:**
- Changement du comportement d'édition (sélection, calques, fantômes).
- Creux cliquables sous overlay non fermable (refusé).
- Textes actionnables côté joueur (reste un futur widget button).

## Decisions

- **Opacité opt-in plutôt que traversée opt-out** : le défaut devient traversant en lecture ; seuls les types interactifs (`button`, `map` avec `carteSimu`, `module`) réactivent l'opacité sur leur wrapper. Alternative rejetée : liste d'exclusion par type (oublie les futurs widgets passifs).
- **Conteneurs toujours traversants** : `coucheFond`, `couchePleinEcran` et zone `flottant` portent `pointer-events-none` en simu ; le widget décide (règle ci-dessus). En édition, comportement inchangé (sélection).
- **Présence du fond comme règle de chute** : le fond (carte ou autre) reçoit ce qui traverse ; sans fond, rien ne change visiblement.
- **Module = opaque par défaut** : son contenu (inputs, tuiles) est interactif par nature ; les renderers non interactifs (états vides, relecture) n'ont pas de contrôles donc ne captent rien de gênant.

## Risks / Trade-offs

- [Risk] Un futur widget passif avec `onClick` décoratif capterait à tort → Mitigation : la règle est par type (`button`/`map`/`module`), un nouveau type passif est traversant par défaut.
- [Risk] Régression de la sélection en édition si le flag lecture/édition est mal branché → Mitigation : le flag suit `edition` existant de `PhoneCanvas` (callbacks de sélection présents), jamais un nouveau state.
- [Risk] Quiz/relecture figée dans un wrapper opaque : aucun contrôle dedans, aucun geste volé → acceptable.

## Migration Plan

Aucune migration : Studio uniquement, CSS/comportement local, pas de persistance ni de format. Rollback = revert.

## Open Questions

Aucune.
