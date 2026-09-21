## MODIFIED Requirements

### Requirement: Définitions Widget

Le schéma SHALL définir les types de widgets suivants via un discrimant sur `type` :

- `TextWidget` : `{ type: "text", text: string, style?: "heading"|"subtitle"|"body"|"caption", fontSize?: number, color?: string, align?: "left"|"center"|"right" }`
- `ImageWidget` : `{ type: "image", src: string, width?: number|string, height?: number|string, fit?: "cover"|"contain"|"fill", alt?: string }`
- `ButtonWidget` : `{ type: "button", label: string, action?: string, icon?: string, variant?: "primary"|"secondary"|"ghost" }`
- `ProgressBarWidget` : `{ type: "progress", progressType?: "steps"|"score", showLabel?: boolean, color?: string }`
- `ModuleWidget` : `{ type: "module" }` — slot pour le plugin du module associé au nœud
- `SpacerWidget` : `{ type: "spacer", height?: number|string }`

Chaque variante SHALL imposer ses champs requis et interdire les champs des autres variantes (`additionalProperties: false` par variante).

Tout widget MAY porter un sous-objet optionnel `styles` : `{ fontFamily?: string, fontSize?: number, fontWeight?: "normal"|"bold", color?: string, align?: "left"|"center"|"right" }`. Les `styles` du widget SHALL prendre le pas sur les styles de l'écran et les styles globaux. `additionalProperties: false` SHALL être appliqué au sous-objet `styles`.

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

