## 1. Registre et schéma

- [ ] 1.1 Créer `info.json` (`schemaVersion`, `steps[]` avec au moins un contenu par étape, `additionalProperties: false`), enregistrer INFO dans `registry.json` + `module-registry.ts` (aucun besoin capteur), et vérifier C1 accepte des steps valides et rejette `backgroundImage` ad hoc
- [ ] 1.2 Migrer le nœud `start` de Sherlock (`backgroundImage` → `steps`) et vérifier C1+C2 à 0 erreur comme la baseline

## 2. ScreenPlugin INFO

- [ ] 2.1 Implémenter `plugins/info.tsx` (defaultScreen story, editorPreview statique paginé 1/N sans lecture auto, propertiesPanel étapes avec sélecteurs pack, playerRenderer swipe + « Suivant » + lecture à la demande, `onComplete` en fin), et vérifier chaque surface (canvas, panneau, terminal joueur simulé)
- [ ] 2.2 Faire passer vidéo/audio par le circuit manifest (filtre par extension, SHA-256, gabarit affiché, refus hors-pack nommé) et vérifier export avec un pack contenant une vidéo et un audio

## 3. Non-régression

- [ ] 3.1 Rejouer un récit 3 étapes (swipe puis bouton jusqu'à `onComplete`) et vérifier aucun autoplay, aucun état de jeu dans l'aperçu, et compat NATIVE/PWA inchangée (INFO sans capteur = compatible partout)
