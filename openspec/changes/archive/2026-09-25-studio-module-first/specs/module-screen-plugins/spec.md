## MODIFIED Requirements

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
