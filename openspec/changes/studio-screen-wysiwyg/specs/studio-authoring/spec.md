## ADDED Requirements

### Requirement: Éditeur WYSIWYG screen builder

Le Studio SHALL offrir un éditeur WYSIWYG qui remplace l'Inspector fixe par un panneau de propriétés contextuel. L'éditeur SHALL comporter :
- Un canvas de prévisualisation phone-size (environ 375x667px) dans le panneau central du Composer, affichant les zones (header, content, footer) avec leurs widgets rendus
- Un panneau de propriétés contextuel dans le panneau droit, affichant les propriétés selon la sélection (rien → propriétés nœud, zone → propriétés zone, widget → propriétés widget, module widget → config module + propriétés widget)
- Un sélecteur de template (TemplatePicker) pour choisir parmi des templates de mise en page prédéfinis

Le panneau de propriétés contextuel SHALL conserver les 9 familles de l'Inspector existant (module, activation, latch/rejeu, discovery, effects, inventoryRef, etc.) dans le même ordre, mais dans un panneau contextuel plutôt que fixe. Les warnings `needsLock` et `experienceNeeds` SHALL être affichés dans le panneau contextuel.

Le canvas SHALL être synchronisé avec la sélection du nœud dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

#### Scenario: Bascule de l'Inspector vers le WYSIWYG

- **GIVEN** un auteur habitué à l'Inspector fixe
- **WHEN** le Studio affiche le nouveau Composer
- **THEN** les mêmes sections (module, activation, discovery, effects, etc.) sont disponibles dans le panneau contextuel du WYSIWYG, dans le même ordre

#### Scenario: Sélection de nœud affiche son screen

- **GIVEN** un jeu avec 3 nœuds ayant des screens différents
- **WHEN** l'auteur sélectionne le nœud 2 dans le graphe
- **THEN** le canvas affiche le screen du nœud 2 et le panneau de propriétés affiche ses propriétés

#### Scenario: Modification de widget persistée

- **GIVEN** un nœud avec un widget texte dans la zone header
- **WHEN** l'auteur modifie le texte du widget dans le panneau de propriétés
- **THEN** le texte est mis à jour dans le canvas et dans le JSON du nœud

### Requirement: Navigation graphe/screen dans le Composer

Le Composer SHALL offrir un toggle ou une navigation entre la vue graphe (canvas de nœuds et arêtes) et la vue screen (WYSIWYG du nœud sélectionné). La sélection de nœud SHALL être synchronisée entre les deux vues.

Un raccourci clavier ou bouton SHALL permet basculer rapidement entre la vue graphe et la vue screen du nœud sélectionné.

#### Scenario: Toggle vers la vue screen

- **GIVEN** le Composer en vue graphe avec un nœud sélectionné
- **WHEN** l'auteur clique sur le bouton "Screen" ou utilise le raccourci
- **THEN** le panneau central affiche le WYSIWYG screen du nœud sélectionné

#### Scenario: Retour à la vue graphe

- **GIVEN** le Composer en vue screen
- **WHEN** l'auteur clique sur le bouton "Graphe"
- **THEN** le panneau central revient à la vue graphe avec le même nœud sélectionné
