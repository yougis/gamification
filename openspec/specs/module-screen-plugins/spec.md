# module-screen-plugins Specification

## Purpose

Contrat de plugin d'écran pour chaque type de module GeoPlay, définissant comment un module s'intègre au système WYSIWYG : template par défaut, aperçu dans l'éditeur, panneau de propriétés, rendu joueur, et styles personnalisables.

## Requirements

### Requirement: Contrat ModuleScreenPlugin

Chaque type de module enregistré dans le registre SHALL pouvoir contenir un champ optionnel `screenPlugin` de type `ModuleScreenPlugin`. Le screenPlugin SHALL contenir :
- `type` (string) : identifiant du module (ex. `"QUIZ"`)
- `label` (string) : nom affiché dans l'éditeur (ex. `"Quiz / QCM"`)
- `icon` (string) : nom de l'icône
- `zoneNeeds` (objet) : `{ content: boolean, header: boolean, footer: boolean }` — zones requises par le module
- `defaultScreen` (ScreenDefinition) : écran par défaut quand le module est ajouté à un nœud
- `editorPreview` (composant React) : aperçu du module dans le canvas WYSIWYG (rendu statique, non interactif)
- `propertiesPanel` (composant React) : panneau de configuration du module dans le panneau de propriétés
- `playerRenderer` (composant React) : rendu interactif du module pour le Player
- `customizableStyles` (objet) : `{ backgroundColor?: boolean, textColor?: boolean, fontSize?: boolean, borderRadius?: boolean }` — styles que l'auteur peut personnaliser dans le WYSIWYG

Un module sans `screenPlugin` fonctionne normalement mais n'a pas de rendu WYSIWYG — le canvas affiche un placeholder generic.

#### Scenario: Module avec screenPlugin

- **GIVEN** le module QUIZ enregistré avec un `screenPlugin` complet
- **WHEN** l'auteur ajoute un nœud QUIZ
- **THEN** le canvas affiche l'aperçu du QUIZ (pas un placeholder) et le panneau de propriétés affiche le formulaire de configuration du quiz

#### Scenario: Module sans screenPlugin

- **GIVEN** un module futur sans `screenPlugin`
- **WHEN** l'auteur ajoute un nœud avec ce module
- **THEN** le canvas affiche un placeholder generic indiquant le type de module

### Requirement: Aperçu éditeur (editorPreview)

L'`editorPreview` SHALL afficher un aperçu statique et non interactif du module dans le canvas WYSIWYG. L'aperçu SHALL montrer la structure visuelle du module (ex. pour QUIZ : une question avec des options) sans interaction possible. L'aperçu SHALL être cliquable pour sélectionner le widget dans le canvas.

L'aperçu SHALL s'adapter à la taille disponible dans la zone content du screen. Si le module n'a pas de données (ex. quiz sans questions configurées), l'aperçu SHALL afficher un état vide avec un message incitatif.

#### Scenario: Quiz avec questions

- **GIVEN** un module QUIZ avec 5 questions configurées
- **WHEN** le canvas affiche l'aperçu du QUIZ
- **THEN** l'aperçu montre un aperçu d'une question avec des options

#### Scenario: Quiz sans questions

- **GIVEN** un module QUIZ sans question configurée
- **WHEN** le canvas affiche l'aperçu du QUIZ
- **THEN** l'aperçu affiche "Aucune question configurée — cliquez pour ajouter"

### Requirement: Panneau de propriétés module (propertiesPanel)

Le `propertiesPanel` SHALL remplacer ou compléter le formulaire de configuration existant dans l'Inspector. Les 9 familles de l'Inspector actuel (épreuve, déclenchement, comportement, tirage, validation, découverte, effets, inventaire, position) SHALL être accessibles depuis le propertiesPanel du module.

Le propertiesPanel SHALL être affiché dans le panneau droit du WYSIWYG quand le ModuleWidget est sélectionné. Les configurations existantes (questions quiz, polygones 7-erreurs, etc.) SHALL être conservées.

Quand le module est un mini-jeu, le propertiesPanel SHALL afficher un bloc de configuration du mini-jeu : paramètres de mécanique (questions, découpe, essais, temps) et champs de style couverts par `customizableStyles`. Les valeurs issues des défauts globaux SHALL être signalées comme héritées tant qu'aucune surcharge locale n'est renseignée.

#### Scenario: Configuration quiz dans le propertiesPanel

- **GIVEN** un nœud QUIZ sélectionné dans le WYSIWYG
- **WHEN** l'auteur ouvre le panneau de propriétés
- **THEN** le formulaire de configuration du quiz (questions, options, score, timer) est affiché dans le panneau droit

#### Scenario: Les 9 familles restent accessibles

