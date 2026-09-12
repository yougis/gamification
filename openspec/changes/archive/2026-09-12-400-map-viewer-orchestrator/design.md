## Context

Voir `proposal.md` (Why). Specs 000/100 normatives pour la sémantique ; 300 pour
le stockage ; skill `geoplay-runtime-engine` pour le cadrage. Contrainte : deux
implémentations (iOS/Android) sans divergence observable.

## Goals / Non-Goals

**Goals:**

- Boucle d'évaluation déterministe et testable sans mobile (logique pure).
- Présentation prévisible (FIFO documenté) et guidance non bloquante.
- Capteurs sobres avec politiques lisibles depuis le JSON.

**Non-Goals:**

- Le contenu des modules (500), le packaging (300), les seuils batterie/SOS (640).
- La carte au-delà de position + trace + POI + fallback uni.

## Decisions

- **FIFO pour la file, tranché ici.** Pourquoi : la question ouverte du 000
  exigeait une décision d'exécution ; FIFO est la plus prévisible et testable.
  Alternative rejetée : priorité env/graphe — non déterministe à spécifier.
- **Logique d'évaluation pure, I/O capteurs injectés.** Pourquoi : rejouable en
  test (positions/horloges scriptées) sur les deux OS sans duplication.
  Alternative rejetée : évaluation couplée aux callbacks OS — intestable.
- **GPS adaptatif + gating strict.** Pourquoi : batterie 8 h et anti-faux-positifs
  en cour fermée ; un fix imprécis n'active jamais, il attend en l'indiquant.
- **Boussole service partagé, jamais condition.** Pourquoi : guidance et énigme
  consomment le même flux sans que l'orchestrateur voie un cap (décision 000).
- **Hôte de modules isolé.** Pourquoi : un module qui crash ne tue ni la boucle
  ni la progression ; nœud marqué non jouable, jeu continué.

## Risks / Trade-offs

- [Dérive iOS/Android sur fonds OS (geofencing système)] → Mitigation : boucle
  propre au runtime, OS seulement en source de fixes.
- [File FIFO frustrante si nœud prioritaire attend] → Mitigation : choix graphe
  restant explicite (menu), FIFO seulement pour l'auto.
- [Boussole instable près du métal] → Mitigation : flèche masquée + distance,
  jamais de validation orchestrateur.