#### Scenario: Widget avec styles valides
- **GIVEN** un widget `{ type: "text", text: "Titre", styles: { fontFamily: "Georgia", fontSize: 20, fontWeight: "bold" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Widget avec style inconnu
- **GIVEN** un widget `{ type: "text", text: "Titre", styles: { shadow: true } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (champ étranger à `styles`)

### Requirement: Fusion global/screen et node/screen

La ScreenDefinition de `global.screen` SHALL servir de template par défaut pour tous les nœuds. La ScreenDefinition de `node.screen` SHALL override les propriétés spécifiées. Le merge SHALL être récursif pour les zones : si un nœud spécifie `zones.header`, il remplace complètement le header du global, pas append.

Si un nœud ne définit pas de `screen`, le moteur SHALL utiliser `global.screen` tel quel. Si ni le nœud ni le global ne définissent de `screen`, le moteur SHALL appliquer un écran par défaut (fond uni, zone content-only, aucun header/footer).

Les styles SHALL se résoudre par héritage global → écran → widget : `global.screen.styles` (défauts pour tout le jeu), surchargés par `node.screen.styles` (écran courant), surchargés par `widgets[].styles` (widget). À chaque niveau, seules les propriétés renseignées SHALL surcharger ; les autres SHALL être héritées. Un écran sans `styles` SHALL hériter intégralement des styles globaux.

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

#### Scenario: Héritage des styles sur trois niveaux
- **GIVEN** `global.screen.styles: { fontFamily: "Georgia", fontSize: 14 }`, `node.screen.styles: { fontSize: 18 }` et un widget avec `styles: { color: "#ff0000" }`
- **WHEN** le moteur résout le style du widget
- **THEN** le widget utilise Georgia / 18 / #ff0000 (global → écran → widget, dernier niveau gagne par propriété)

### Requirement: Éditeur WYSIWYG canvas

Le Studio SHALL offrir un canvas de prévisualisation phone-size (environ 375x667 pixels) dans le panneau central du Composer. Le canvas SHALL afficher les zones du screen (header, content, footer) avec leurs widgets rendus.

Le canvas SHALL supporter :
- Sélection de zone par clic (surlignage visuel)
- Sélection de widget par clic dans une zone
- Ajout de widget via un menu contextuel ou drag depuis une palette
- Réordonnancement de widgets par drag & drop dans une zone
- Suppression de widget par bouton ou touche Delete

Le canvas SHALL être synchronisé avec le nœud sélectionné dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

Le canvas SHALL proposer un sélecteur de viewport : téléphone portrait (375×667), téléphone paysage (667×375), tablette portrait (768×1024), tablette paysage (1024×768). Changer de viewport SHALL redimensionner le canvas et réajuster la mise en page (zones `free` conservées en coordonnées relatives). Le viewport SHALL rester un état d'édition local, jamais persisté dans le JSON.

Le contenu des widgets texte SHALL être éditable en place : un clic sur un texte l'ouvre en édition, Entrée ou perte de focus SHALL persister la valeur via l'opération MCP (annulable par undo). Les widgets texte SHALL pouvoir être déplacés par glisser-déposer, y compris d'une zone vers une autre.

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

#### Scenario: Bascule portrait vers tablette paysage
- **GIVEN** un screen affiché en téléphone portrait
- **WHEN** l'auteur choisit le viewport tablette paysage
- **THEN** le canvas passe en 1024×768, les zones restent visibles et le JSON du jeu est inchangé

#### Scenario: Édition en place d'un texte
- **GIVEN** un widget texte "Bienvenue" dans le header
- **WHEN** l'auteur clique dessus, tape "Bienvenue au château" et valide
- **THEN** le texte est mis à jour dans le canvas et dans le JSON, et undo restaure "Bienvenue"

#### Scenario: Drag-and-drop inter-zones
- **GIVEN** un widget texte dans la zone content
- **WHEN** l'auteur le glisse vers la zone footer
- **THEN** le widget quitte content pour footer, l'ordre des deux zones est persisté, et undo restaure la position d'origine

### Requirement: Panneau de propriétés contextuel

Le panneau droit du Composer SHALL afficher les propriétés contextuelles selon la sélection :
- **Rien de sélectionné** : propriétés du nœud (module type, activation), sélecteur de template, background global, transitions
- **Zone sélectionnée** : nom de la zone, layout (stack/grid/free), background de la zone, visibilité conditionnelle
- **Widget sélectionné** : type du widget, propriétés spécifiques (texte, source image, label bouton, etc.), style (couleur, taille, alignement)
- **Module widget sélectionné** : propriétés du widget + panneau de configuration du module existant (questions quiz, polygones 7-erreurs, etc.)

Le panneau de propriétés SHALL implémenter le requirement existant "Inspecteur de nœud" : sections module → activation → latch/rejeu → discovery → effects → inventoryRef, mais dans un panneau contextuel plutôt que dans un panneau fixe.

Le panneau SHALL distinguer trois sections de style, affichées selon la sélection :
- **Style global** (aucune sélection écran) : `global.screen.styles` — typo, tailles, couleurs par défaut pour tout le jeu ;
- **Style de l'écran** (écran sans widget sélectionné) : `node.screen.styles` — surcharges de l'écran courant, avec indication des propriétés héritées du global ;
- **Style du contenu sélectionné** (widget sélectionné) : `widgets[].styles` — typo, taille, graisse, couleur, alignement du widget, avec indication des propriétés héritées de l'écran.

#### Scenario: Sélection du module widget
- **GIVEN** un nœud avec un module QUIZ
- **WHEN** l'auteur clique sur le ModuleWidget dans le canvas
- **THEN** le panneau de propriétés affiche les propriétés du widget ET le formulaire de configuration du quiz (questions, options, score)

#### Scenario: Sélection de zone header
- **GIVEN** le canvas avec un screen
- **WHEN** l'auteur sélectionne la zone header
- **THEN** le panneau affiche : layout selector (stack/grid), widgets list, bouton "Ajouter un widget"

#### Scenario: Surcharge de style d'écran visible
- **GIVEN** `global.screen.styles: { fontSize: 14 }` et un écran sans `styles`
- **WHEN** l'auteur ouvre la section style de l'écran
- **THEN** fontSize affiche 14 comme valeur héritée (non éditable en place), modifiable en renseignant la surcharge
