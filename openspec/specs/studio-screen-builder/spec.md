# studio-screen-builder Specification

## Purpose

Système de composition d'écrans WYSIWYG dans le Studio GeoPlay, permettant aux créateurs de concevoir visuellement la mise en forme des écrans joueurs (fond, en-tête, contenu, pied de page) sans écrire de JSON, via un canvas de prévisualisation phone-size et un panneau de propriétés contextuel.

## Requirements

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
- `fermable` (booléen optionnel, défaut `false`) : réservé à la zone `overlay` — `true` autorise le joueur à masquer la surimpression (clic sur le fond) et à la réafficher (icône message). Sur les autres zones, la valeur est ignorée.

`additionalProperties: false` SHALL être appliqué.

#### Scenario: Zone avec layout stack

- **GIVEN** une zone avec `layout: "stack"` et 2 widgets
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée

#### Scenario: Zone avec layout inconnu

- **GIVEN** une zone avec `layout: "flexbox"`
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est rejeté (valeur non dans l'enum)

#### Scenario: Overlay fermable acceptée

- **GIVEN** une zone overlay avec `fermable: true` et 1 widget
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée

#### Scenario: Overlay sans fermable (défaut fermé)

- **GIVEN** une zone overlay sans champ `fermable`
- **WHEN** le joueur clique le fond de la surimpression
- **THEN** rien ne se masque (comportement historique, compat ascendante)

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

Tout widget visuel (image, carte, module, et par extension texte/bouton/progression) MAY porter des props de mise en page communes et optionnelles : `largeurPct` / `hauteurPct` (numbers 0-100, relatifs à la zone ; absents = comportement actuel auto/flux) et `pleinEcran` (booléen, défaut `false` ; à `true` le widget sort du flux et remplit le cadre téléphone en `absolute inset-0`, sous la zone overlay qui reste au sommet). Ces props SHALL être déclarées explicitement dans chaque variante visuelle du schéma (jamais implicites, `additionalProperties: false` conservé).

L'ordre de peinture intra-zone SHALL suivre l'ordre du tableau `widgets` (dernier = dessus) ; réordonner (drag existant, monter/descendre) SHALL changer l'empilement sans toucher aux autres props. L'empilement des zones SHALL rester fixe : header → content → footer → overlay.

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

#### Scenario: Carte plein écran valide

- **GIVEN** un widget `{ type: "map", source: { kind: "steps" }, pleinEcran: true }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Taille hors bornes rejetée

- **GIVEN** un widget `{ type: "image", src: "a.png", largeurPct: 150 }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (hors 0-100)

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

### Requirement: Éditeur WYSIWYG canvas

Le Studio SHALL offrir un canvas de prévisualisation phone-size (environ 375x667 pixels) dans le panneau central du Composer. Le canvas SHALL afficher les zones du screen (header, content, footer) avec leurs widgets rendus.

Le canvas SHALL supporter :
- Sélection de zone par clic (surlignage visuel)
- Sélection de widget par clic dans une zone
- Ajout de widget via un menu contextuel ou drag depuis une palette
- Réordonnancement de widgets par drag & drop dans une zone
- Suppression de widget par bouton ou touche Delete
- Suppression de zone (header, footer, overlay) par bouton dans le panneau de propriétés — la zone `content` restant la base insuppressible ; après suppression, le fantôme de création correspondant SHALL réapparaître
- Masquage temporaire de la surimpression par toggle « œil » (état local d'édition, jamais persisté) pour voir et éditer le fond dessous ; la zone reste sélectionnable via le panneau, l'arbre ou le réaffichage

Le panneau de propriétés d'une zone overlay SHALL exposer une case « fermable par le joueur » reflétant `fermable` (défaut décochée).

Un clic sur une zone SHALL sélectionner cette zone sans la désélectionner aussitôt : le clic ne SHALL jamais bouillonner vers le fond du canvas (qui vide la sélection). Seul un clic sur le fond vide du canvas SHALL vider la sélection.

Les zones header/footer/overlay absentes de l'écran SHALL être dessinées en pointillés (« + En-tête », « + Pied de page », « + Surimpression »). Un clic sur une zone fantôme SHALL créer la zone vide et la sélectionner.

Le canvas SHALL être synchronisé avec le nœud sélectionné dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

Le canvas SHALL proposer un sélecteur de viewport : téléphone portrait (375×667), téléphone paysage (667×375), tablette portrait (768×1024), tablette paysage (1024×768). Changer de viewport SHALL redimensionner le canvas et réajuster la mise en page (zones `free` conservées en coordonnées relatives). Le viewport SHALL rester un état d'édition local, jamais persisté dans le JSON. En viewport paysage (ou tablette paysage), le canvas SHALL s'ajuster à l'espace disponible du panneau central par mise à l'échelle, sans barre de défilement : le cadre reste intégralement visible (plein cadre).

Le contenu des widgets texte SHALL être éditable en place : un clic sur un texte l'ouvre en édition, Entrée ou perte de focus SHALL persister la valeur via l'opération MCP (annulable par undo). Les widgets texte SHALL pouvoir être déplacés par glisser-déposer, y compris d'une zone vers une autre.

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

#### Scenario: Bascule portrait vers tablette paysage

- **GIVEN** un screen affiché en téléphone portrait
- **WHEN** l'auteur choisit le viewport tablette paysage
- **THEN** le canvas passe en 1024×768, les zones restent visibles et le JSON du jeu est inchangé

#### Scenario: Paysage plein cadre sans ascenseur

- **GIVEN** le viewport téléphone paysage avec un panneau central plus petit que 667×375
- **WHEN** le canvas s'affiche
- **THEN** le cadre est mis à l'échelle pour rester intégralement visible, sans barre de défilement, et le JSON du jeu est inchangé

#### Scenario: Suppression de la surimpression

- **GIVEN** un écran avec une zone overlay créée précédemment
- **WHEN** l'auteur supprime la zone depuis le panneau de propriétés et annule (undo)
- **THEN** la zone disparaît puis réapparaît à l'annulation, et le fantôme « + Surimpression » est visible quand la zone est absente

#### Scenario: Œil masquant la surimpression

- **GIVEN** un écran avec une zone overlay remplie qui recouvre le fond
- **WHEN** l'auteur active le toggle « œil »
- **THEN** la surimpression se masque (fond éditable), le JSON est inchangé, et la zone reste sélectionnable via le panneau ou l'arbre

#### Scenario: Case fermable reflétée

- **GIVEN** une zone overlay avec `fermable: false`
- **WHEN** l'auteur coche « fermable par le joueur »
- **THEN** le JSON porte `fermable: true` (opération annulable par undo)

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

Chaque section de style SHALL être rendue comme une barre d'outils compacte genre éditeur de texte riche, groupant les contrôles au lieu d'une ligne par propriété :
- groupe typographie (police, taille, gras/normal),
- groupe couleur (couleur du texte, couleur de fond selon les champs couverts),
- groupe alignement (gauche/centré/droite),
- groupe surcharge (retirer la surcharge = retour à l'héritage).

La sémantique d'héritage SHALL être inchangée : chaque contrôle affiche la valeur résolue et son origine (badge Global/Écran/Widget/défaut) ; renseigner surcharge le niveau édité, effacer retombe sur l'héritage. Seuls les champs couverts par le niveau (et par `customizableStyles` pour un module) SHALL être proposés.

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

#### Scenario: Barre d'outils groupée

- **GIVEN** un widget texte sélectionné avec `global.screen.styles: { fontFamily: "Georgia" }`
- **WHEN** l'auteur ouvre la section « Style — Contenu »
- **THEN** une seule barre compacte affiche les groupes typographie/couleur/alignement/surcharge, et la police affiche Georgia comme valeur héritée badgée Global

#### Scenario: Gras en un clic

- **GIVEN** la barre d'outils de style du contenu avec graisse héritée « normal »
- **WHEN** l'auteur active le contrôle gras du groupe typographie
- **THEN** `widgets[].styles.fontWeight` vaut `bold`, le badge passe à Widget, et l'aperçu du canvas reflète la graisse

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

### Requirement: Sélecteur de viewport en icônes compactes

Les boutons de choix de viewport d'aperçu (téléphone portrait/paysage, tablette portrait/paysage) SHALL être des boutons icônes compacts : une icône par format (écran vertical ou horizontal, taille téléphone ou tablette), sans libellé texte permanent. Le libellé complet (format + dimensions) SHALL rester accessible via infobulle (`title`) et `aria-label`, et le viewport courant SHALL rester signalé (état actif + pastille de dimensions existante).

#### Scenario: Choix tablette paysage en un clic

- **GIVEN** la barre des viewports affichée avec 4 boutons icônes
- **WHEN** l'auteur clique l'icône tablette paysage
- **THEN** le canvas passe en 1024×768, le bouton porte l'état actif, et l'infobulle annonçait « Tablette paysage (1024×768) »

#### Scenario: Accessibilité conservée

- **GIVEN** les boutons icônes affichés
- **WHEN** l'auteur navigue au clavier avec un lecteur d'écran
- **THEN** chaque bouton annonce son format et ses dimensions via `aria-label`

### Requirement: Variante MapWidget strate 2

Le schéma SHALL définir une variante `MapWidget` au discriminant `type` des Widget : `{ type: "map", source, background?, poiStyle?, volet?, icon?, styles? }`. `MapWidget` est strate 2 (lié, passif) : il lit le moteur (positions, états, éligibilité) et SHALL NE JAMAIS produire ni transition d'état ni event de progression ni effet. `additionalProperties: false` SHALL être appliqué à la variante.

#### Scenario: Widget carte valide

- **GIVEN** un widget `{ type: "map", source: { kind: "steps" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Champ étranger rejeté

- **GIVEN** un widget `{ type: "map", source: { kind: "steps" }, questions: [] }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (champ étranger à MapWidget)

### Requirement: Invariant des 3 strates

Tout widget SHALL appartenir à exactement une strate : strate 1 CONTENU (passif, auteur : `text`, `image`, `button`, `spacer`, `progress` — affiche, zéro lecture moteur, zéro effet), strate 2 LIÉ (passif, dérivé du jeu : `map` et futurs liés — lit le moteur, zéro écriture, zéro event), strate 3 MOTEUR (`module`, unique portail vers le mini-jeu — seul widget pouvant compléter, scorer, déclencher transitions, effects et events). Aucun widget de strate 1 ou 2 SHALL porter de mécanique de complétion ou de score.

#### Scenario: Carte sans mécanique

- **GIVEN** un écran avec un widget `map` et un widget `module`
- **WHEN** le joueur interagit avec la carte (sélection, navigation)
- **THEN** aucune complétion, aucun score, aucun event de progression n'est émis ; seule l'interaction avec le `module` peut en produire

### Requirement: Source steps avec filtre découverts seuls

`MapWidget.source` SHALL être `{ kind: "steps", filter?: "discovered" | "all" }` (défaut `discovered`). Avec `discovered`, seules les étapes découvertes (`VISIBLE_NOW` ou discovery satisfaite) sont affichées ; les étapes non découvertes SHALL rester invisibles (jamais d'icône de remplacement). `all` est réservé aux jeux sans mécanique de découverte et SHALL être signalé comme éventant les étapes cachées. Le validateur applicatif SHALL émettre un avertissement (pas un rejet) quand `filter: "all"` coexiste avec des nœuds en discovery non-`VISIBLE_NOW`.

#### Scenario: Étape cachée invisible par défaut

- **GIVEN** un widget carte avec `source: { kind: "steps" }` et un nœud en `discovery: { mode: ON_CLUE }` non révélé
- **WHEN** le joueur ouvre l'écran
- **THEN** le nœud n'apparaît ni en marqueur ni en liste, sans emplacement vide

#### Scenario: Filtre all averti

- **GIVEN** un widget carte avec `source: { kind: "steps", filter: "all" }` et un nœud en discovery `ON_CLUE`
- **WHEN** la validation applicative tourne
- **THEN** un avertissement signale l'éventement des étapes cachées, sans bloquer

### Requirement: Fonds pack-only interchangeables

`MapWidget.background` SHALL valoir `"pack-tiles"` (défaut, tuiles pré-chargées `global.map`), `"indoor-plan"` (plan actif `global.indoorPlans`, jeux indoor) ou `"solid"` (fond uni). Toute source réseau (URL de tuiles, fond distant) SHALL être rejetée : les fonds sont des assets du pack (manifest SHA-256) ou le fallback uni. Sans tuiles ni plan, le widget SHALL rendre le fond uni avec marqueurs et position, exactement comme la carte standalone.

#### Scenario: Fond réseau rejeté

- **GIVEN** un widget carte avec `background: { url: "https://tuiles.exemple.fr/{z}/{x}/{y}.png" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (fonds hors enum pack-only)

#### Scenario: Tuiles absentes, fond uni

- **GIVEN** un jeu outdoor sans tuiles pré-chargées et un widget carte en `pack-tiles`
- **WHEN** le joueur ouvre l'écran
- **THEN** le fond est uni, marqueurs, cercles et position restent lisibles

### Requirement: Styles POI par état

`MapWidget.poiStyle` (optionnel) SHALL associer une icône à chaque état moteur : `{ locked?, unlocked?, completed? }` (références d'icônes ou glyphes, jamais d'URL réseau). Non renseigné, le moteur SHALL appliquer son jeu d'icônes par défaut, distinct par état et lisible sans la couleur seule. L'état affiché SHALL suivre l'état moteur temps réel (`LOCKED → UNLOCKED → COMPLETED`).

#### Scenario: Icônes par défaut distinctes

- **GIVEN** un widget carte sans `poiStyle` et 3 POI dans les 3 états
- **WHEN** le joueur ouvre l'écran
- **THEN** les 3 marqueurs sont visuellement distincts sans recourir à la couleur seule

#### Scenario: Icônes auteur appliquées

- **GIVEN** un widget carte avec `poiStyle: { locked: "cadenas", unlocked: "etoile" }`
- **WHEN** le joueur ouvre l'écran
- **THEN** les POI verrouillés portent `cadenas`, les éligibles `etoile`, les autres états les défauts

### Requirement: Volet composé par l'auteur avec défaut texte + bouton

`MapWidget.volet` (optionnel) SHALL être un contenu de widgets strate 1 affiché à la sélection d'un marqueur, avec un contexte implicite = le POI sélectionné (champs liés disponibles : nom, état, compte à rebours). À la pose du widget, un **volet par défaut** SHALL être créé : un widget `text` (nom du POI) + un widget `button` d'accès au POI, actif seulement si le POI est déverrouillé. L'auteur MAY remplacer ce contenu librement (ajout, édition, suppression, comme tout contenu de zone, annulable par undo).

#### Scenario: Volet par défaut à la pose

- **GIVEN** un auteur posant un widget carte dans un écran
- **WHEN** le widget est créé
- **THEN** son volet contient un texte (nom du POI sélectionné) et un bouton d'accès inactif tant que le POI est verrouillé

#### Scenario: Volet personnalisé conservé

- **GIVEN** un volet modifié par l'auteur (texte d'ambiance ajouté)
- **WHEN** l'auteur recharge le Studio puis rouvre l'écran
- **THEN** le volet personnalisé est intact, le défaut n'est jamais réappliqué

### Requirement: Bouton à état lié vers l'étape

Le bouton du volet SHALL refléter l'éligibilité du POI sélectionné : `Ouvrir` actif si le POI est éligible (`UNLOCKED`), `Verrouillé` désactivé sinon. Activer `Ouvrir` SHALL présenter l'écran de l'étape éligible (même présentation d'éligible existant : aucune transition ajoutée, aucun event ajouté). Le bouton désactivé SHALL expliquer le verrouillage (motif générique, jamais de fuite discovery : un POI non découvert n'affiche pas de volet du tout).

#### Scenario: POI éligible ouvrable

- **GIVEN** un POI `UNLOCKED` sélectionné dans la carte
- **WHEN** le joueur touche `Ouvrir`
- **THEN** l'écran de l'étape s'ouvre sans event de progression, comme par tout autre déclencheur

#### Scenario: POI verrouillé non ouvrable

- **GIVEN** un POI `LOCKED` sélectionné dans la carte
- **WHEN** le joueur regarde le volet
- **THEN** le bouton affiche `Verrouillé`, désactivé, et aucun appui ne produit d'effet

### Requirement: Champ source ouvert pour les futurs liés

Le sous-objet `source` SHALL être le point d'extension des futurs widgets liés (tableau, messages, timer) : `source: { kind: <enum> }` où l'enum démarre à `"steps"` et s'étend par change dédié, avec `additionalProperties: false` par kind. Un kind inconnu SHALL être rejeté en couche 1 (compatibilité traitée par enregistrement, jamais par lecture silencieuse). Le validateur applicatif SHALL vérifier la cohérence source/jeu (ex. source steps avec jeu HOME-seul sans nœud = avertissement, pas rejet).

#### Scenario: Kind inconnu rejeté

- **GIVEN** un widget avec `source: { kind: "scores" }` (kind futur non enregistré)
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (kind hors enum)

