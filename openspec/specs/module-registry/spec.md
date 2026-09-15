## Purpose
Extension du registre de modules pour supporter les nouveaux types de modules nécessaires aux modèles de navigation fonctionnelle (énigmes, codes, indices) et les besoins d'inventaire.

## Requirements

### Requirement: Registre extensible versionne

Chaque type de Module (socle : QUIZ, DIFFERENCE_GAME/7-erreurs, PUZZLE, AR_MARKER, BOUSSOLE ; futurs types) SHALL s'enregistrer avec son sous-schema versionne, ses besoins (`needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock` optionnel), et son rendu. Le registre SHALL supporter de nouveaux types fonctionnels pour les jeux de navigation : `CODE_INPUT`, `CLUE_RESOLVER`, `ITEM_DROPPER`, `ITEM_CONSUMER`.

Ajouter un module ne SHALL jamais modifier le schema des Noeuds/Liens, seulement ajouter une entree au registre. Le moteur SHALL ignorer un type inconnu gracieusement.

#### Scenario: Nouveau type sans refonte
- **GIVEN** un Jeu existant valide et un nouveau type enregistre
- **WHEN** le moteur v0 lit un Jeu sans ce type puis un Jeu avec ce type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le module sans changement du schema graphe

#### Scenario: Type inconnu non bloquant
- **GIVEN** un Jeu referencant un type que le moteur v0 ne connait pas
- **WHEN** le moteur charge le Jeu
- **THEN** le Noeud est marque non jouable avec message au lieu de faire echouer le Jeu

#### Scenario: Nouveau type avec needsLock
- **GIVEN** un 7e type enregistre avec `needsLock: true` dans le registre
- **WHEN** le moteur v0 lit un Jeu sans ce type puis un Jeu avec ce type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le module avec le verrouillage kiosque actif si holdMode != none

#### Scenario: Nouveau type CODE_INPUT enregistré
- **GIVEN** un type `CODE_INPUT` enregistré dans le registre
- **WHEN** le moteur v0 lit un jeu sans ce type puis un jeu avec ce type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le module sans changement du schema graphe

### Requirement: Module flag needsLock

Chaque module enregistre SHALL pouvoir contenir le champ optionnel `needsLock` (bool, defaut `false`). Un module `needsLock: true` NE PEUT ETRE JOUE QUE si `global.holdMode != "none"`. Si un jeu avec un module `needsLock: true` est configure avec `holdMode: "none"`, le validateur applicatif rejette le jeu (couche 2) avec une erreur explicitement liee au module.

#### Scenario: Module besoin de LOCK valide
- **GIVEN** un module AR_MARKER avec `needsLock: true`
- **WHEN** le jeu est configure avec `holdMode: "guidedAccess"`
- **THEN** le module est jouable, le verrouillage kiosque est actif pendant la session AR

#### Scenario: Module LOCK sans HOLD rejeté
- **GIVEN** un module AR_MARKER avec `needsLock: true`
- **WHEN** le jeu est configure avec `holdMode: "none"`
- **THEN** le validateur applicatif rejette le jeu avec erreur : "Module AR_MARKER necessite holdMode != none"

#### Scenario: Module sans needsLock fonctionne dans HOLD
- **GIVEN** un module QUIZ avec `needsLock: false` (defaut)
- **WHEN** le jeu est en `holdMode: "guidedAccess"`
- **THEN** le module fonctionne normalement, le verrouillage kiosque s'applique globalement mais le module n'a pas de contrainte supplementaire

### Requirement: Module flag needsInventory

Chaque module enregistre SHALL pouvoir contenir le champ optionnel `needsInventory` (bool, défaut `false`). Un module `needsInventory: true` indique que le module interagit avec l'inventaire du joueur (donne, consomme ou vérifie des objets).

#### Scenario: Module avec besoin d'inventaire
- **GIVEN** un module CODE_INPUT avec `needsInventory: true`
- **WHEN** le jeu est configuré avec un inventaire
- **THEN** le module peut interagir avec l'inventaire

#### Scenario: Module sans besoin d'inventaire
- **GIVEN** un module QUIZ avec `needsInventory: false` (défaut)
- **WHEN** le jeu est en mode inventaire
- **THEN** le module fonctionne normalement sans interaction avec l'inventaire

### Requirement: Besoins de présentation

Le registre de modules SHALL permettre à chaque module de déclarer ses besoins de présentation (`presentationNeeds`) : liste des modes de présentation qu'il requiert (MAP, CLUE, TOOLBOX, etc.).

#### Scenario: Module nécessitant la carte
- **GIVEN** un module AR_MARKER avec `presentationNeeds: ["MAP", "CAMERA"]`
- **WHEN** le jeu utilise ce module
- **THEN** le player vérifie que MAP et CAMERA sont disponibles

### Requirement: Module avec effets

Un module SHALL pouvoir déclarer les effets qu'il produit à la complétion (`producesEffects`). Cela permet au runtime de savoir quels changements d'état attendre.

#### Scenario: Module produisant un objet
- **GIVEN** un module ITEM_DROPPER avec `producesEffects: [{type: GIVE_ITEM, itemId: "clé"}]`
- **WHEN** le joueur complète le module
- **THEN** la clé est donnée au joueur

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
