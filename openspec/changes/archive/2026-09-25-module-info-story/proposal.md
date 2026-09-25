## Why

Le module INFO est le parent pauvre du registre : sans entrée registre, sans sous-schéma (données libres non validées) et sans screenPlugin (placeholder générique dans le canvas). Pourtant c'est le module du récit — briefings, consignes, interludes : il doit porter du texte riche multimédia (images, vidéo, bande sonore) paginé, pas un écran vide à contourner avec des widgets manuels.

## What Changes

- Enregistrement d'INFO au registre avec sous-schéma versionné `info.json` : `steps[]` ordonnées, chaque étape `{ text?, image?, video?, audio? }` (au moins un contenu requis), navigation par swipe horizontal ET bouton d'action « Suivant » (les deux, pas l'un ou l'autre).
- Nouveau screenPlugin INFO : `defaultScreen` story (header titre, content ModuleWidget, footer navigation), `editorPreview` statique paginé (première étape + compteur, jamais de lecture média auto), `propertiesPanel` (édition des étapes : texte, ImagePicker image, sélecteurs vidéo/audio via le circuit manifest), `playerRenderer` (swipe + « Suivant », lecture média à la demande, fin des étapes = `onComplete`).
- Médias 100 % pack offline : vidéo/audio référencés comme assets manifestés (SHA-256, même circuit que les images) ; aucun streaming, aucune URL réseau dans les données.
- **BREAKING (dev uniquement, assumé)** : les données INFO libres existantes (ex. `backgroundImage` ad hoc) deviennent invalides en C1 et devront être migrées vers `steps` (le jeu Sherlock est concerné : 1 nœud).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `module-registry` : entrée INFO (sous-schéma versionné, screenPlugin, besoins : aucun capteur).
- `module-screen-plugins` : screenPlugin INFO de référence récit (aperçu, panneau, renderer, styles).

## Impact

- Studio : nouveau plugin `plugins/info.tsx`, `registry.json` + `info.json`, formulaire étapes, export manifest incluant vidéo/audio (gabarits affichés avant validation comme pour les images).
- Schéma graphe : racine Noeuds/Liens inchangée (montage `$ref` existant) ; C1 INFO devient stricte — consommateurs : validateur AJV des deux côtés (Studio + players), jeu Sherlock à migrer.
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW ; aucun nouveau type (INFO existait comme type nu).
- Aucune connexion réseau côté joueur (médias embarqués) ; côté auteur, fichiers locaux uniquement.
- Aucune dépendance à un change précédent non archivé.
