## Context

État observé : C1 `nodes minItems:1 + contains isEnding` (`game-schema.json:155`), C2 `isEnding` + atteignabilité (`validate.ts:271`), import refusant l'invalide, bouton ▶ Mode Jeux `disabled={!activeId && !file.length}` (`App.tsx:1701`), nœud `start` imposé et dernier nœud insupprimable. Côté player : arrivée HOME → tableau (vide valide), `noeudPrincipal` → null propre, `evaluate` sur zéro nœud sans erreur. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- HOME-seul valide, prévisualisable et jouable ; jeux à étapes garantis comme avant.
- Zéro changement moteur/player (déjà tolérants).

**Non-Goals:**
- Gabarit « nouveau jeu d'accueil » (suppression suffit ; suivi éventuel).
- Personnalisation du tableau vide au-delà de l'écran global existant.

## Decisions

### D1 — Conditionner, jamais relâcher globalement

**Décision** : C1 en `if/then` sur `HOME` (même pattern que `tileStrategy`/`radius`, `dureeTotale`/`finDeTemps`) ; C2 saute `isEnding`/atteignabilité ssi `HOME` + `nodes` vide. Toute autre combinaison garde les règles actuelles au caractère près.

**Alternative écartée** : `minItems: 0` global — un graphe vide deviendrait exportable par accident pour tous les jeux.

### D2 — Garde suppression symétrique à isEnding

**Décision** : même UX que « seul isEnding » (refus + message), inversée sous HOME (confirmation + rappel d'invalidité sans HOME). Le validateur reste l'arbitre final à l'export.

### D3 — Bouton Mode Jeux piloté par HOME, pas par la file seule

**Décision** : `disabled = !activeId && !file.length && !homeActif`. Le terminal ouvert sans actif affiche le tableau quand HOME (sinon salle d'attente comme aujourd'hui — ce cas ne change pas car sans HOME la file vide reste possible transientement).

## Risks / Trade-offs

- [Session infinie] → assumée et journalisée au démarrage (pas d'attente de fin) ; sortie par Quitter.
- [Retrait de HOME d'un jeu vide] → invalide C1 aussitôt, message standard ; l'auteur est prévenu à la suppression, pas de surprise différée.
- [Player sans nœud] → tableau vide = écran valide (temps, pas d'Ouvrir) ; aucun crash possible, `evaluate` testé sur collections vides.
