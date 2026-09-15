## Purpose

Ajout du champ `experienceNeeds` au registre de modules pour permettre aux modules de déclarer quelles dimensions d'experienceStyle ils requièrent.

## ADDED Requirements

### Requirement: Module experienceNeeds

Chaque entrée du registre de modules SHALL pouvoir contenir le champ optionnel `experienceNeeds` (array de strings). Ce champ déclare les dimensions d'`experienceStyle` que le module nécessite pour fonctionner correctement.

Les valeurs possibles de `experienceNeeds` sont : `"visual"`, `"audio"`, `"map"`, `"voice"`, `"components"`, `"motion"`, `"identity"`.

Un module sans `experienceNeeds` n'a aucune exigence spécifique d'experienceStyle.

#### Scenario: Module nécessitant la carte et le visuel
- **GIVEN** un module AR_MARKER avec `experienceNeeds: ["map", "visual"]`
- **WHEN** le moteur charge le jeu
- **THEN** le player vérifie que MAP et les styles visuels sont disponibles dans l'`experienceStyle`

#### Scenario: Module sans besoins spécifiques
- **GIVEN** un module QUIZ sans `experienceNeeds`
- **WHEN** le moteur charge le jeu
- **THEN** le module fonctionne sans interaction avec l'`experienceStyle`

### Requirement: Validation de l'experienceNeeds

Le validateur applicatif SHALL vérifier que tout `experienceNeeds` référencé dans le registre correspond à une dimension valide de `experienceStyle`. Toute référence à une dimension inconnue SHALL être rejetée.

#### Scenario: Dimension inconnue dans experienceNeeds
- **GIVEN** un module avec `experienceNeeds: ["unknownDimension"]`
- **WHEN** le validateur controle le jeu
- **THEN** le jeu est rejeté avec erreur : "Dimension 'unknownDimension' inconnue"

### Requirement: Résolution des besoins au runtime

Au runtime, le moteur SHALL vérifier les `experienceNeeds` de chaque module lors de son initialisation. Si un module requiert une dimension absente de l'`experienceStyle` résolu, le moteur SHALL :
- Appliquer les valeurs par défaut pour cette dimension
- Journaliser un avertissement
- Ne PAS bloquer le module

#### Scenario: Module avec dimension absente
- **GIVEN** un module AR_MARKER avec `experienceNeeds: ["map"]` et un `experienceStyle` sans configuration `map`
- **WHEN** le module est initialisé
- **THEN** le moteur applique les valeurs par défaut pour `map` et journalise un avertissement

### Requirement: Registry extensible

Le registre de modules SHALL supporter l'ajout de nouveaux types sans modification du schema des Noeuds/Liens. L'ajout de `experienceNeeds` à un module existant NE SHALL pas modifier le schema graphe.

#### Scenario: Nouveau type avec experienceNeeds
- **GIVEN** un 6e type enregistré avec `experienceNeeds: ["voice"]`
- **WHEN** le moteur v0 lit un jeu sans ce type puis un jeu avec ce type sur moteur à jour
- **THEN** le premier joue à l'identique et le second rend le module sans changement du schema graphe
