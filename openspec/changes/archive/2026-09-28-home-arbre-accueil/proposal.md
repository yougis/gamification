## Why

Dans le volet Étape du Composer, l'entrée « Écran global — Accueil » affiche un mini-visuel de l'écran au lieu d'être présentée comme les étapes : les étapes exposent un arbre (zones → widgets) cliquable qui ouvre le panneau détail correspondant, l'entrée globale n'offre que la pseudo-sélection globale. L'auteur ne peut pas atteindre un objet ou un module de l'écran global depuis la liste, alors que la sélection existe déjà côté canvas et côté détail.

## What Changes

- L'entrée « Écran global — Accueil » du volet Étape expose un sous-arbre repliable identique à celui des étapes (zones présentes dans l'ordre d'affichage, puis widgets avec libellé court, fantômes exclus) ; cliquer une zone ou un widget sélectionne la pseudo-sélection Accueil + cette zone/ce widget et ouvre le panneau détail correspondant (même sélection que le clic canvas).
- Le mini-visuel (`AccueilApercu`) est retiré du volet Étape, avec son bouton « Ouvrir » (supprimé pour le moment : l'ouverture se fait depuis le graphe, la liste ou la prévisualisation) ; le composant devenu sans usage est supprimé avec l'import mort de `App.tsx`.
- `libelleWidget` gagne le cas `"map"` (« carte »).
- Inchangés : le volet Screen (rendu WYSIWYG PhoneCanvas), la prévisualisation (`ApercuAccueil`, rendu identique au Screen), la pseudo-sélection, la validation et l'export.

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `studio-authoring`: l'entrée écran global du volet des étapes présente un arbre zones/widgets cliquable (mêmes modalités que les étapes) ouvrant le détail ; pas de visuel d'écran dans le volet Étape.

## Impact

- **Studio** : `NodeList.tsx` (arbre global + nouvelles props optionnelles), `App.tsx` (câblage `choisirAccueil` + zone/widget, suppression import mort), suppression `AccueilApercu.tsx`.
- **Specs** : `studio-authoring` (delta) ; graphe, validation, export, écrans joueurs inchangés.
- **Réseau** : aucun ; état replié local non persisté, comme pour les étapes.
