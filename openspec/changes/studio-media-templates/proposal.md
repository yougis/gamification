## Why

Composer un écran oblige aujourd'hui à saisir les chemins d'images à la main (aucun parcours, aucun dépôt), les formulaires n'affichent pas leurs valeurs par défaut ni ne permettent d'y revenir champ par champ, les polices se saisissent en texte libre, et les modèles de mise en page sont figés (appliquer puis modifier altère le modèle d'usage sans distinction, sans possibilité d'enregistrer une variante comme modèle réutilisable).

## What Changes

- **Sélecteur d'image unifié** : tout formulaire acceptant une image (widget image, fond d'écran, image puzzle, réponse QCM image, logo branding) propose parcours du poste client ET dépose (drag-and-drop) avec prévisualisation ; le fichier devient un asset du pack (enregistré au manifest via `registerAsset`, chemin stocké dans le JSON).
- **Défauts visibles et réversibles** : chaque formulaire affiche ses valeurs par défaut ; tout champ modifié propose un retour unitaire à la valeur par défaut du module (sans toucher aux autres champs).
- **Liste de polices prédéfinies** : les champs de police (widget, styles, branding) proposent une liste fermée de polices prédéfinies (saisie libre conservée en repli).
- **Bibliothèque de modèles** : modèles prédéfinis embarqués + modèles enregistrés par l'auteur (« Enregistrer comme modèle », persistance locale) ; liste déroulante des modèles nommés. Appliquer un modèle puis le modifier crée une déclinaison (l'écran du nœud diverge, le modèle reste intact) ; modifier un modèle passe par un nouvel enregistrement (les prédéfinis sont immuables).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-screen-builder` : sélection d'image (parcours + dépôt, asset + manifest), défauts affichés avec retour unitaire, liste de polices prédéfinies, bibliothèque de modèles nommés avec déclinaison et enregistrement comme modèle.

## Impact

- **Code** : `studio/src/components/wysiwyg/` (nouveau `ImagePicker`, formulaires image existants, `StyleToolbar` + propriétés pour liste de polices et retours défaut, `TemplatePicker` + bibliothèque), `App.tsx` (manifest, hash du fichier), `game/screen-templates.ts` (registre + persistance locale).
- **Schéma graphe** : aucune modification — chemins d'assets (strings existantes), `styles` et `screen` inchangés ; manifest enrichi via le pipeline existant ; aucun consommateur cassé.
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre.
- **Réseau** : aucun — fichiers lus localement (FileReader/WebCrypto), persistance locale, offline-first inchangé.
- **Dépendance** : s'appuie sur `studio-screen-editor` (panneaux, styles) et `studio-screen-selection-zones` (fantômes, TemplatePicker par nœud) sans les rouvrir.
