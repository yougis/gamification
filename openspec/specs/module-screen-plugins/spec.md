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

L'aperçu SHALL rendre visuellement les images configurées du module (image puzzle découpée, source 7-erreurs avec zones, marqueur et fallback RA, QCM avec vignettes) : l'auteur SHALL voir le rendu de l'image importée sans ouvrir le panneau de propriétés. L'aperçu SHALL NE contenir aucune mécanique de mini-jeu : aucun déplacement de tuile, aucun clic de validation d'erreur, aucun état de jeu (score, essais, sélection) ne SHALL exister dans le canvas auteur — la mécanique vit exclusivement dans le `playerRenderer`.

L'aperçu SHALL s'adapter à la taille disponible dans la zone content du screen. Si le module n'a pas de données (ex. quiz sans questions configurées), l'aperçu SHALL afficher un état vide avec un message incitatif.

#### Scenario: Quiz avec questions

- **GIVEN** un module QUIZ avec 5 questions configurées
- **WHEN** le canvas affiche l'aperçu du QUIZ
- **THEN** l'aperçu montre un aperçu d'une question avec des options

#### Scenario: Quiz sans questions

- **GIVEN** un module QUIZ sans question configurée
- **WHEN** le canvas affiche l'aperçu du QUIZ
- **THEN** l'aperçu affiche "Aucune question configurée — cliquez pour ajouter"

#### Scenario: Image importée rendue sans mécanique

- **GIVEN** un module PUZZLE avec image source et découpe 3×3
- **WHEN** le canvas affiche l'aperçu du module
- **THEN** l'image découpée est visible et aucune tuile ne peut être déplacée ni sélectionnée

#### Scenario: Écran de recherche d'erreur rendu sans clic

- **GIVEN** un module DIFFERENCE_GAME avec source et zones tracées
- **WHEN** le canvas affiche l'aperçu du module
- **THEN** la source et les zones sont visibles et aucun clic ne déclenche de validation

### Requirement: Panneau de propriétés module (propertiesPanel)

Le `propertiesPanel` SHALL remplacer ou compléter le formulaire de configuration existant dans l'Inspector. Les 9 familles de l'Inspector actuel (épreuve, déclenchement, comportement, tirage, validation, découverte, effets, inventaire, position) SHALL être accessibles depuis le propertiesPanel du module.

Le propertiesPanel SHALL être affiché dans le panneau droit du WYSIWYG quand le ModuleWidget est sélectionné. Les configurations existantes (questions quiz, polygones 7-erreurs, etc.) SHALL être conservées.

Le propertiesPanel SHALL aussi être affiché sous le dropdown « Mini-jeu » de la famille épreuve de l'Inspecteur, pour tout type de module en disposant : l'auteur SHALL pouvoir renseigner chaque champ requis au schéma du module sans ouvrir le WYSIWYG et sans écrire de JSON. L'inline questions QUIZ historique de l'Inspecteur SHALL être remplacé par ce panneau unique (aucun doublon).

Quand le module est un mini-jeu, le propertiesPanel SHALL afficher un bloc de configuration du mini-jeu : paramètres de mécanique (questions, découpe, essais, temps) et champs de style couverts par `customizableStyles`. Les valeurs issues des défauts globaux SHALL être signalées comme héritées tant qu'aucune surcharge locale n'est renseignée.

Sans screenPlugin (INFO, RANDOM_POOL, futurs types), la famille épreuve SHALL conserver son comportement actuel (sélecteur seul, famille tirage, JSON expert).

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

#### Scenario: Formulaire puzzle sous le dropdown

- **GIVEN** un nœud PUZZLE ouvert dans la famille épreuve de l'Inspecteur (sans passer par le WYSIWYG)
- **WHEN** l'auteur regarde sous le dropdown « Mini-jeu »
- **THEN** le sélecteur d'image source et les champs de découpe sont affichés et éditables, sans JSON

#### Scenario: Formulaire cadenas sous le dropdown

- **GIVEN** un nœud CODE_INPUT ouvert dans la famille épreuve de l'Inspecteur
- **WHEN** l'auteur regarde sous le dropdown « Mini-jeu »
- **THEN** le champ code attendu et l'indice sont affichés et éditables, sans JSON

#### Scenario: Sans plugin, comportement inchangé

