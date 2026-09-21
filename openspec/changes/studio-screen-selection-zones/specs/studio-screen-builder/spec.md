## MODIFIED Requirements

### Requirement: Sélection de template

Le Studio SHALL fournir un sélecteur de template (TemplatePicker) permettant de choisir parmi des templates de mise en page prédéfinis. Les templates disponibles SHALL inclure au minimum :
- `"basic-story"` : fond, header avec titre, zone content scrollable
- `"quiz-focus"` : fond sombre, header avec compteur, zone content pour quiz, footer avec navigation
- `"map-fullscreen"` : carte en plein écran avec overlay de contrôle
- `"clue-focus"` : fond sombre, zone content pour indices avec texte et images
- `"inventory-view"` : fond sombre, header avec titre, zone content avec grille d'objets

La sélection d'un template SHALL remplacer les zones et le layout du screen courant par ceux du template. Les customisations existantes seront perdues (confirmation requise si des modifications existent).

Le panneau WYSIWYG SHALL exposer le sélecteur de template au niveau du nœud (quand aucun widget n'est sélectionné) : appliquer un template remplace zones + layout de l'écran du nœud courant, avec confirmation si l'écran est déjà personnalisé.

#### Scenario: Sélection d'un template

- **GIVEN** un nœud avec un screen vide
- **WHEN** l'auteur sélectionne le template "quiz-focus"
- **THEN** les zones (header, content, footer) et le layout sont remplacés par ceux du template "quiz-focus"

#### Scenario: Sélection avec modifications existantes

- **GIVEN** un nœud avec un screen personnalisé (3 widgets dans header)
- **WHEN** l'auteur tente de sélectionner un template
- **THEN** une confirmation affiche "Les modifications actuelles seront perdues. Continuer ?"

#### Scenario: Template appliqué depuis le WYSIWYG du nœud

- **GIVEN** un nœud sélectionné avec un écran content-only, aucun widget sélectionné
- **WHEN** l'auteur choisit le template "quiz-focus" dans le panneau WYSIWYG
- **THEN** l'écran du nœud affiche header, content et footer du template et le JSON du nœud est mis à jour

### Requirement: Éditeur WYSIWYG canvas

Le Studio SHALL offrir un canvas de prévisualisation phone-size (environ 375x667 pixels) dans le panneau central du Composer. Le canvas SHALL afficher les zones du screen (header, content, footer) avec leurs widgets rendus.

Le canvas SHALL supporter :
- Sélection de zone par clic (surlignage visuel)
- Sélection de widget par clic dans une zone
- Ajout de widget via un menu contextuel ou drag depuis une palette
- Réordonnancement de widgets par drag & drop dans une zone
- Suppression de widget par bouton ou touche Delete

Un clic sur une zone SHALL sélectionner cette zone sans la désélectionner aussitôt : le clic ne SHALL jamais bouillonner vers le fond du canvas (qui vide la sélection). Seul un clic sur le fond vide du canvas SHALL vider la sélection.

Les zones header/footer/overlay absentes de l'écran SHALL être dessinées en pointillés (« + En-tête », « + Pied de page », « + Surimpression »). Un clic sur une zone fantôme SHALL créer la zone vide et la sélectionner.

Le canvas SHALL être synchronisé avec le nœud sélectionné dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

#### Scenario: Affichage du screen d'un nœud

- **GIVEN** un nœud sélectionné avec un screen configuré
- **WHEN** l'auteur ouvre le Composer
- **THEN** le canvas affiche le screen du nœud avec ses zones et widgets

#### Scenario: Sélection de zone

- **GIVEN** le canvas affichant un screen avec header, content, footer
- **WHEN** l'auteur clique sur la zone header
- **THEN** la zone est surlignée et le panneau de propriétés affiche les propriétés de la zone header

#### Scenario: Clic zone sans auto-annulation

- **GIVEN** le canvas affichant un screen avec une zone content
- **WHEN** l'auteur clique sur la zone content
- **THEN** la zone reste sélectionnée (contour néon), le panneau affiche « Ajouter un widget », et le panneau fond d'écran ne s'affiche pas

#### Scenario: Zone fantôme créée au clic

- **GIVEN** un écran content-only (ni header ni footer)
- **WHEN** l'auteur clique sur le fantôme « + En-tête »
- **THEN** une zone header vide est créée dans le JSON du nœud et sélectionnée, le panneau affiche ses propriétés

#### Scenario: Ajout de widget

- **GIVEN** le canvas avec une zone content sélectionnée
- **WHEN** l'auteur clique "Ajouter un widget" et choisit "Texte"
- **THEN** un widget texte par défaut est ajouté à la zone content et apparaît dans le canvas
