## 1. Sélecteur d'image unifié (design D1)

- [x] 1.1 Créer `ImagePicker` (parcours `<input type=file accept=image/*>` + dépôt DnD + vignette + refus non-image avec message) à API contrôlée (value, onChange(path), onPickFile) ; vérifier : dépôt et parcours retournent un File, `.pdf` refusé, `tsc --noEmit` passe
- [x] 1.2 Câbler `onPickFile` dans `App` (hash WebCrypto + `registerAsset` au manifest + `onChange("assets/<nom>")`, octets gardés pour l'export, repli explicite hors contexte sécurisé) ; vérifier : image déposée → manifest enrichi (path/size/sha256), `tsc --noEmit` passe
- [x] 1.3 Remplacer les saisies de chemin par `ImagePicker` (widget image, fond d'écran, image puzzle, réponse QCM image, logo branding) ; vérifier : chaque formulaire accepte parcours + dépôt avec prévisualisation, `tsc --noEmit` passe

## 2. Défauts et polices (design D2-D3)

- [x] 2.1 Afficher les défauts (`defaultWidget`/`defaultScreen` : placeholder + mention) avec retour unitaire par champ (optionnel → suppression de clé, requis → restauration) ; vérifier : retour taille 24 → héritage seul, autres champs intacts, `tsc --noEmit` passe
- [x] 2.2 Liste `FONT_OPTIONS` partagée (système, Georgia, serif, sans-serif, monospace + saisie libre en repli) dans `StyleToolbar`, propriétés texte et branding ; vérifier : même liste partout, « Georgia » renseigne `fontFamily`, `tsc --noEmit` passe

## 3. Bibliothèque de modèles (design D4)

- [x] 3.1 Registre étendu (prédéfinis immuables + `load/saveCustomTemplate` en `geoplay-screen-templates-v1`), `TemplatePicker` avec liste déroulante nommée + « Enregistrer comme modèle » (doublon enregistré = confirmation) ; vérifier : modèle « ACTE II » enregistré, retrouvé après rechargement, prédéfini non modifiable, `tsc --noEmit` passe
- [x] 3.2 Application par copie profonde (`structuredClone` → `node.screen`), modification = déclinaison sans mutation du modèle ; vérifier : variante d'un nœud n'affecte ni le modèle ni un autre nœud, undo restaure, `tsc --noEmit` passe

## 4. Vérification finale

- [x] 4.1 Rejouer les scénarios du delta (dépôt puzzle + manifest, refus PDF, retour unitaire, police Georgia, déclinaison, enregistrement modèle) ; vérifier chaque scénario et consigner le résultat
- [x] 4.2 Non-régression : `screen.smoke.ts` ALL OK, jeux existants sans image acceptés, `npx tsc --noEmit` + `npx vite build` dans `studio/` ; vérifier et consigner
