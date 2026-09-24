## Context

Voir `proposal.md` (Why). État vérifié en lecture seule : `<Controls showInteractive={false} />` existe déjà dans l'arbre ReactFlow (`@xyflow/react` v12, `ControlButton` exporté — point d'intégration natif) ; la toolbar flottante custom (pastille + Recentrer + Aligner + chevron) lui fait doublon. Causes racines des bugs confirmées : `activeFamille` absent des deps du memo `detail` (figement familles après remontée 2.3) ; pile Valider lisant `e.sev/e.id/e.nodeId/e.message` sur des `string[]` (+ badges Pass/Fail et compte C1 codés en dur dans le même bloc) ; `terminer` finissant par `setActiveId(null)` sans réouverture. `erreurFR` fournit déjà les textes explicites ; `listeErreurs` fournit déjà le pattern navigation fautif (« Voir {id} » + `choisirNoeud`). Icônes `annuler`/`retablir` déjà dans le set (style stroke 1.7).

## Goals / Non-Goals

**Goals:**
- Chaque bug corrigé à sa cause racine, chaque réagencement à part unique (zéro doublon neuf).
- `tsc --noEmit` au baseline, smokes verts, revue visuelle des 8 points.

**Non-Goals:**
- Aucun changement métier (mêmes opérations MCP, mêmes validations, mêmes JSON), pas de nouvelle icône, pas de nouveau persistant.
- Pas de refonte des renderers joueurs par type (le chemin `onComplete` est vérifié, pas réécrit, avec fallback conservé).
- Familles et Verdicts : restauration/alignement sur spec existante, sans toucher au texte normatif.

## Decisions

### 1. Contrôles natifs ReactFlow (item 1)

`<Controls>` existant étendu : bouton fit natif (`showFitView`, remplace Recentrer custom + `rfRef.fitView`) et deux `ControlButton` custom (Aligner H/V, `title` + `disabled` + règle < 2 sélectionnés repris à l'identique). Toolbar flottante supprimée ; chevron seul en overlay (panneau, pas toolbar). Condition vue `graphe` conservée (pas de contrôles custom en carte/screen).
Alternative écartée : garder l'overlay en le déplaçant dans la barre de vues (doublon persistant avec les contrôles natifs).

### 2. Entête recomposée (items 2–4)

Pastille déplacée telle quelle (même composant `PastilleValidation`) à côté nom/compteurs ; compteurs existants inchangés. Nom : `size` dynamique (`Math.max(4, name.length + 2)`-style, même pattern que l'input d'identifiant du nœud dans l'Inspecteur) remplaçant `w-40` fixe. Undo/Redo : icônes `annuler`/`retablir`, `disabled`, tooltips et `aria-label` conservés, libellés texte supprimés.

### 3. AJOUTER à source unique panneau ouvert (item 5)

Les 4 boutons déménagent dans le header de `NodeList` (props `ajouterEtape` déjà appelée, nouvelle prop callback ou import direct selon le découpage : `NodeList` reçoit `onAjouter(preset)`). Suppressions : rangées App-memo (`liste`, `listeSimple`) uniquement. Nav repliée et rail replié conservent leurs icônes (accès états repliés, specs existantes inchangées).

### 4. Correctifs à cause racine (items 6–8, pas de spec)

- Familles : ajouter `activeFamille` aux deps du memo `detail` (préserve l'intention perf anti-drag : recompute seulement au changement d'onglet).
- Valider : rendre les chaînes `erreurs` (texte `erreurFR` + résolution fautif réutilisée de `listeErreurs` + clic `choisirNoeud` + bascule Composer) ; calculer badges C1/C2 et compte C1 depuis `couches`/`rapport` au lieu du dur.
- Preview : `terminer` rouvre le premier éligible de `file` (après application tirages/effets) au lieu de `null`, abandon inchangé ; audit du câblage `onComplete` par type socle (QUIZ rendu en premier, fallback `PlayerFallback` conservé sinon).

## Risks / Trade-offs

- [ControlButton custom vs style natif] → Mitigation : classes `btn` existantes + `title`, rendu comparé visuellement aux contrôles natifs.
- [Nom auto-largeur qui pousse les compteurs] → Mitigation : `max-width` + ellipsis au-delà (~40ch), pastille et compteurs en `shrink-0`.
- [Avance auto surprenante (fin de branche)] → Mitigation : si aucun éligible, retomber sur l'attente existante (comportement actuel conservé comme chute).
- [Pile Valider : doublon visuel avec `listeErreurs`] → Accepté transitoirement : la pile devient la vue primaire cliquable, `listeErreurs` reste ; unification éventuelle en suivi, pas ici.

## Migration Plan

Ordre (chaque étape livrable, `tsc` + smoke ciblé) :
1. Memo `detail` (1 mot, effet immédiat familles).
2. Valider (rendu pile + badges calculés).
3. Preview avance auto (+ audit `onComplete`).
4. Contrôles natifs (suppression overlay).
5. Entête (pastille, nom, flèches).
6. AJOUTER consolidé.
7. Revue globale 8 points + smokes + tsc.
Rollback : revert Git par étape ; aucun persistant, aucun JSON touché.
