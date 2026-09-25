## Context

État observé : entre les étapes, le player affiche la liste d'états (GameGraphScreen partagé) + GPS texte (PWA) + icône toolbox en overlay (change archivé). Aucun temps affiché nulle part en UI ; le moteur évalue les `TIMER` (`ancre + délai`, `GAME_START` ou `NODE_COMPLETION`) sans jamais exposer le restant. `presentation` est un enum C1 fermé (`MAP…TIMELINE`). Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Un écran d'accueil joueur par défaut, même règle natif/PWA, calculs purs partagés.
- Comptes à rebours dérivés des conditions existantes, zéro nouvelle donnée auteur.

**Non-Goals:**
- Fond cartographique (suivi MapLibre différé ; le tableau liste les POI avec états).
- Temps limites d'épreuve dans le tableau (restent aux modules, dans les écrans d'étapes).
- Nouveau type de module (le tableau est du chrome player, pas un nœud).

## Decisions

### D1 — Présentation, pas module

**Décision** : `HOME` est un mode de présentation comme `TOOLBOX`, pas un type de module du registre. Les modules sont liés aux nœuds (validation, cycle) ; un module sans nœud serait invalide par construction. Précédent assumé : `player-inventory-toolbox` (règle + overlay, aucun module).

**Alternative écartée** : type `HOME` au registre — exigerait un nœud hôte fictif, fausserait atteignabilité et pools.

### D2 — Compte à rebours = lecture des TIMER

**Décision** : pour chaque POI non terminé, le restant est `max(0, ancre + délai − nowMs)` sur la première condition `TIMER` non satisfaite (`GAME_START` → ancre 0 ; `NODE_COMPLETION` → `completedAt`, absent = affichage « — » tant que l'ancre n'existe pas). Fonction pure partagée (Kotlin + miroir TS), testable sans UI.

**Alternative écartée** : champ auteur `afficheCompteRebours` — donnée redondante avec les conditions, source de dérive.

### D3 — Temps écoulé = horloge session existante

**Décision** : `nowMs` de la boucle d'évaluation (PWA) / `System.currentTimeMillis() − gameStartMs` (natif) — aucune nouvelle horloge, reprise exacte par construction.

### D4 — Overlay, pas navigation (comme la toolbox)

**Décision** : le tableau est la vue par défaut quand aucune modale ACTIVE ; ouvrir une étape passe par la file existante. Aucune transition, aucun event ajouté. Fermer/revenir = reprise exacte.

## Risks / Trade-offs

- [POI multi-TIMER] → on affiche le restant de la première condition non satisfaite ; documenté (pas de somme ni de max).
- [Ancre NODE_COMPLETION future] → « — » tant que l'ancre n'est pas complétée (pas de compte à rebours fictif).
- [`HOME` sans autre présentation] → tableau seul, liste des POI avec états (dégradation saine, pas d'écran vide).
