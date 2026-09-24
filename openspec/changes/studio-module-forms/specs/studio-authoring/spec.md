## MODIFIED Requirements

### Requirement: Inspecteur de nœud

Le panneau d'inspection SHALL présenter des sections fixes dans cet ordre : `module` (type + version) → `activation` → `latch`/rejeu → `discovery` → `effects` → `inventoryRef` → `position`, générées depuis le registre de modules sans aucun champ codé en dur dans l'UI.

La section `module` SHALL afficher sous le dropdown de type le formulaire de configuration du module (le `propertiesPanel` du registre) quand le type en dispose un : chaque champ requis au schéma du module SHALL être renseignable ici, sans JSON. L'inline historique propre à un type (questions QUIZ) SHALL être supprimé au profit de ce panneau unique.

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

#### Scenario: Formulaire module sous le dropdown
- **GIVEN** un nœud BOUSSOLE avec `toleranceDeg` vide, ouvert dans l'Inspecteur
- **WHEN** l'auteur regarde sous le dropdown « Mini-jeu »
- **THEN** le champ tolérance est affiché (pas de JSON) et le renseigner fait passer la C1 sur ce champ

#### Scenario: Pas de doublon QUIZ
- **GIVEN** un nœud QUIZ ouvert dans l'Inspecteur
- **WHEN** l'auteur regarde la section module
- **THEN** un seul formulaire questions est affiché (le panneau registre), sans inline historique séparé
