## Context

Voir `proposal.md` (Why). État observé : `validateGame`/`validateGameFull` retournent des couches d'erreurs `string[]` (`validate.ts`, `mcp.ts` ~l.580-632) ; l'UI construit `rapport`/`brut` via `erreurFR` en pattern-matching ; `canExport` (`mcp.ts:92`) bloque sur toute erreur + brouillons ; les corrections passent par `editGame` avec opérations MCP nommées (undo natif, ex. `"ajouterActivation"`). Les deux `Warning` de la spec sont poussés dans `errors[]`.

## Goals / Non-Goals

**Goals:**
- Typologie exploitable par l'UI sans parser de texte.
- Export à deux vitesses (erreurs bloquent, avertissements confirment) sans réécrire le pipeline.
- Corrections traçables dans l'historique existant.

**Non-Goals:**
- Pas de refonte du moteur de validation (règles C1/C2 inchangées dans leur détection).
- Pas de persistance inter-session des confirmations « je sais ce que je fais ».
- Pas d'édition directe du JSON depuis les messages (tout passe par les formulaires/opérations existantes).

## Decisions

- **Nouveau type `Diagnostic {code, niveau, noeud?, champ?, attendu?, correctifs[]}`** émis à côté des chaînes (pas à la place, en première étape) : `validateGameFull` retourne les deux ; l'UI consomme les structurés, le CLI/tests gardent les chaînes. Alternative écartée : remplacer les strings d'un coup — casserait les smokes et `brut` qui alimentent Relire/Exporter.
- **Table de sévérité centralisée** (`niveauParCode`) : un seul point de vérité pour la requalification ; `canExport` filtre `niveau === "erreur"`. Alternative écartée : flaguer au cas par cas dans l'UI — divergence garantie.
- **Corrections = opérations MCP nommées** (`migrerPreset`, `retirerOperator`, `fixOperator`, `fixMaxReentries`, `fixDrawCount`, `supprimerReference`, …) via `editGame` : undo natif, journal explicite (« migré automatiquement, annulable »). Alternative écartée : patch direct du state — invisible à l'historique, contraire aux garanties P0 du Studio.
- **`erreurFR` gelée** : aucun nouveau motif ajouté ; nouveau rendu `rendreDiagnostic` (glossaire fermé) ; suppression d'`erreurFR` quand la couverture structurée est totale. Alternative écartée : étendre le pattern-matching — c'est le problème, pas la solution.
- **Confirmation d'avertissement session-only + journalisée** (panneau log existant) : re-demandée après rechargement. Alternative écartée : persister l'acquittement — un jeu rouvert mérite un nouvel examen.
- **C1 AJV** : mapping des erreurs brutes vers codes au point de sortie (`actualiserRapport`), sans toucher aux schémas.

## Risks / Trade-offs

- [Doublon transitoire chaînes/Diagnostics] → Mitigation : les chaînes restent la source des tests existants jusqu'au basculement complet, documenté en tâche.
- [Correction proposée ambiguë (AND/OR)] → Mitigation : jamais de défaut pré-coché, effet expliqué ; l'auteur choisit explicitement.
- [Avertissement confirmé puis jeu modifié] → Mitigation : toute édition invalide la confirmation (recalcul à chaque `game` change, comme `rapport`).
- [Trade-off] Export-avec-avertissement assumé : un auteur peut publier un jeu bancal en connaissance de cause — c'est le choix produit acté en spec.

## Migration Plan

Aucune migration de données (aucun jeu valide ne devient invalide). Rollback = revert du code (les jeux restent lisibles : schéma inchangé). Ordre : typologie → glossaire → Valider/Exporter → corrections → suppression d'`erreurFR`.
