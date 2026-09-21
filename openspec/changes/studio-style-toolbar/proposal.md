## Why

Les réglages de style (couleur, typo, taille, graisse, alignement…) occupent aujourd'hui une ligne étiquetée par propriété — jusqu'à 8 lignes empilées par section de style, soit un panneau long et difficile à balayer. L'auteur a besoin d'un module de gestion de style compact, groupé comme une barre d'édition de texte riche, sans perdre l'héritage Global → Écran → Widget.

## What Changes

- **Barre d'outils de style** : les contrôles de style sont regroupés en une barre compacte genre éditeur de texte riche — groupe typographie (police, taille, gras), groupe couleur (texte, fond), groupe alignement (gauche/centré/droite), groupe retrait de surcharge — au lieu d'une ligne par propriété.
- **Même sémantique d'héritage** : chaque contrôle affiche la valeur résolue et son origine (badge Global/Écran/Widget/défaut) ; renseigner = surcharger le niveau édité, effacer = retomber sur l'héritage. Aucun changement du modèle `styles` ni du schéma.
- **Un seul module réutilisé** : la barre remplace le rendu actuel dans les trois sections (Global/Écran/Contenu) et pour les customs de module, via la même API (niveau, local, résolu, origines, champs, onChange).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-screen-builder` : présentation des sections de style du panneau de propriétés (barre d'outils compacte groupée au lieu d'une ligne par propriété, sémantique d'héritage inchangée).

## Impact

- **Code** : `studio/src/components/wysiwyg/StyleFields.tsx` (remplacé/étendu par le module barre d'outils), `PropertiesPanel.tsx` (branchement, même API de props).
- **Schéma graphe** : aucune modification — modèle `styles` et héritage inchangés ; aucun consommateur impacté.
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre.
- **Réseau** : aucun — édition 100 % locale.
- **Dépendance** : s'appuie sur les sections de style du change `studio-screen-editor` (et `studio-screen-selection-zones` pour le panneau) sans les rouvrir.
