## ADDED Requirements

### Requirement: Plugin INFO récit multimédia

Le screenPlugin du module INFO SHALL servir de référence récit avec :
- Un defaultScreen story portant le ModuleWidget (header titre, content ModuleWidget, footer navigation).
- Un editorPreview statique paginé affichant la première étape (texte + visuel) avec compteur `1/N`, sans lecture média automatique ni interaction (swipe désactivé dans le canvas auteur) ; état vide incitatif sans étape.
- Un propertiesPanel d'édition des étapes : texte multiligne, `ImagePicker` pour `image`, sélecteurs de fichiers pack pour `video`/`audio` (même circuit manifest SHA-256 que les images, non-média refusé), ajout/suppression/réordonnancement d'étapes, chaque étape exigeant au moins un contenu.
- Un playerRenderer paginé : swipe horizontal ET bouton d'action « Suivant » (les deux SHALL avancer), lecture vidéo/audio à la demande du joueur (jamais automatique), dernière étape validée SHALL appeler `onComplete`.
- Des customizableStyles pour backgroundColor, textColor, fontSize.

Les médias SHALL être des assets du pack (jamais d'URL réseau dans les données) ; un média référencé absent du manifest SHALL être refusé à l'export avec le fichier fautif nommé.

#### Scenario: Récit texte et images dans le WYSIWYG
- **GIVEN** un nœud INFO avec 3 étapes (texte seul, texte + image, image seule)
- **WHEN** l'auteur l'ouvre dans le canvas
- **THEN** la première étape s'affiche avec le compteur `1/3`, sans lecture ni geste, et le panneau propose l'édition des 3 étapes

#### Scenario: Joueur swipant puis bouton
- **GIVEN** le même nœud côté joueur sur l'étape 1/3
- **WHEN** le joueur swipe puis touche « Suivant » sur l'étape 2/3
- **THEN** il atteint 2/3 puis 3/3, et valider la 3/3 appelle `onComplete`

#### Scenario: Média hors-pack refusé
- **GIVEN** une étape avec `video: "https://exemple.fr/film.mp4"` ou un fichier absent du manifest
- **WHEN** l'export du pack tourne
- **THEN** l'export est refusé avec le fichier fautif nommé

#### Scenario: Étape vide refusée
- **GIVEN** une étape `{}` sans texte, image, vidéo ni audio
- **WHEN** l'auteur tente de valider la configuration
- **THEN** le formulaire signale l'étape vide et le JSON reste inchangé
