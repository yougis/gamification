## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Plugin 7-erreurs avec tracé de polygones

Le screenPlugin du module DIFFERENCE_GAME SHALL fournir : un `ImagePicker` pour `source`, un pour `derivee`, le champ `touchDilatation` (minimum 44 px rappelé), et un traceur de polygones sur l'image source (clic = ajout de point en %, polygone fermé = zone, liste des zones avec suppression). L'`editorPreview` SHALL montrer la source avec les polygones superposés. Les polygones SHALL rester exprimés en % (responsive) comme au schéma.

#### Scenario: Zone tracée au clic

- **GIVEN** un 7-erreurs avec image source et 0 zone
- **WHEN** l'auteur clique 4 points sur l'image puis ferme le polygone
- **THEN** une zone en % est ajoutée à `module.data.polygons` et affichée en overlay

#### Scenario: Images manquantes signalées

- **GIVEN** un 7-erreurs sans `source`
- **WHEN** l'auteur ouvre le panneau
- **THEN** un appel explicite à déposer les deux images s'affiche (pas de rejet silencieux)

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
