## Context

- `NodeList.tsx` : arbre par étape (`ORDRE_ZONES`, `NOM_ZONE_ARBRE`, `libelleWidget`, état local `deplies`, callbacks `onChoisir` + `onChoisirZone`/`onChoisirWidget`, surlignage via `sel`/`selZoneId`/`selWidgetIndex`) ; entrée Accueil = pseudo-bouton + `<AccueilApercu>` (`NodeList.tsx:208`), props `accueilSelectionne`/`onChoisirAccueil`.
- `App.tsx:1606` : `onChoisirZone`/`onChoisirWidget` appellent `choisirNoeud(id)` + `setScreenZone/Widget` + dépli du détail ; `choisirAccueil` (l.736) pose `selAccueil` et réinitialise zone/widget ; le détail global (`App.tsx:1486+`) lit déjà `screenZone`/`screenWidget` sur `game.global.screen`.
- `AccueilApercu.tsx` sans autre usage que `NodeList:208` (`App.tsx:59` = import mort pré-existant) ; `ApercuAccueil.tsx` (Prévisualiser) intact.

## Goals / Non-Goals

**Goals:**
- Arbre global cliquable dans le volet Étape, même sélection que le canvas, détail global affiché.
- Suppression du visuel et du bouton Ouvrir de l'entrée ; suppression du composant mort + import mort ; cas `map` dans `libelleWidget`.

**Non-Goals:**
- Expansion du volet de la carte dans l'arbre (zones → widgets uniquement, comme les étapes ; le volet s'édite dans le détail via `MapWidgetProperties`).
- Toucher au volet Screen, à Prévisualiser, à la pseudo-sélection, à la validation/au export.

## Decisions

1. **Factorisation locale, pas de composant arbre générique** : le rendu d'arbre des étapes est inline dans `NodeList` ; l'arbre global duplique ce motif avec `game.global.screen` comme source et `choisirAccueil` comme base de sélection. Alternative (composant `ArbreEcran` partagé) rejetée : les deux call sites diffèrent (id de nœud vs pseudo-sélection) et la factorisation forcerait une abstraction prématurée pour deux usages.
2. **Nouvelles props optionnelles** (`onChoisirZoneAccueil?`, `onChoisirWidgetAccueil?`) plutôt que réutiliser `onChoisirZone(id, z)` avec sentinelle : pas de valeur magique, appelants existants inchangés ; `App` les câble comme les versions nœud (`choisirAccueil()` + `setScreenZone/Widget` + dépli du détail).
3. **Surlignage via props existantes** : `selZoneId`/`selWidgetIndex` lus avec `accueilSelectionne` comme garde (miroir de `sel === n.id`), aucun nouvel état de sélection.
4. **État replié local** : clé dédiée à côté de `deplies` (l'entrée n'est pas un nœud), jamais persistée ; replié par défaut comme les étapes.
5. **Suppression franche** : `AccueilApercu.tsx` supprimé (zéro usage restant) + import `App.tsx:59` retiré ; le bouton Ouvrir n'est pas déplacé (décision utilisateur : suppression pour le moment).

## Risks / Trade-offs

- **Dérive visuelle arbre étapes vs arbre global** : duplication assumée à deux exemplaires ; si un troisième arbre apparaît, factoriser (dette notée, non traitée ici).
- **Découverte** : l'arbre global n'apparaît que sous `HOME` (comme l'entrée elle-même) — sans `HOME`, rien ne change dans le volet.
