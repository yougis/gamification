## Why

Huit retours terrain sur le Studio montrent des comportements cassés ou inachevés : des textes d'écran insensibles au thème, des boutons de viewport trop verbeux, un aperçu puzzle vide dans le canvas, l'impossibilité d'ajouter un objet référencé ou plusieurs effets à une étape, une publication catalogue qui échoue en `NetworkError`, un mode terminal joueur qui ne démarre pas depuis le début du jeu, et un libellé parasite. Chacun bloque ou dégrade le travail d'auteur ; groupés, ils forment un lot de correctifs cohérent du Studio.

## What Changes

- **Textes d'écran et thème** : tout texte rendu dans les écrans du composer (canvas, terminal joueur) suit le thème actif ; aucun texte ne reste figé sur une couleur d'un autre thème.
- **Viewports en icônes** : les boutons de choix de viewport (téléphone/tablette, portrait/paysage) deviennent des boutons icônes compacts, libellé conservé en infobulle et `aria-label`.
- **Aperçu puzzle dans le canvas** : l'écran d'une étape PUZZLE affiche dans le canvas l'image définie dans les paramètres du module, découpée en tuiles mélangées ; sans image, l'état vide incitatif existant est conservé.
- **Ajout d'objet référencé** : le bouton « Ajouter un objet référencé » crée une ligne éditable (et non un tableau vide), réparable et supprimable.
- **Effets multiples** : une étape accepte N effets ; le bouton d'ajout reste disponible tant que l'auteur veut en ajouter (plus seulement à zéro effet).
- **Publication catalogue robuste** : le service accepte les appels navigateur (CORS + pré-vol) et le Studio normalise l'URL saisie (suffixe `/publish` retiré) ; l'échec restant affiche un message actionnable au lieu d'une `NetworkError` brute.
- **MODE JEUX depuis le début** : lancer le terminal joueur sans nœud actif ouvre le premier nœud éligible du jeu (au lieu de la salle d'attente) ; l'enchaînement des étapes en effectuant les modules reste piloté par la file existante.
- **Libellé** : le bouton « Essai du parcours (triche tracée) » devient « Essai du parcours ».

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-theme-toggle`: les textes des écrans suivent le thème actif.
- `studio-screen-builder`: sélecteur de viewport en boutons icônes compacts.
- `module-screen-plugins`: aperçu puzzle du canvas avec image mélangée (précision du rendu + résolution d'asset).
- `studio-authoring`: ajout d'objet référencé, effets multiples, entrée MODE JEUX depuis le premier nœud, libellé d'essai.
- `game-catalog`: publication robuste navigateur (CORS, normalisation d'URL, erreur actionnable).

## Impact

- **Code** : Studio uniquement (`App.tsx`, canvas WYSIWYG, renderers puzzle, client catalogue, service catalogue pour CORS) ; schéma graphe inchangé (aucun champ ajouté, aucun consommateur impacté).
- **Réseau** : le service catalogue répond aux pré-vols CORS ; rien ne change côté player.
- **Compatibilité** : jeux existants inchangés ; l'icône toolbox, les validations C1/C2 et l'export fichier sont non régressés par construction (aucune règle modifiée).
