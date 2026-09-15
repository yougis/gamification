## Why

Le Studio GeoPlay ne sait actuellement charger qu'une seule fixture figée (`game-5poi.json`). Un créateur ne peut pas ouvrir un fichier JSON de jeu existant pour le relire, le modifier ou le valider dans l'éditeur visuel. Cette limitation empêche le workflow auteur-runtime de fonctionner : un jeu créé ou exporté ailleurs ne peut pas être rechargé dans le Studio pour modification.

## What Changes

- **Nouveau** : bouton "Importer" dans la barre d'outils du Studio pour charger un fichier JSON de jeu depuis le système
- **Nouveau** : fonction `importGame(file)` dans le MCP du Studio qui valide le JSON (couches 1+2) avant de le charger dans l'état du Studio
- **Nouveau** : gestion d'erreur utilisateur-friendly si le fichier est invalide (afficher les erreurs de validation dans l'interface)
- **Modification** : la fonction `chargerFixture()` existante est remplacée par `importGame()` générique
- **BREAKING** : le chargement de la fixture `game-5poi.json` au démarrage est retiré ; le Studio démarre avec un jeu vide par défaut

## Capabilities

### New Capabilities
- `game-import`: Import de fichier JSON de jeu dans le Studio avec validation bi-couche (Draft-07 + applicative), affichage des erreurs en cas d'échec

### Modified Capabilities
- `studio-authoring`: Le Studio supporte désormais l'import de fichier, pas seulement la création de zéro et l'export
- `player-install`: Le format de pack reste compatible ; l'import Studio utilise le même JSON que le runtime

## Impact

- **Studio UI** (`App.tsx`) : ajout d'un bouton importer, gestion de l'état de chargement
- **MCP Studio** (`mcp.ts`) : nouvelle fonction `importGame()`
- **Validation** (`validate.ts`) : réutilisation de `validateGame()` déjà existante
- **Pack** (`pack.ts`) : pas de modification nécessaire (l'import Studio ne passe pas par le format pack)
- **Types** (`types.ts`) : pas de modification nécessaire