- **GIVEN** un nœud INFO ouvert dans la famille épreuve
- **WHEN** l'auteur regarde sous le dropdown « Mini-jeu »
- **THEN** seul le sélecteur est affiché (avec le JSON expert comme aujourd'hui), sans placeholder trompeur

### Requirement: Template par défaut du module (defaultScreen)

Le `defaultScreen` SHALL définir l'écran initial quand un Nœud avec ce Module est créé pour la première fois. Le defaultScreen SHALL inclure les zones requises (selon `zoneNeeds`) avec des widgets appropriés, dont un widget `{ type: "module" }` dans la zone content.

Le defaultScreen du Module SHALL être appliqué systématiquement lors de la création initiale du Nœud : un Nœud créé avec un type de Module enregistré dans le registre (jamais de liste fermée en dur) SHALL naître avec le `screen` correspondant déjà renseigné dans le JSON du jeu. Ensuite, l'auteur peut modifier librement le screen.

Changer le type du Module d'un Nœud existant SHALL détruire les `module.data` associées (remplacées par les données par défaut du nouveau type) et SHALL remplacer uniquement la zone `content` par le content du `defaultScreen` du nouveau type, après confirmation de l'auteur signalant que les modifications seront perdues. Les zones `header`, `footer` et `overlay` SHALL être préservées. Refuser la confirmation SHALL laisser le Nœud strictement inchangé (ni type, ni data, ni screen).

Un Module sans `screenPlugin` (INFO, RANDOM_POOL, futurs types) SHALL recevoir un widget `{ type: "module" }` générique sans paramètre particulier, rendu comme placeholder par le canvas.

#### Scenario: Création d'un nœud QUIZ

- **GIVEN** l'auteur crée un nouveau nœud avec le module QUIZ
- **WHEN** le nœud est créé
- **THEN** le screen du nœud est initialisé avec le `defaultScreen` du QUIZ (header avec titre, content avec ModuleWidget, footer avec navigation)

#### Scenario: Création d'un nœud avec module sans defaultScreen

- **GIVEN** un module sans `screenPlugin` (pas de defaultScreen)
- **WHEN** un nœud avec ce module est créé
- **THEN** le screen est initialisé avec un écran par défaut (content-only, ModuleWidget)

#### Scenario: Changement de type confirmé

- **GIVEN** un Nœud QUIZ avec des questions renseignées et un content customisé, dont l'auteur change le type vers PUZZLE et confirme le message « modifications perdues »
- **WHEN** le changement est appliqué
- **THEN** les `module.data` du QUIZ sont détruites et remplacées par les données par défaut du PUZZLE, et seule la zone content est remplacée par le content du `defaultScreen` du PUZZLE (header/footer préservés)

#### Scenario: Changement de type refusé

- **GIVEN** un Nœud QUIZ avec des questions renseignées
- **WHEN** l'auteur change le type vers PUZZLE mais refuse la confirmation
- **THEN** le Nœud reste QUIZ avec ses questions et son screen inchangés

#### Scenario: Widget générique sans plugin

- **GIVEN** un Nœud avec le module INFO (sans `screenPlugin`)
- **WHEN** son écran est affiché
- **THEN** la zone content contient un widget `{ type: "module" }` générique sans paramètre particulier

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

### Requirement: Plugin 7-erreurs avec tracé de polygones

Le screenPlugin du module DIFFERENCE_GAME SHALL fournir : un `ImagePicker` pour `source`, un pour `derivee`, le champ `touchDilatation` (minimum 44 px rappelé), et un traceur de zones sur l'image source affichée à son ratio réel (dimensions naturelles, jamais de cadre imposé). Le traceur SHALL offrir deux outils : rectangle (clic-glissé, minimum 1 %) et polygone (clic = ajout d'un sommet en %, fermeture = zone d'au moins 3 points), avec liste des zones et suppression par zone. L'`editorPreview` SHALL montrer la source au même ratio avec les deux formes superposées. Les zones SHALL rester exprimées en % (responsive) comme au schéma.

#### Scenario: Zone tracée au clic

- **GIVEN** un 7-erreurs avec image source et 0 zone
- **WHEN** l'auteur clique 4 points sur l'image puis ferme le polygone
- **THEN** une zone en % est ajoutée à `module.data.polygons` et affichée en overlay

#### Scenario: Images manquantes signalées

- **GIVEN** un 7-erreurs sans `source`
- **WHEN** l'auteur ouvre le panneau
- **THEN** un appel explicite à déposer les deux images s'affiche (pas de rejet silencieux)

#### Scenario: Aperçu non déformé

- **GIVEN** une image source carrée (1:1) et une zone en bas à droite
- **WHEN** l'aperçu s'affiche dans un volet étroit
- **THEN** l'image reste carrée en taille réduite et la zone couvre toujours le même détail (jamais étirée en 16:9)

### Requirement: Plugin RA avec fallback obligatoire

Le screenPlugin du module AR_MARKER SHALL fournir : `marker` via `ImagePicker`, `model` + `modelSizeMb`, et `fallback2D` via `ImagePicker` avec refus d'un fallback vide (obligatoire au schéma). L'`editorPreview` SHALL montrer le marqueur et le fallback côte à côte. L'avertissement `needsLock` existant de l'Inspecteur SHALL être conservé.

#### Scenario: Fallback vide refusé

- **GIVEN** un AR_MARKER avec marqueur mais sans `fallback2D`
- **WHEN** l'auteur tente de valider la configuration
- **THEN** le formulaire signale le fallback manquant et le JSON reste inchangé

### Requirement: Plugin boussole

Le screenPlugin du module BOUSSOLE SHALL fournir : `toleranceDeg`, `stabilizationMs`, `fallback` (code animateur) et les essais/temps via les défauts globaux. L'`editorPreview` SHALL montrer une rose des vents statique avec la tolérance. Le module SHALL rester validant en interne (aucun cap vers l'orchestrateur).

