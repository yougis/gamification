## Purpose

Système de composition d'écrans WYSIWYG dans le Studio GeoPlay, permettant aux créateurs de concevoir visuellement la mise en forme des écrans joueurs (fond, en-tête, contenu, pied de page) sans écrire de JSON, via un canvas de prévisualisation phone-size et un panneau de propriétés contextuel.

## ADDED Requirements

### Requirement: Modèle de données ScreenDefinition

Le schéma Draft-07 SHALL définir `node.screen` et `global.screen` comme objets optionnels de type `ScreenDefinition`. Une ScreenDefinition SHALL contenir :
- `layout` (string optionnel) : identifiant du template de mise en page (ex. `"basic-story"`, `"quiz-focus"`, `"map-fullscreen"`)
- `background` (objet optionnel) : `{ type: "color"|"image"|"gradient", value: string, overlay?: number (0-1) }`
- `zones` (objet optionnel) : `{ header?: ZoneContent, content?: ZoneContent, footer?: ZoneContent, overlay?: ZoneContent }`
- `transitions` (objet optionnel) : `{ enter?: "fade"|"slide"|"none", exit?: "fade"|"slide"|"none" }`

`additionalProperties: false` SHALL être appliqué à chaque niveau.

#### Scenario: Nœud avec screen complet

