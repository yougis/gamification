## ADDED Requirements

### Requirement: Module flag screenPlugin

Chaque entrée du registre de modules SHALL pouvoir contenir le champ optionnel `screenPlugin` (objet `ModuleScreenPlugin`, défaut absent). Un module avec `screenPlugin` est rendu dans le WYSIWYG du Studio avec son aperçu, son panneau de propriétés, et son template par défaut. Un module sans `screenPlugin` fonctionne normalement mais affiche un placeholder dans le WYSIWYG.

L'ajout d'un `screenPlugin` à un module existant NE SHALL pas modifier le schéma Noeuds/Liens ni le sous-schéma data du module. Le screenPlugin est une concern du Studio uniquement.

#### Scenario: Module avec screenPlugin

- **GIVEN** le module QUIZ enregistré avec un `screenPlugin`
- **WHEN** le Studio charge le registre
- **THEN** le QUIZ est disponible dans le WYSIWYG avec son aperçu et son panneau de propriétés

#### Scenario: Module sans screenPlugin

- **GIVEN** un module sans `screenPlugin` dans le registre
- **WHEN** le Studio affiche le WYSIWYG
- **THEN** le module affiche un placeholder generic indiquant le type

#### Scenario: Ajout de screenPlugin sans casser le schéma

- **GIVEN** le module DIFFERENCE_GAME déjà enregistré
- **WHEN** un `screenPlugin` est ajouté à son entrée registre
- **THEN** le sous-schéma data du DIFFERENCE_GAME n'a pas changé, le schéma Noeuds/Liens est inchangé
