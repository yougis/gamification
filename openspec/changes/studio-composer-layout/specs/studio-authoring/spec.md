## MODIFIED Requirements

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 6 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

La navigation latérale SHALL être repliable en une colonne d'icônes sur grand écran, avec accès direct aux actions de création (Étape, Lieu, Tirage, Fin) dans l'état replié.

Une barre globale SHALL afficher en permanence : le nom du jeu, son statut (`draft`/`reviewed`), l'indicateur de validation C1/C2, l'undo/redo et l'accès à l'export.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

#### Scenario: Menu replié avec actions de création
- **GIVEN** le Studio en mode grand écran avec le menu latéral replié
- **WHEN** l'auteur regarde la barre latérale
- **THEN** les boutons de création (Étape, Lieu, Tirage, Fin) sont visibles en tant qu'icônes cliquables, même sans nœud sélectionné

### Requirement: Inspecteur de nœud

Le panneau d'inspection SHALL présenter des sections fixes dans cet ordre : `module` (type + version) → `activation` → `latch`/rejeu → `discovery` → `effects` → `inventoryRef` → `position`, générées depuis le registre de modules sans aucun champ codé en dur dans l'UI.

Le panneau d'inspection SHALL utiliser un système de sidebar à icônes : une colonne d'icônes identifiant chaque section, avec un contenu qui s'affiche lorsqu'une icône est sélectionnée. Si aucun nœud n'est sélectionné, la sidebar affiche un placeholder indiquant de sélectionner un nœud.

Si le module déclare `needsLock: true` alors que `holdMode == none`, le champ HOLD correspondant SHALL être affiché en lecture seule avec un lien direct vers la configuration globale et l'explication du blocage, jamais un blocage muet.

Des `presentationNeeds`/`experienceNeeds` non satisfaits par la config globale active SHALL afficher un avertissement inline sans bloquer — le blocage reste le rôle exclusif de l'écran Valider.

#### Scenario: Module needsLock sans HOLD expliqué
- **GIVEN** un nœud AR_MARKER (`needsLock: true`) dans un jeu avec `holdMode == "none"`
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** le champ HOLD est en lecture seule, explique qu'il faut un `holdMode` actif, et propose le lien vers la config globale

#### Scenario: Besoins non satisfaits avertis sans bloquer
- **GIVEN** un module avec `experienceNeeds: ["map"]` et un `experienceStyle` sans configuration `map`
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** un avertissement inline est affiché et l'édition du nœud reste possible

#### Scenario: Sidebar à icônes avec placeholder
- **GIVEN** le Composer ouvert sans nœud sélectionné
- **WHEN** l'auteur regarde le panneau d'inspection à droite
- **THEN** une colonne d'icônes est visible, le contenu affiche "Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier"

#### Scenario: Sélection d'une section via icône
- **GIVEN** un nœud sélectionné dans l'inspecteur
- **WHEN** l'auteur clique sur l'icône "Effets" (section 7)
- **THEN** le contenu de la section Effets s'affiche dans le panneau, les autres sections sont masquées

### Requirement: Barre d'outils de création dans la liste

L'écranComposer, lorsque l'onglet "Liste" est actif, SHALL afficher une barre d'outils de création au-dessus de la liste des nœuds. Cette barre SHALL proposer les mêmes actions que la palette du graphe : Étape de jeu, Lieu GPS, Tirage au sort, Fin du jeu.

La barre de création SHALL être visible en permanence lorsque l'onglet Liste est actif, indépendamment de la sélection de nœud.

#### Scenario: Création depuis la liste
- **GIVEN** l'auteur dans l'onglet "Liste" du Composer
- **WHEN** il clique sur "Lieu GPS" dans la barre d'outils
- **THEN** un nouveau nœud de type INFO avec condition GEOFENCE est créé, sélectionné, et la vue bascule vers l'inspecteur

#### Scenario: Barre visible sans sélection
- **GIVEN** l'onglet "Liste" actif sans nœud sélectionné
- **WHEN** l'auteur regarde la barre d'outils
- **THEN** les 4 boutons de création sont visibles et cliquables

## ADDED Requirements

### Requirement: Suppression de l'onglet Essai du Composer

Le Composer SHALL ne plus proposer l'onglet "Essai". Le composant Apercu (simulateur de jeu) SHALL être déplacé dans l'écran Prévisualiser, qui devient l'écran unique de simulation pas-à-pas.

L'écran Prévisualiser SHALL intégrer le simulateur Apercu avec les mêmes fonctionnalités qu'auparavant : bypass capteurs, `forceDraw`, injection `sessionId`, flag triche, `forceHoldLock`/`forceHoldExit`.

#### Scenario: Apercu dans Prévisualiser
- **GIVEN** l'auteur navigue vers l'écran Prévisualiser
- **WHEN** il charge un jeu
- **THEN** le simulateur Apercu s'affiche avec les mêmes contrôles qu'auparavant dans l'onglet Essai du Composer

#### Scenario: Composer sans onglet Essai
- **GIVEN** le Composer ouvert
- **WHEN** l'auteur regarde les onglets disponibles
- **THEN** seuls les onglets "Graphe", "Liste" et "Détail" sont affichés (pas "Essai")