- **GIVEN** un nœud avec `screen: { layout: "quiz-focus", background: { type: "color", value: "#1a1a2e" }, zones: { header: { layout: "stack", widgets: [{ type: "text", text: "Quiz", style: "heading" }] }, content: { layout: "stack", widgets: [{ type: "module" }] } } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

#### Scenario: Nœud sans screen

- **GIVEN** un nœud sans champ `screen`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté (champ optionnel)

#### Scenario: Screen avec champ inconnu

- **GIVEN** un nœud avec `screen: { layout: "test", champInconnu: "valeur" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est rejeté (additionalProperties: false)

### Requirement: Définition ZoneContent

Une `ZoneContent` SHALL contenir :
- `layout` (string, défaut `"stack"`) : `"stack"` (vertical), `"grid"` (colonnes), `"free"` (positionnement libre)
- `widgets` (tableau de Widget, >=0 éléments)

`additionalProperties: false` SHALL être appliqué.

#### Scenario: Zone avec layout stack

- **GIVEN** une zone avec `layout: "stack"` et 2 widgets
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée

#### Scenario: Zone avec layout inconnu

- **GIVEN** une zone avec `layout: "flexbox"`
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est rejeté (valeur non dans l'enum)

### Requirement: Définitions Widget

Le schéma SHALL définir les types de widgets suivants via un discrimant sur `type` :

- `TextWidget` : `{ type: "text", text: string, style?: "heading"|"subtitle"|"body"|"caption", fontSize?: number, color?: string, align?: "left"|"center"|"right" }`
- `ImageWidget` : `{ type: "image", src: string, width?: number|string, height?: number|string, fit?: "cover"|"contain"|"fill", alt?: string }`
- `ButtonWidget` : `{ type: "button", label: string, action?: string, icon?: string, variant?: "primary"|"secondary"|"ghost" }`
- `ProgressBarWidget` : `{ type: "progress", progressType?: "steps"|"score", showLabel?: boolean, color?: string }`
- `ModuleWidget` : `{ type: "module" }` — slot pour le plugin du module associé au nœud
- `SpacerWidget` : `{ type: "spacer", height?: number|string }`

Chaque variante SHALL imposer ses champs requis et interdire les champs des autres varianteS (`additionalProperties: false` par variante).

#### Scenario: TextWidget valide

- **GIVEN** un widget `{ type: "text", text: "Bienvenue", style: "heading" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Widget avec type inconnu

- **GIVEN** un widget `{ type: "unknown_widget" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (type non dans l'enum)

#### Scenario: TextWidget avec champ étranger

- **GIVEN** un widget `{ type: "text", text: "test", src: "image.png" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (champ `src` étranger à TextWidget)

### Requirement: Fusion global/screen et node/screen

La ScreenDefinition de `global.screen` SHALL servir de template par défaut pour tous les nœuds. La ScreenDefinition de `node.screen` SHALL override les propriétés spécifiées. Le merge SHALL être récursif pour les zones : si un nœud spécifie `zones.header`, il remplace complètement le header du global, pas append.

Si un nœud ne définit pas de `screen`, le moteur SHALL utiliser `global.screen` tel quel. Si ni le nœud ni le global ne définissent de `screen`, le moteur SHALL appliquer un écran par défaut (fond uni, zone content-only, aucun header/footer).

#### Scenario: Nœud inherit du global

- **GIVEN** un jeu avec `global.screen: { background: { type: "color", value: "#000" }, zones: { header: { layout: "stack", widgets: [{ type: "text", text: "Jeu" }] } } }` et un nœud sans `screen`
- **WHEN** le moteur résout l'écran du nœud
- **THEN** le nœud utilise le background et le header du global

#### Scenario: Nœud override le background

- **GIVEN** un jeu avec `global.screen: { background: { type: "color", value: "#000" } }` et un nœud avec `screen: { background: { type: "image", value: "chateau.jpg" } }`
- **WHEN** le moteur résout l'écran du nœud
- **THEN** le nœud utilise "chateau.jpg" comme fond, le header est vide (non spécifié dans le node)

#### Scenario: Merge récursif des zones

- **GIVEN** un global avec `zones.header` et un node avec `zones.content`
- **WHEN** le moteur résout l'écran
- **THEN** le résultat contient le header du global ET le content du node (merge de top-level zones)

### Requirement: Sélection de template

Le Studio SHALL fournir un sélecteur de template (TemplatePicker) permettant de choisir parmi des templates de mise en page prédéfinis. Les templates disponibles SHALL inclure au minimum :
- `"basic-story"` : fond, header avec titre, zone content scrollable
- `"quiz-focus"` : fond sombre, header avec compteur, zone content pour quiz, footer avec navigation
- `"map-fullscreen"` : carte en plein écran avec overlay de contrôle
- `"clue-focus"` : fond sombre, zone content pour indices avec texte et images
- `"inventory-view"` : fond sombre, header avec titre, zone content avec grille d'objets

La sélection d'un template SHALL remplacer les zones et le layout du screen courant par ceux du template. Les customisations existantes seront perdues (confirmation requise si des modifications existent).

#### Scenario: Sélection d'un template

- **GIVEN** un nœud avec un screen vide
- **WHEN** l'auteur sélectionne le template "quiz-focus"
- **THEN** les zones (header, content, footer) et le layout sont remplacés par ceux du template "quiz-focus"

#### Scenario: Sélection avec modifications existantes

- **GIVEN** un nœud avec un screen personnalisé (3 widgets dans header)
- **WHEN** l'auteur tente de sélectionner un template
- **THEN** une confirmation affiche "Les modifications actuelles seront perdues. Continuer ?"

### Requirement: Éditeur WYSIWYG canvas

Le Studio SHALL offrir un canvas de prévisualisation phone-size (environ 375x667 pixels) dans le panneau central du Composer. Le canvas SHALL afficher les zones du screen (header, content, footer) avec leurs widgets rendus.

Le canvas SHALL supporter :
- Sélection de zone par clic (surlignage visuel)
- Sélection de widget par clic dans une zone
- Ajout de widget via un menu contextuel ou drag depuis une palette
- Réordonnancement de widgets par drag & drop dans une zone
- Suppression de widget par bouton ou touche Delete

Le canvas SHALL être synchronisé avec le nœud sélectionné dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

#### Scenario: Affichage du screen d'un nœud

- **GIVEN** un nœud sélectionné avec un screen configuré
- **WHEN** l'auteur ouvre le Composer
- **THEN** le canvas affiche le screen du nœud avec ses zones et widgets

#### Scenario: Sélection de zone

- **GIVEN** le canvas affichant un screen avec header, content, footer
- **WHEN** l'auteur clique sur la zone header
- **THEN** la zone est surlignée et le panneau de propriétés affiche les propriétés de la zone header

#### Scenario: Ajout de widget

- **GIVEN** le canvas avec une zone content sélectionnée
- **WHEN** l'auteur clique "Ajouter un widget" et choisit "Texte"
- **THEN** un widget texte par défaut est ajouté à la zone content et apparaît dans le canvas

### Requirement: Panneau de propriétés contextuel

Le panneau droit du Composer SHALL afficher les propriétés contextuelles selon la sélection :
- **Rien de sélectionné** : propriétés du nœud (module type, activation), sélecteur de template, background global, transitions
- **Zone sélectionnée** : nom de la zone, layout (stack/grid/free), background de la zone, visibilité conditionnelle
- **Widget sélectionné** : type du widget, propriétés spécifiques (texte, source image, label bouton, etc.), style (couleur, taille, alignement)
- **Module widget sélectionné** : propriétés du widget + panneau de configuration du module existant (questions quiz, polygones 7-erreurs, etc.)

Le panneau de propriétés SHALL implémenter le requirement existant "Inspecteur de nœud" : sections module → activation → latch/rejeu → discovery → effects → inventoryRef, mais dans un panneau contextuel plutôt que dans un panneau fixe.

#### Scenario: Sélection du module widget

- **GIVEN** un nœud avec un module QUIZ
- **WHEN** l'auteur clique sur le ModuleWidget dans le canvas
- **THEN** le panneau de propriétés affiche les propriétés du widget ET le formulaire de configuration du quiz (questions, options, score)

#### Scenario: Sélection de zone header

- **GIVEN** le canvas avec un screen
- **WHEN** l'auteur sélectionne la zone header
- **THEN** le panneau affiche : layout selector (stack/grid), widgets list, bouton "Ajouter un widget"

### Requirement: Écrans dans le schéma global

Le schéma Draft-07 SHALL définir `global.screen` comme objet optionnel de même type que `node.screen`. `global.screen` SHALL servir de template par défaut pour tous les nœuds du jeu.

#### Scenario: Global screen utilisé comme template

- **GIVEN** un jeu avec `global.screen: { layout: "basic-story", background: { type: "color", value: "#1a1a2e" } }`
- **WHEN** un nœud sans `screen` est chargé
- **THEN** le nœud utilise le layout et background du global

#### Scenario: Global screen sans node screen

- **GIVEN** un jeu avec `global.screen` mais aucun nœud n'a de `screen`
- **WHEN** le moteur charge le jeu
- **THEN** tous les nœuds utilisent le screen global comme template

### Requirement: Persistance du screen dans le JSON

Toute modification de screen dans le WYSIWYG SHALL être immédiatement persistée dans le JSON du jeu. Le screen est un champ à part entière du nœud, pas un état transitoire de l'UI. Le screen SHALL être exporté dans le JSON final et validé par le validateur Draft-07.

#### Scenario: Modification persistée

- **GIVEN** un nœud sans screen
- **WHEN** l'auteur ajoute un widget texte via le WYSIWYG
- **THEN** le JSON du nœud contient `screen.zones.content.widgets` avec le nouveau widget

#### Scenario: Export avec screens

- **GIVEN** un jeu avec 3 nœuds ayant des screens configurés
- **WHEN** l'auteur exporte le jeu
- **THEN** le JSON exporté contient les screens de chaque nœud et passe la validation Draft-07

### Requirement: Compatibilité ascendante

Un jeu existant sans aucun `screen` (ni `node.screen` ni `global.screen`) SHALL continuer à fonctionner. Le moteur SHALL appliquer un écran par défaut pour les nœuds sans screen. Les champs `screen` sont optionnels et n'affectent pas les jeux qui ne les utilisent pas.

#### Scenario: Jeu existant sans screen

- **GIVEN** un jeu créé avant l'ajout de la feature screen
- **WHEN** le moteur charge le jeu
- **THEN** les nœuds s'affichent avec un écran par défaut (fond uni, content-only)

#### Scenario: Jeu avec screen sur certains nœuds

- **GIVEN** un jeu avec 5 nœuds dont 2 ont un `screen` configuré
- **WHEN** le moteur charge le jeu
- **THEN** les 2 nœuds avec screen affichent leur layout personnalisé, les 3 autres affichent l'écran par défaut