- **GIVEN** un nœud QUIZ avec des conditions d'activation et un inventaire lié
- **WHEN** l'auteur configure le module dans le propertiesPanel
- **THEN** les sections activation, discovery, effects, inventoryRef sont accessibles dans le même panneau

#### Scenario: Défaut global signalé comme hérité

- **GIVEN** `global.minigameDefaults: { maxAttempts: 3 }` et un nœud QUIZ sans surcharge
- **WHEN** l'auteur ouvre le bloc mini-jeu du propertiesPanel
- **THEN** maxAttempts affiche 3 comme valeur héritée, modifiable en renseignant la surcharge locale

### Requirement: Template par défaut du module (defaultScreen)

Le `defaultScreen` SHALL défini l'écran initial quand un nœud avec ce module est créé pour la première fois. Le defaultScreen SHALL inclure les zones requises (selon `zoneNeeds`) avec des widgets appropriés.

Le defaultScreen du module SHALL être utilisé uniquement lors de la création initiale du nœud. Ensuite, l'auteur peut modifier librement le screen.

#### Scenario: Création d'un nœud QUIZ

- **GIVEN** l'auteur crée un nouveau nœud avec le module QUIZ
- **WHEN** le nœud est créé
- **THEN** le screen du nœud est initialisé avec le `defaultScreen` du QUIZ (header avec titre, content avec ModuleWidget, footer avec navigation)

#### Scenario: Création d'un nœud avec module sans defaultScreen

- **GIVEN** un module sans `screenPlugin` (pas de defaultScreen)
- **WHEN** un nœud avec ce module est créé
- **THEN** le screen est initialisé avec un écran par défaut (content-only, ModuleWidget)

### Requirement: Styles personnalisables (customizableStyles)

Le `customizableStyles` SHALL déclarer quels styles l'auteur peut modifier dans le WYSIWYG pour ce module. Les options sont :
- `backgroundColor` : couleur de fond du conteneur du module
- `textColor` : couleur du texte
- `fontSize` : taille de police
- `fontFamily` : famille typographique
- `fontWeight` : graisse (`normal`|`bold`)
- `borderRadius` : arrondi des bords

Ces styles SHALL être affichés dans le panneau de propriétés quand le ModuleWidget est sélectionné. Les valeurs SHALL être stockées dans `node.screen.zones.content.widgets[].styles` (nouveau sous-objet optionnel dans le Widget).

#### Scenario: Personnalisation du quiz

- **GIVEN** un module QUIZ avec `customizableStyles: { backgroundColor: true, textColor: true }`
- **WHEN** l'auteur sélectionne le ModuleWidget dans le canvas
- **THEN** le panneau de propriétés affiche des champs pour la couleur de fond et la couleur du texte du quiz

#### Scenario: Style non personnalisable

- **GIVEN** un module avec `customizableStyles: {}` (vide)
- **WHEN** l'auteur sélectionne le ModuleWidget
- **THEN** le panneau de propriétés n'affiche aucun champ de style pour ce module

#### Scenario: Typo personnalisée du module

- **GIVEN** un module avec `customizableStyles: { fontFamily: true, fontSize: true, fontWeight: true }`
- **WHEN** l'auteur renseigne Georgia / 18 / bold
- **THEN** les valeurs sont stockées dans `widgets[].styles` et l'aperçu éditeur les reflète

### Requirement: Rendu joueur (playerRenderer)

Le `playerRenderer` SHALL défini comment le module s'affiche dans le Player natif (web preview pour l'instant). Le playerRenderer SHALL être un composant React recevant :
- `data` : les données du module (questions, images, etc.)
- `branding` : le branding résolu du jeu
- `experienceStyle` : l'experienceStyle résolu
- `onComplete` : callback appelé quand le module est complété (avec le score)

Le playerRenderer SHALL être interactif (répondre aux actions du joueur) contrairement à l'editorPreview qui est statique.

#### Scenario: Quiz interactif dans le Player

- **GIVEN** un module QUIZ avec 5 questions
- **WHEN** le joueur atteint le nœud
- **THEN** le playerRenderer affiche le quiz interactif avec sélection de réponses, feedback, et score

#### Scenario: Quiz avec branding

- **GIVEN** un jeu avec `branding.primaryColor: "#ff4400"`
- **WHEN** le quiz s'affiche dans le Player
- **THEN** les accents du quiz utilisent #ff4400

### Requirement: Enregistrement dans le registre

Le registre de modules SHALL supporter le champ `screenPlugin` comme propriété optionnelle de chaque entrée. L'ajout d'un `screenPlugin` à un module existant NE SHALL pas modifier le schéma Noeuds/Liens ni le sous-schéma du module. Le screenPlugin est une concern du Studio uniquement — le Player natif utilise le `playerRenderer` mais pas le `editorPreview` ni le `propertiesPanel`.

