## Context

Voir `proposal.md` (Why). État observé : `TIMER {anchor, delaySeconds}` = déverrouillage seul ; `WINDOW`/`CONDITIONAL` réservés vides, ignorés gracieusement par `evaluate.ts` et le moteur KMP ; pas de durée globale ; dashboard (change non archivé) avec `timerRemainingMs` et rebours par POI ; `timeLimitSeconds`/`maxAttempts` vivent dans les modules, jamais dans le moteur.

## Goals / Non-Goals

**Goals:**
- Durée globale configurable avec les deux fins douces, évaluée par tous les moteurs.
- `WINDOW` relatif révocable, combinable, avec fin d'épreuve en cours respectée.
- Dashboard : rebours global + annonces de verrouillage, zéro donnée nouvelle.

**Non-Goals:**
- Pas de solveur temporel en C2 (limite documentée).
- Pas d'horloge murale / fuseaux horaires (elapsed local seul).
- Pas de pause du chrono (multitâche OS = temps qui court ; documenté).
- Pas de fusion avec les timeouts de mini-jeux (deux horloges distinctes assumées).

## Decisions

- **`dureeTotale` en secondes (integer ≥ 0), `finDeTemps` requis si posée** : secondes plutôt que minutes (cohérent avec `delaySeconds`, `dwellMs`), `if/then` Draft-07 pur comme `holdExit`. Alternative écartée : minutes lisibles — deux unités temporelles dans le schéma.
- **`WINDOW {apresSecondes?, avantSecondes?}` relatif à `GAME_START`, `anyOf` C1, comparaison C2** : `apres < avant` inexprimable en Draft-07 pur (d'où la correction C1→C2 pendant la rédaction). Révocabilité calquée sur `GEOFENCE` (retour `LOCKED`, purge file) y compris contre `latch:true`. Alternative écartée : fenêtre murale absolue — infondée offline.
- **Modale ACTIVE à l'échéance : finir puis verrouiller** (recommandé, à valider en revue) : expulser casserait la règle « modale survit » et perdrait une saisie ; finir puis `LOCKED` préserve le contrat latch/ACTIVE existant.
- **Flag « hors délai » sur score + journal** en mode `continuer` : même circuit que le flag triche (champ booléen, pas de type d'event nouveau).
- **Moteurs** : `elapsed` déjà suivi partout (boucle d'évaluation, `nowMs`) — la durée et les fenêtres sont des prédicats de plus sur l'existant, pas une nouvelle horloge. Studio `evaluate.ts`, shared KMP, PWA : même formule.

## Risks / Trade-offs

- [Risk] Multitâche/kill : le temps court-il pendant ? → Mitigation : oui, `elapsed` = wall-clock depuis GAME_START, reprise = `nowMs` recalculé (cohérent avec la reprise exacte existante) ; documenté.
- [Risk] `latch:true` + `WINDOW` expiré surprend (latch = rester UNLOCKED) → Mitigation : spec explicite (révocable gagne toujours), message C2 si `latch:true` + `avantSecondes` ? Non : autorisé, documenté — le cas « bonus limité dans le temps » est légitime.
- [Risk] Ordre d'archive (`player-home-dashboard` d'abord) → Mitigation : tâche 3.x dédiée, rebase du delta viewer si besoin.
- [Trade-off] Pas de garantie de faisabilité temporelle : assumé, même statut que la fermeture transitive.

## Open Questions

Aucune bloquante. Point à valider en revue d'apply : finir-puis-verrouiller pour la modale ACTIVE à l'échéance (alternative : expulsion immédiate). Si la revue tranche expulsion, specs + moteurs bougent ensemble — signaler avant de coder.
