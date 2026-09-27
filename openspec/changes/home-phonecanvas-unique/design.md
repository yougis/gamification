## Context

- `PhoneCanvas` supporte déjà le mode lecture seule (props `showGhosts={false}`, callbacks de sélection/édition absents — pattern éprouvé par `PlayerTerminal` pour les écrans d'étapes). Le Composer l'utilise en édition sur `game.global?.screen` (sélection, undo, viewports).
- `AccueilApercu` (`NodeList.tsx:208`, t=0 figé via `evaluate` + `calculerApercu`) et `ApercuAccueil` (`App.tsx:1766` Prévisualiser, `App.tsx:1795` salle d'attente Mode Jeux, props `nowMs/terminees/elus/teteFile/actif/onOuvrir`) rendent chacun leur markup texte ; `calculerApercu` (`game/apercu-accueil.ts`) est pur et testé.
- Les widgets liés (`map`, change archivé `widget-cartographie`) et `BlocsAcces` sont les consommateurs prévus des données d'essai dans l'écran.

## Goals / Non-Goals

**Goals:**
- Les 3 points d'aperçu HOME rendent le PhoneCanvas de `game.global.screen` en lecture seule, avec les données d'essai injectées en lecture.
- Suppression des markups tableaux parallèles ; `calculerApercu` inchangé.

**Non-Goals:**
- Nouveaux widgets ou nouvelles sources (le tableau/liste reste du ressort des changes widgets).
- Modification du Composer, de la pseudo-sélection, de la validation ou de l'export.
- Repli tableau historique (option A écartée : PhoneCanvas systématique, écran vide assumé).

## Decisions

1. **Enveloppes fines, pas nouveau composant** : `AccueilApercu` et `ApercuAccueil` deviennent des enveloppes (`PhoneCanvas` + props essai) plutôt qu'un 3e composant — les 3 call sites gardent leurs props, le diff reste local. Alternative (composant unique `ApercuHome`) rejetée : les deux signatures d'entrée diffèrent (t=0 calculé en interne vs état simu externe) et l'unification forcerait un refactor des appelants.
2. **Lecture seule stricte** : aucun callback d'édition/sélection passé au PhoneCanvas des aperçus ; `onOuvrir` existant conservé (rejoue le contrôle d'essai / sélectionne un nœud, comme aujourd'hui). Aucune écriture JSON possible par construction.
3. **Données via les widgets, pas via le canvas** : le PhoneCanvas ne reçoit aucune prop « essai » nouvelle ; ce sont les widgets liés et blocs dérivés rendus dedans qui consomment `calculerApercu` (mini : t=0 ; simu : état courant). Le canvas reste agnostique, comme en édition.
4. **Écran vide assumé** : pas de branche conditionnelle « écran vide → tableau texte » — supprime du code au lieu d'en ajouter, et rend l'état « HOME sans écran composé » visible (incite à composer).

## Risks / Trade-offs

- **Écran vide peu lisible** : un `global.screen` vide donne un PhoneCanvas vide ; mitigé par le bandeau existant « écran global — défaut des étapes » et le canvas d'édition adjacent — l'auteur voit immédiatement quoi composer.
- **Widgets liés manquants** : sans widget tableau/liste (changes futurs), l'écran composé ne montre pas les lignes d'étapes — l'aperçu reste fidèle à l'écran (c'est le but), la donnée essai restant consultable via les contrôles d'essai existants.
- **Salle d'attente Mode Jeux** : le PhoneCanvas lecture seule y remplace aussi le tableau texte ; la file cliquable existante (`file.map(Ouvrir)`) est conservée telle quelle sous l'aperçu.