#### Scenario: Tolérance configurée sans JSON

- **GIVEN** un nœud BOUSSOLE avec `toleranceDeg` vide
- **WHEN** l'auteur renseigne 15 dans le formulaire
- **THEN** `module.data.toleranceDeg` vaut 15 et la validation C1 passe sur ce champ

### Requirement: Aperçu éditeur puzzle en tuiles mélangées

L'`editorPreview` du PUZZLE SHALL montrer l'image source réellement découpée en `tileRows` × `tileCols` tuiles (fonds positionnés pour reconstituer l'image) affichées dans un ordre mélangé aléatoire, avec le compteur de pièces, au lieu d'une grille numérotée. L'aperçu SHALL rester statique et non interactif. Sans image source, l'état vide incitatif existant SHALL être conservé.

#### Scenario: Aperçu mélangé

- **GIVEN** un PUZZLE avec image source et découpe 3×3
- **WHEN** le canvas affiche l'aperçu
- **THEN** 9 tuiles d'image sont visibles dans un ordre mélangé (pas 1 à 9 en ordre)

#### Scenario: Aperçu sans image inchangé

- **GIVEN** un PUZZLE sans image source
- **WHEN** le canvas affiche l'aperçu
- **THEN** l'état vide « aucune image — cliquez pour configurer » s'affiche

### Requirement: Plugin CODE_INPUT comme référence cadenas

Le screenPlugin du module CODE_INPUT SHALL servir de deuxième référence (après QUIZ) avec :
- Un defaultScreen content-only portant le ModuleWidget (zoneNeeds content uniquement).
- Un editorPreview affichant un cadenas générique dessiné en CSS/SVG (aucun asset) avec le code masqué et le nombre d'essais.
- Un propertiesPanel reprenant le formulaire du module (code attendu, longueur, indice, essais via défauts globaux) plus les 9 familles de l'Inspecteur.
- Un playerRenderer affichant le cadenas, le pavé de saisie et la vérification, avec les accents du branding résolu.
- Des customizableStyles pour backgroundColor et textColor.

L'ajout NE SHALL pas modifier le schéma Noeuds/Liens ; seul le registre gagne la propriété `screenPlugin` sur l'entrée CODE_INPUT existante.

#### Scenario: Nœud CODE_INPUT dans le WYSIWYG

- **GIVEN** un nœud avec le module CODE_INPUT
- **WHEN** l'auteur l'ouvre dans le canvas
- **THEN** un cadenas s'affiche (pas un placeholder générique) et le panneau propose code, indice et essais

#### Scenario: Cadenas sans asset

- **GIVEN** un jeu sans aucun asset image
- **WHEN** le cadenas CODE_INPUT s'affiche (éditeur ou joueur)
- **THEN** le rendu est complet sans requête réseau ni fichier du pack

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

### Requirement: Aperçu puzzle du canvas avec image résolue

Dans le canvas de l'écran (vue auteur, pas le panneau de propriétés), l'aperçu du module PUZZLE SHALL afficher l'image source définie dans les paramètres du module, découpée en `tileRows` × `tileCols` tuiles affichées dans un ordre mélangé, exactement comme l'aperçu du panneau. L'URL de l'image SHALL être résolue dans le contexte du Studio (même mécanisme que le panneau de propriétés) : une image configurée SHALL être visible dans le canvas, jamais un cadre vide. Sans image source, l'état vide incitatif existant SHALL être conservé. L'aperçu SHALL rester statique et non interactif.

#### Scenario: Image configurée visible mélangée

- **GIVEN** un nœud PUZZLE avec image source et découpe 3×3
- **WHEN** l'auteur ouvre son écran dans le canvas
- **THEN** 9 tuiles d'image sont visibles dans un ordre mélangé (pas 1 à 9 en ordre, pas un cadre vide)

#### Scenario: Aperçu sans image inchangé

- **GIVEN** un nœud PUZZLE sans image source
- **WHEN** l'auteur ouvre son écran dans le canvas
- **THEN** l'état vide « aucune image — cliquez pour configurer » s'affiche
