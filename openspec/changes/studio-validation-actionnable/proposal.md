## Why

Le système de validation est perçu comme compliqué par les créateurs non techniques : tout findings (même un cosmétique) bloque l'export, deux tiers des messages ne sont jamais traduits (`erreurFR` ne couvre qu'une dizaine de motifs sur ~35 règles + 100 % des erreurs AJV brutes), et aucune correction n'est proposée. Pire : la spec exige déjà des avertissements non bloquants (indoor+GEOFENCE, tileStrategy none+map) mais le code les pousse dans `errors[]` — écart spec/code avéré.

## What Changes

- **3 niveaux** : `erreur` (bloque l'export : jeu qui ne peut pas tourner), `avertissement` (export possible avec confirmation explicite « je sais ce que je fais »), `info/conseil` (lint non bloquant). `canExport` ne regarde que les erreurs ; les avertissements existants de la spec (indoor+GEOFENCE, tileStrategy none+map) + `consumable` inutilisé + cosmétiques (couleurs, enums, `identity.name`) sont rétrogradés.
- **Erreurs structurées** : le validateur émet `{code, noeud, champ, attendu}` au lieu de chaînes à parser ; l'UI applique un glossaire fermé non technique (« étape », « déclencheur », « tirage », « fin ») avec action (« Voir », navigation Composer existante). `erreurFR` en pattern-matching est supprimée à terme, pas étendue.
- **Correction en 3 tas** : sans demander (migration `global.preset`, enum → défaut, `operator` surnuméraire retiré) ; proposée en un clic via opérations MCP nommées annulables (operator AND/OR, `maxReentries`, `drawCount`, doublons, refs orphelines) ; jamais (cycles, fins inatteignables, AND-sur-exclusifs). Chaque correction est journalisée explicitement.
- Rétrocompatibilité : aucun jeu valide aujourd'hui ne devient invalide ; des jeux invalides peuvent devenir exportables-avec-avertissement (assumé et documenté).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-validation`: niveaux de sévérité (erreur/avertissement/info), requalification des règles existantes, erreurs structurées `{code, noeud, champ, attendu}`.
- `studio-authoring`: écran Valider (3 blocs, confirmation d'export avec avertissements, boutons « Corriger »), règle d'export « porte unique » étendue (erreurs bloquent, avertissements confirment).

## Impact

- Code : `studio/src/game/validate.ts` (typologie + codes), `i18n-ui.ts` (glossaire, suppression progressive d'`erreurFR`), écran Valider + Exporter (`App.tsx`), `canExport` (erreurs seules), nouvelles opérations MCP de correction (undo natif).
- Schéma graphe : inchangé (aucun champ ajouté/retiré) ; consommateurs : Studio seul (le validateur embarqué players ne change pas de verdict sur les erreurs dures).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
