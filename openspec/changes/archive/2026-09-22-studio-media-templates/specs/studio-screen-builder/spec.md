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

Les modèles SHALL vivre dans une bibliothèque : modèles prédéfinis embarqués (immuables) + modèles enregistrés par l'auteur (« Enregistrer comme modèle », persistance locale). Le sélecteur SHALL présenter les modèles par nom dans une liste déroulante. Appliquer un modèle puis le modifier crée une déclinaison (l'écran du nœud diverge, le modèle reste intact) ; modifier un modèle passe par un nouvel enregistrement.

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

#### Scenario: Déclinaison sans altérer le modèle

- **GIVEN** un écran appliqué depuis le modèle "quiz-focus"
- **WHEN** l'auteur modifie le titre de l'en-tête
- **THEN** l'écran du nœud diverge (déclinaison), le modèle "quiz-focus" reste inchangé et s'applique à l'identique sur un autre nœud

#### Scenario: Enregistrement comme modèle

- **GIVEN** un écran de nœud personnalisé
- **WHEN** l'auteur choisit « Enregistrer comme modèle » et nomme «ACTE II»
- **THEN** «ACTE II» apparaît dans la liste déroulante des modèles et s'applique sur un autre nœud ; les modèles prédéfinis restent non modifiables

## ADDED Requirements

### Requirement: Sélection d'image par parcours ou dépôt

Tout formulaire acceptant une image (widget image, fond d'écran, image puzzle, réponse QCM image, logo) SHALL proposer le parcours du poste client ET le dépôt par glisser-déposer, avec prévisualisation avant validation. Le fichier retenu SHALL devenir un asset du pack (enregistré au manifest, chemin stocké dans le JSON). Un fichier non image SHALL être refusé avec un message.

#### Scenario: Dépôt d'une image puzzle

- **GIVEN** le bloc puzzle sans image source
- **WHEN** l'auteur dépose `chateau.jpg` sur la zone de dépôt
- **THEN** la vignette s'affiche, `module.data.image` vaut le chemin d'asset et le manifest contient le fichier avec son SHA-256

#### Scenario: Fichier non image refusé

- **GIVEN** le formulaire du widget image
- **WHEN** l'auteur dépose un fichier `.pdf`
- **THEN** le formulaire refuse avec un message et le JSON reste inchangé

### Requirement: Défauts affichés avec retour unitaire

Chaque formulaire SHALL afficher ses valeurs par défaut (placeholder ou mention « défaut : … »). Tout champ modifié SHALL proposer un retour unitaire à la valeur par défaut du module (bouton par champ), sans toucher aux autres champs. Réinitialiser un champ vide l'absence (héritage) quand le champ est optionnel, ou restaure la valeur par défaut du type de widget quand il est requis.

#### Scenario: Retour unitaire au défaut

- **GIVEN** un widget texte dont la taille a été portée à 24 (défaut : hérité)
- **WHEN** l'auteur active le retour au défaut sur ce seul champ
- **THEN** la taille retombe sur l'héritage, les autres champs du widget sont inchangés

### Requirement: Liste de polices prédéfinies

Les champs de police (widget, styles, branding) SHALL proposer une liste fermée de polices prédéfinies (au minimum : système, Georgia, serif, sans-serif, monospace), avec saisie libre conservée en repli. La liste SHALL être identique dans tous les formulaires.

#### Scenario: Police choisie dans la liste

- **GIVEN** la barre d'outils de style du contenu
- **WHEN** l'auteur ouvre le choix de police
- **THEN** la liste prédéfinie s'affiche et choisir « Georgia » renseigne `fontFamily: "Georgia"`
