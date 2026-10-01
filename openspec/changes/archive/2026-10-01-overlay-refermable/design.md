## Context

Voir proposal.md (Why). État actuel : `PhoneCanvas` n'affiche le voile cliquable et l'icône message que si `dissimulable` (`dissimulationJoueur && overlayFermable`) ; sinon voile inerte plein cadre. Le renderer natif suit le même contrat (overlay non fermable = modal définitif).

## Goals / Non-Goals

**Goals:**
- Aucun écran bloqué : tout overlay (joueur comme simu) offre une sortie.
- `fermable` restreint au clic-fond ; schéma et défauts inchangés.
- Jeux existants non-fermables : refermables sans migration de JSON.

**Non-Goals:**
- Creux cliquables sous overlay affiché (voile toujours modal tant qu'affiché).
- Nouveau champ schéma ou valeur par défaut modifiée.
- Changement du budget d'interaction simu (aucune écriture ajoutée).

## Decisions

- **Contrôle universel plutôt que défaut inversé** : inverser le défaut `fermable` à `true` casserait la validation des jeux existants (C1 inchangée exigée) ; le contrôle systématique donne la sortie sans toucher au schéma.
- **Clic-fond réservé à `fermable: true`** : préserve le sens auteur existant (surimpression qu'on peut balayer vs panneau qu'on ferme explicitement).
- **Simu = même mécanique + badge** : pas de contrôle simu ad hoc divergent ; le terminal réutilise le chemin joueur avec mention SIMULÉ.
- **État session non persisté** : masquage en mémoire, reprise = affichée — identique à l'existant `fermable`, étendu à tous.

## Risks / Trade-offs

- [Risk] Jeux existants comptant sur un voile indépassable (ex. consigne obligatoire) → Mitigation : BREAKING documenté ; l'auteur peut signaler l'exigence dans le contenu, plus l'imposer par le voile.
- [Risk] Icône message confondue avec une messagerie → Mitigation : glyphe et teinte branding existants conservés, tooltip explicite.
- [Risk] Divergence natif si le runtime KMP n'applique pas le contrat → Mitigation : tâche dédiée avec test de non-blocage dans ce change.

## Migration Plan

Aucune migration de données. Déploiement : Studio puis runtime natif. Rollback = revert (les JSON restent valides avant comme après).

## Open Questions

Aucune.
