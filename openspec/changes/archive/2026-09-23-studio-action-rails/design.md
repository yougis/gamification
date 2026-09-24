## Context

Voir `proposal.md` (Why). État issu du change `studio-composer-ux` (terminé) : `RailReplie` (icône panneau + chevron, même action) dans `studio/src/components/Repli.tsx`, 3 call sites dans `App.tsx` (graphe/liste/détail) ; toolbar flottante du graphe = pastille + Recentrer + Aligner H/V + chevron, toujours visible panneau ouvert ; `activeFamille` est un état interne de l'`Inspecteur` ; les actions `ajouterEtape`, `setVueCentrale`, `setEcran` vivent dans `App` (même portée que les rails).

## Goals / Non-Goals

**Goals:**
- Chaque rail expose les sous-menus iconiques de son panneau, sans déplier pour les actions.
- Zéro nouvelle icône (set existant), zéro nouveau persistant.
- Toolbar graphe pertinente par vue.

**Non-Goals:**
- Aucun changement au schéma, graphe, validation, MCP, écrans mobiles (onglets, pas de rails).
- Pas de refonte de l'Inspecteur au-delà de la sélection de famille pilotable.
- Les champs texte (recherche, filtre) restent panneau-ouvert, sans équivalent rail.

## Decisions

### 1. API `RailReplie` étendue, chevron supprimé des rails

`RailRepli`e reçoit `actions: { icone, titre, actif?, onAction }[]` rendues entre l'icône panneau et le bas du rail (boutons `btn`, tooltips, `aria-current` si `actif`). Le `ChevronRepli` sort du rail : l'icône panneau (tooltip « déplier ») devient l'unique commande de dépliage tel quel. Les chevrons restent sur les panneaux ouverts uniquement.
Alternative écartée : garder chevron + icône panneau (deux tab-stops pour la même action — constaté comme bruit dès le change précédent).

### 2. Sémantique par nature d'icône (pas de mode)

- *Action* (créations liste, pastille) : `onAction` appelle directement le handler existant (`ajouterEtape("lieu")`, `setEcran("valider")`), sans toucher `mep.repliees`.
- *Vue* (vues graphe, familles détail) : `onAction` = déplier (`basculerSection` si replié) **puis** activer (`setVueCentrale`, famille active). L'ordre garantit que la cible existe au montage.
Pas de prop `mode` : l'appelant choisit le handler, le rail reste sémantiquement neutre.

### 3. Sélection de famille remontée à `App`

Le rail détail vit dans `App`, `activeFamille` dans `Inspecteur` : l'état remonte (`activeFamille` + `setActiveFamille` en props d'`Inspecteur`, initial `FAMILLES[0].id` conservé). Le rail appelle `déplier + setActiveFamille(id)`. Coût : signature `Inspecteur` étendue aux 2 call sites existants (mode screen + mode graphe).
Alternative écartée : « famille demandée » consommée au montage (état fantôme, course entre clics rapides, plus complexe à tester).

### 4. Contenus curatés, chutes définies

- liste : panneau + 4 créations (toujours valides, `ajouterEtape` indépendant du panneau).
- détail : panneau + 9 familles si nœud sélectionné, sinon panneau seul (placeholder, WYSIWYG : pas de familles à activer).
- graphe : panneau + 3 vues + pastille (Recentrer/Aligner restent toolbar-only, pas de nouvelles icônes).
- Toolbar : `{vueCentrale === "graphe" && (...Recentrer/Aligner...)}`, pastille + chevron hors condition. Règle Aligner (< 2 = désactivé + tooltip) inchangée.

## Risks / Trade-offs

- [Rail détail à 10 icônes trop haut] → Mitigation : précédent Inspecteur (9 icônes `h-9` ≈ 340 px) ; rail scrollable en dernier recours, jamais de pagination.
- [Clic famille sans nœud entre-temps] → Mitigation : le rail détail n'affiche les familles que si sélection non nulle au rendu ; clic = déplier + sélectionner, atomique dans le handler.
- [Remontée `activeFamille` casse la navigation clavier des tabs] → Mitigation : logique clavier inchangée dans `Inspecteur` (opère sur la prop), tests manuels flèches conservés en 5.x du change précédent comme référence.
- [Actions directes depuis rail = erreurs sans contexte] → Accepté : créations et pastille sont déjà sûres hors panneau (pas de saisie requise, undo disponible).

## Migration Plan

Ordre (chaque étape livrable, pure UI) :
1. `RailReplie` étendu + suppression du chevron de rail (3 call sites adaptés, comportement identique).
2. Actions liste (4 créations directes) + pastille/vues graphe (déplier-activer).
3. Remontée `activeFamille` + familles du rail détail (+ chute icône seule).
4. Toolbar conditionnelle `vueCentrale`.
Rollback : revert Git par étape ; aucun persistant ajouté (mémoire accordéons et `mep.repliees` inchangés).