#### Scenario: Ajout de screenPlugin à un module existant

- **GIVEN** le module QUIZ déjà enregistré sans `screenPlugin`
- **WHEN** le screenPlugin est ajouté au registre
- **THEN** le schéma du module QUIZ n'a pas changé, seul le registre a gagné une propriété

#### Scenario: Module avec screenPlugin complet

- **GIVEN** un module avec `screenPlugin` contenant toutes les propriétés requises
- **WHEN** le Studio charge le registre
- **THEN** le module est disponible dans le WYSIWYG avec son aperçu et son panneau de propriétés

### Requirement: Plugin QUIZ comme référence

Le screenPlugin du module QUIZ SHALL servir de référence pour l'implémentation des autres modules. Il SHALL démontrer :
- Un defaultScreen avec header (titre + compteur), content (ModuleWidget), footer (navigation)
- Un editorPreview affichant une question sample avec des options
- Un propertiesPanel reprenant le formulaire de configuration quiz existant
- Des customizableStyles pour backgroundColor, textColor, fontSize

#### Scenario: QUIZ comme template pour les futurs modules

- **GIVEN** le screenPlugin du QUIZ implémenté
- **WHEN** un développeur crée le screenPlugin d'un nouveau module
- **THEN** il peut s'inspirer du QUIZ pour la structure et les patterns

### Requirement: Bloc de configuration QCM

Le bloc mini-jeu du module QUIZ SHALL permettre de configurer : le nombre de réponses proposées (2 à 6), chaque réponse en mode texte et/ou image (`{ text?: string, image?: string }`, au moins l'un des deux requis), l'index de la bonne réponse, et une explication optionnelle affichée après réponse.

Le bloc SHALL refuser une question sans bonne réponse désignée et une réponse sans texte ni image. Ces refus SHALL être des erreurs de formulaire (pas de rejet Draft-07 si le champ reste absent — la validation applicative du quiz existante s'applique).

#### Scenario: QCM mixte texte et images

- **GIVEN** une question avec 4 réponses dont 2 images
- **WHEN** l'auteur enregistre la question
- **THEN** l'aperçu éditeur affiche les 4 réponses (texte et vignettes) et la bonne réponse est marquée

#### Scenario: Réponse vide refusée

- **GIVEN** une réponse sans texte ni image
- **WHEN** l'auteur tente d'enregistrer
- **THEN** le formulaire signale l'erreur et l'enregistrement est bloqué

### Requirement: Bloc de configuration puzzle image

Le bloc mini-jeu du module PUZZLE SHALL permettre de configurer : l'image source (asset du pack), le nombre de cases de découpe sous forme lignes × colonnes (ex. 3×3, 4×4, minimum 2×2, maximum 6×6), et l'aperçu de la grille découpée.

Le bloc SHALL afficher la grille résultante (nombre de pièces = lignes × colonnes) avant validation. Un découpage hors bornes SHALL être refusé par le formulaire.

#### Scenario: Puzzle 4×4 configuré

- **GIVEN** une image source et un découpage 4×4
- **WHEN** l'auteur valide la configuration
- **THEN** 16 pièces sont définies dans `module.data` et l'aperçu montre la grille 4×4

#### Scenario: Découpe 1×1 refusée

- **GIVEN** un découpage lignes=1, colonnes=1
- **WHEN** l'auteur tente de valider
- **THEN** le formulaire refuse (minimum 2×2)

### Requirement: Défauts globaux mini-jeux surchargeables

Le registre SHALL exposer `global.minigameDefaults` comme source des paramètres transverses des mini-jeux : `maxAttempts` (nombre d'essais, entier ≥ 1) et `timeLimitSeconds` (temps alloué, entier ≥ 0, 0 = illimité). Chaque nœud MAY surcharger ces valeurs dans son `module.data` (`maxAttempts`, `timeLimitSeconds`).

La résolution SHALL être : valeur locale si renseignée, sinon défaut global, sinon comportement actuel du module. Le propertiesPanel SHALL afficher la valeur résolue avec son origine (locale / globale / défaut module).

#### Scenario: Surcharge locale du temps

- **GIVEN** `global.minigameDefaults: { timeLimitSeconds: 60 }` et un nœud avec `module.data.timeLimitSeconds: 30`
- **WHEN** le joueur atteint le nœud
- **THEN** le mini-jeu applique 30 secondes (origine locale)

#### Scenario: Défaut global appliqué

- **GIVEN** `global.minigameDefaults: { maxAttempts: 3 }` et un nœud sans surcharge
- **WHEN** le joueur atteint le nœud
- **THEN** le mini-jeu applique 3 essais (origine globale)
