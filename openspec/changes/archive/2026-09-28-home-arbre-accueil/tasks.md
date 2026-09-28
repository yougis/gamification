## 1. Arbre global dans le volet Étape

- [x] 1.1 `NodeList` : sous-arbre repliable de `game.global.screen` sous l'entrée Accueil (zones présentes dans l'ordre, widgets + libellés, fantômes exclus, replié par défaut, état local non persisté), mêmes rôles/aria et clavier que les étapes
- [x] 1.2 Clics arbre global : nouvelles props optionnelles `onChoisirZoneAccueil`/`onChoisirWidgetAccueil` ; surlignage via `accueilSelectionne` + `selZoneId`/`selWidgetIndex` existants
- [x] 1.3 `App` : câbler les deux callbacks (`choisirAccueil()` + `setScreenZone`/`setScreenWidget` + dépli du détail, miroir des versions nœud)
- [x] 1.4 `libelleWidget` : cas `"map"` → « carte »

## 2. Retrait du visuel

- [x] 2.1 Retirer `<AccueilApercu>` (+ bouton Ouvrir) de l'entrée Accueil du volet ; supprimer `AccueilApercu.tsx` et l'import mort `App.tsx:59`
- [x] 2.2 Vérifier : volet Screen et Prévisualiser inchangés, rendus identiques ; tsc sans nouvelle erreur ; smokes `screen` verts ; smokes `screen` verts
