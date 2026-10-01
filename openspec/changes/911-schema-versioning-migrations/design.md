## Context

Voir proposal.md (Why). Contraintes : migrations pures (meme entree -> meme sortie, sans E/S), chainees, testees ; jeux existants sans `schemaVersion` = v1 implicite ; jamais de lecture partielle.

## Goals / Non-Goals

**Goals:**
- Ouvrir un vieux jeu migre silencieusement ; refuser un jeu trop recent avec message clair.

**Non-Goals:**
- Migration des textes vers i18n (912) ; migrations de donnees serveur (M3).

## Decisions

- **Entier incrementiel** (pas semver) pour `schemaVersion` : comparaison triviale des deux cotes (TS + Kotlin), pas d'ambiguite de parsing.
- **Migrations pures et unitaires** `vN -> vN+1` enchainees : testables une par une, rejouables, auditables ; pas de saut direct v1->v5.
- **Studio migre, runtime refuse** : seul l'auteur fait evoluer les donnees (avec undo quand destructeur) ; le joueur ne subit jamais une demi-migration.
- **Jeux sans version = v1** : compatibilite ascendante sans reecriture du parc existant.

## Risks / Trade-offs

- [Migration destructive] Perte d'info auteur → Mitigation : sauvegarde pre-migration + entree undo + avertissement.
- [Divergence TS/KMP] → Mitigation : memes jeux de test des deux cotes (suite 908).
