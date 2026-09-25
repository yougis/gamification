## Context

Voir proposal.md (Why) pour la motivation. État actuel observé dans `studio/src/App.tsx` (écran `exporter`) :
- Checklist « Contrôle pré-export » : tableau statique (lignes C1/C2 toujours OK, « 2 nœuds en statut draft », « holdMode: none — kiosque nécessite reviewed ») — ne reflète jamais le jeu courant.
- Aperçu manifeste : exemple statique (`game.json v2.4.1`, `assets/intro.mp4`, `assets/map.png`, sha fictif).
- Bouton final `disabled={true}` inconditionnel : l'écran ne peut jamais exporter.
- En revanche la règle centrale `canExport(game, meta, animateur)` (`studio/src/game/mcp.ts`) et l'opération `exportPackFull` existent et sont déjà consommées (barre globale, Relire). Le bouton Exporter de la barre globale ouvre l'écran Exporter au lieu de transférer directement.

## Goals / Non-Goals

**Goals:**
- Faire de l'écran Exporter la porte unique fonctionnelle, branchée sur l'état réel.
- Des messages de blocage qui nomment la règle applicable (jamais de mention kiosque quand HOLD inactif).
- Aucun changement de la règle d'export elle-même.

**Non-Goals:**
- Modifier `canExport`, `validateGame` / `validateGameFull`, ou le schéma Draft-07.
- Refonte visuelle de l'écran Exporter au-delà du branchement sur l'état réel.
- Toucher au packaging offline (manifest, SHA-256, diff) ou au runtime.

## Decisions

- **Source unique : `canExport` + verdicts existants.** La checklist lit `blocage`/`raisonsBlocage` (déjà mémoïsés), les verdicts C1/C2 (`couches`/`detailCouches`) et les verdicts canaux (`canExportToChannel`, déjà calculés dans l'écran) au lieu d'un tableau statique. Alternative écartée : dupliquer une logique d'éligibilité dans l'écran (dérive garantie).
- **Ligne kiosque conditionnelle.** La condition « jeu relu » n'apparaît que si `game.global.holdMode != "none"` (et seulement dans ce cas) ; sinon seul le décompte `draft` nommé apparaît. Ceci répare la contradiction observée sans changer la spec HOLD.
- **La barre globale navigue, l'écran exécute.** Le bouton Exporter de la barre globale continue d'ouvrir l'écran Exporter (porte unique, conforme à la spec) ; le bouton de l'écran appelle `exportPackFull` puis affiche le `{path, version, size, sha256}` réel retourné, en conservant l'état désactivé + raison tant que `canExport` échoue (ou `!animateur` quand il échoue).
- **Aperçu manifeste calculé.** Le résumé « fichiers à produire » est dérivé du jeu courant (game.json + assets enregistrés) plutôt que de l'exemple statique ; le détail exact des lignes reste au niveau implémentation.

## Risks / Trade-offs

- [Risk] Double emploi visuel entre le bouton barre globale (navigue) et le bouton écran (exécute) → Mitigation : libellés distincts (« Exporter » vs « Générer le pack ») et aide contextuelle rappelant la porte unique.
- [Risk] L'aperçu « fichiers à produire » avant génération peut diverger du manifest final (tailles/sha inconnus avant build) → Mitigation : afficher chemins + versions avant, `{size, sha256}` réels seulement après génération, comme l'exige la spec.
- [Risk] Régression tsc (baseline ~101 erreurs préexistantes) → Mitigation : comparer le compteur avant/après, zéro nouvelle erreur.
