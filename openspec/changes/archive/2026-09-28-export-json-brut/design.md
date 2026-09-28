## Context

- Écran Exporter (`App.tsx:1820+`) : bouton pack désactivé quand `bloqueExport`, liste `raisonsBlocage`, motif blob-anchor dans `genererPack` (`game.json` + `manifest.json` + `studio-meta.json` + `compat.json` + assets session).
- Règle centrale `canExport` (`mcp.ts:271`, C1 ∧ C2 ∧ statuts) : consommée par barre globale, Relire, Exporter — porte unique du pack, inchangée.
- Aucune opération MCP : le téléchargement brut ne mute pas le jeu (pas d'undo, pas de journal).

## Goals / Non-Goals

**Goals:**
- Bouton brut toujours actif à côté du blocage, avec rappel des causes ; fichier marqué non valide, sans manifest/SHA/assets.
- Pack strictement inchangé et bloquant.

**Non-Goals:**
- Presse-papiers, JSON + rapport joint, accès depuis Valider (options B/C écartées : un seul point d'accès, là où le besoin mord).
- Assouplissement du pack ou du runtime (le brut reste impropre à jouer).

## Decisions

1. **Placement Exporter, pas Valider** : le besoin naît face au blocage ; le rappel des causes y est déjà affiché (`raisonsBlocage`). Un second point d'accès dupliquerait le message.
2. **Nom de fichier marqué** (`game-brut-non-valide.json`, horodaté si le motif local l'exige) : la non-validité est visible hors Studio (explorateur, pièce jointe), sans métadonnée à lire.
3. **Lecture seule stricte** : `JSON.stringify(game)` direct, pas de `exportPackFull`, pas d'entrée d'historique — le bouton n'est pas une opération auteur.
4. **Aucune garde supplémentaire** : disponible en mode animateur comme hors animateur, avec ou sans avertissements — c'est la donnée source de l'auteur, pas une production.

## Risks / Trade-offs

- **Confusion brut/pack** : mitigée par l'absence de manifest (le runtime refuse tout pack partiel avec état explicite) + nom marqué + rappel des causes à côté du bouton.
- **Partage d'un jeu invalide** : assumé (debug entre auteurs) ; la réimportation revalide bi-couche, aucune invalidité ne entre silencieusement.
