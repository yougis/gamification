## Context

État observé : `GeoPlayApp` partagé démarre sur la route `GRAPH` (tableau si `HOME` et pas d'ACTIVE, sinon liste) ; `openNode(id)` navigue vers la route `NODE` (`ScreenRenderer` + slot module) ; la complétion (`onQuizComplete`/`onModuleComplete`) dépile vers le graphe sans avance auto. Le natif Android (`GameFragment`, vues) liste la file sans ouverture auto. La file FIFO et `showHomeDashboard` existent et font foi. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Arrivée directe sur l'écran à jouer + enchaînement, même règle natif/PWA/iOS.
- Zéro transition moteur ajoutée, zéro event ajouté, reprise exacte préservée.

**Non-Goals:**
- Renderers joueurs manquants et plomberie images (suivi dédié ; fallback existant conservé).
- Modification de la file, du latch ou de l'évaluation (lecture seule).

## Decisions

### D1 — Nœud principal dérivé, pas déclaré

**Décision** : `nœudPrincipal(game, états) : start éligible non terminé > premier racine non terminé (sans dépendance entrante) > tête de file > null`. Aucune donnée auteur : le « principal » est une lecture du graphe + états, testable en pur. `HOME` présent → le tableau pilote (proposition existante), l'ouverture auto ne s'applique qu'au cas sans `HOME`… et à la reprise avec `HOME` ? Non : avec `HOME`, l'arrivée = tableau dans tous les cas (prédictible, spec).

**Alternative écartée** : champ auteur `nœudAccueil` — nouvelle donnée pour un calcul dérivable, source de dérive.

### D2 — Avance auto = même file, après écriture

**Décision** : à la complétion enregistrée (persistance d'abord), réévaluer et naviguer vers le premier éligible non terminé ; sinon tableau (`HOME`) ou liste (repli). Abandonner n'avance jamais (retour tableau/liste). Écran de fin inchangé sur `isEnding`.

**Alternative écartée** : modale « étape suivante ? » — un clic de plus à chaque étape, anti-immersif.

### D3 — Shared d'abord, natif suit

**Décision** : règle pure en `commonMain` (`noeudPrincipal`), câblage `GeoPlayApp` (route initiale + avance à la complétion, PWA/iOS héritent), puis même règle dans `GameFragment` Android (vues). Mêmes scénarios rejoués des trois côtés.

## Risks / Trade-offs

- [Racines multiples] → premier dans l'ordre des nœuds (déterministe, documenté).
- [Éligible non-jouable (module sans renderer)] → fallback existant (état non bloquant + Terminer), l'enchaînement ne cale pas.
- [GPS requis à l'arrivée] → pas d'éligible = repli liste, sans erreur (le joueur avance physiquement, la file suit).
