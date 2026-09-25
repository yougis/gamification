## MODIFIED Requirements

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
