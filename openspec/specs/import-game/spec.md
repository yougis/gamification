# game-import — Import de fichier dans le Studio

## Purpose

Permet au Studio GeoPlay d'importer un fichier JSON de jeu existant, de le valider en double couche (Draft-07 + applicative), et de le charger dans l'éditeur visuel pour modification.

## Requirements

### Requirement: Import de fichier JSON

Le Studio SHALL permettre à l'utilisateur de sélectionner un fichier JSON via un sélecteur de système de fichiers. Le fichier SHALL être lu, validé, et chargé dans l'état du Studio.

Le bouton "Importer" SHALL être visible dans la barre d'outils du Studio, à côté du bouton "Exporter".

#### Scenario: Import d'un jeu valide
- **GIVEN** un utilisateur clique sur le bouton "Importer"
- **WHEN** il sélectionne un fichier JSON valide (ex. `game-sherlock-holmes.json`)
- **THEN** le jeu est chargé dans le Studio, le graphe visuel se met à jour, la validation s'exécute automatiquement, et le rapport d'erreurs est affiché

#### Scenario: Import d'un fichier invalide
- **GIVEN** un utilisateur sélectionne un fichier JSON qui ne passe pas la validation
- **WHEN** l'import est tenté
- **THEN** le fichier est rejeté, les erreurs de validation sont affichées dans l'interface (couche 1 et couche 2 séparément), et le Studio reste sur le jeu précédent

#### Scenario: Import d'un fichier corrompu
- **GIVEN** un utilisateur sélectionne un fichier qui n'est pas un JSON valide
- **WHEN** l'import est tenté
- **THEN** une erreur de parsing est affichée, le Studio reste sur le jeu précédent

### Requirement: Validation à l'import

Le fichier importé SHALL passer la validation bi-couche :
1. **Couche 1 (Draft-07)** : validation AJV du schéma JSON
2. **Couche 2 (applicative)** : validation des cycles, atteignabilité, objets référencés, cohérence HOLD

Si la couche 1 échoue, la couche 2 ne s'exécute pas. Les deux couches sont documentées séparément dans le rapport.

#### Scenario: Validation automatique à l'import
- **GIVEN** un fichier importé passe la couche 1 mais échoue la couche 2
- **WHEN** l'import est terminé
- **THEN** le jeu est chargé mais le rapport affiche les erreurs applicatives, l'export est bloqué

### Requirement: Import par glisser-déposer

Le Studio SHALL aussi supporter le glisser-déposer d'un fichier JSON sur la zone du Studio pour déclencher l'import.

#### Scenario: Glisser-déposer
- **GIVEN** un utilisateur glisse un fichier JSON sur la fenêtre du Studio
- **WHEN** le fichier est déposé
- **THEN** l'import est traité comme un clic sur le bouton "Importer"

### Requirement: Historique des imports

Le Studio SHALL maintenir un historique des fichiers importés (chemins récents) dans le localStorage, pour faciliter les re-imports.

#### Scenario: Re-import rapide
- **GIVEN** un utilisateur a importé `game-sherlock-holmes.json` précédemment
- **WHEN** il ouvre le menu "Importer"
- **THEN** le fichier est proposé dans la liste des imports récents

### Requirement: Intégration avec le workflow existant

L'import SHALL fonctionner avec le workflow existant du Studio (undo/redo, validation, export). Le jeu importé est traité exactement comme un jeu créé de zéro.

#### Scenario: Import puis export
- **GIVEN** un utilisateur importe `game-sherlock-holmes.json`
- **WHEN** il modifie le jeu et clique "Exporter"
- **THEN** le JSON exporté est un jeu valide avec les modifications appliquées

### Requirement: Pas de transmission réseau

L'import de fichier est entièrement local. Aucun fichier n'est transmis à un serveur. Le manifest SHA-256 est généré localement.

#### Scenario: Import offline
- **GIVEN** un utilisateur sans connexion réseau
- **WHEN** il importe un fichier JSON
- **THEN** le jeu est chargé et fonctionnel sans aucune requête réseau
