## MODIFIED Requirements

### Requirement: Carte configurable avec fallback

Le fond SHALL être configuré `{provider, bbox, minZoom, maxZoom, attribution, tileStrategy, tileRadiusMeters, tilePackId}` (MapLibre Native), la trace GPX et la boussole SHALL rester utilisables sur
fond uni, et une image statique SHALL servir de fallback si les tuiles manquent.
Stacks web exclues (Leaflet, WebXR), Mapbox par défaut exclu (licence offline).

`tileStrategy` SHALL valoir `fixed` (bbox statique, défaut), `viewport` (auto selon viewport), `radius` (bbox autour des POI avec `tileRadiusMeters`), ou `none` (pas de carte, jeux indoor/purement indoor).

`tilePackId` (string optionnel) SHALL désigner l'unique pack de tuiles actif du projet, utilisé à l'export. Absent, le comportement reste celui de la bbox calculée à l'export (compat ascendante).

#### Scenario: Tuiles manquantes en grotte

- **GIVEN** une zone sans tuiles pré-chargées
- **WHEN** le joueur ouvre la carte
- **THEN** trace + position + flèche restent lisibles sur fond uni

#### Scenario: Jeu indoor sans téléchargement de tuiles

- **GIVEN** un jeu avec `tileStrategy: "none"` et `global.indoorPlans` configuré
- **WHEN** le pack est généré
- **THEN** aucune tuile n'est téléchargée, le Player affiche uniquement le plan indoor

#### Scenario: Jeu BASIC avec cache radius

- **GIVEN** un jeu avec `tileStrategy: "radius"` et `tileRadiusMeters: 200`
- **WHEN** le pack est généré
- **THEN** seules les tuiles dans un rayon de 200m autour des POI sont pré-chargées

#### Scenario: Pack actif utilisé à l'export

- **GIVEN** un projet avec 2 packs en cache et `tilePackId` désignant le second
- **WHEN** le pack du jeu est généré
- **THEN** seules les tuiles du second pack sont embarquées (manifest SHA-256)

## ADDED Requirements

### Requirement: Calcul bbox automatique

Le Studio SHALL calculer automatiquement la bbox optimale pour le téléchargement des tuiles en fonction de la stratégie sélectionnée :

- `fixed` : bbox statique définie dans `global.map.bbox` (comportement actuel)
- `viewport` : bbox dynamique basée sur la position du joueur au runtime
- `radius` : bbox calculée depuis les positions des POI avec `tileRadiusMeters` de buffer
- `none` : aucune bbox, pas de téléchargement

Le calcul SHALL être réalisé par le Studio lors de l'export (MCP) et le résultat SHALL être inclus dans le manifest du pack.

#### Scenario: bbox calculée automatiquement en mode radius
- **GIVEN** un jeu avec 3 POI aux positions (48.8566, 2.3522), (48.8600, 2.3550), (48.8580, 2.3500) et `tileRadiusMeters: 300`
- **WHEN** le Studio calcule la bbox
- **THEN** la bbox couvre tous les POI avec un buffer de 300m

### Requirement: Pré-chargement adaptatif selon navigation

Le Player SHALL adapter la stratégie de pré-chargement selon le `navigationModel` du jeu :

- `BASIC` : large bbox (tous les POI + 500m buffer) — le joueur se déplace librement
- `GUIDED` : bbox linéaire (séquence des POI + 300m) — le joueur suit un parcours
- `TREASURE_HUNT` : bbox dynamique (POI discoverable + 400m) — le joueur cherche
- `ESCAPE_GAME` : bbox compact (POI + 200m) — le joueur est en zone limitée
- `OPEN_EXPLORATION` : bbox large (tous les POI + 1000m) — exploration libre

#### Scenario: Pré-chargement GUIDED
- **GIVEN** un jeu GUIDED avec 5 POI en séquence
- **WHEN** le Player calcule la bbox de pré-chargement
- **THEN** la bbox est une bande linéaire suivant la séquence des POI avec 300m de buffer

### Requirement: Exclusion des tuiles non nécessaires

Le validateur applicatif SHALL vérifier que les tuiles téléchargées correspondent à la zone pertinente du jeu. Les tuiles hors de la bbox calculée ne SHALL pas être incluses dans le pack.

#### Scenario: Tuiles hors zone exclues
- **GIVEN** un pack avec 100 tuiles dont 20 hors de la bbox calculée
- **WHEN** le validateur controle le pack
- **THEN** les 20 tuiles hors zone sont signalées comme inutiles

### Requirement: Menu Packs de carte

Le Studio SHALL offrir un menu « Packs de carte » qui gère le téléchargement des tuiles du pack. Toutes les options de configuration des tuiles SHALL être accessibles dans ce menu : provider, bbox (manuelle ou auto selon `tileStrategy`), `tileRadiusMeters`, minZoom/maxZoom, attribution, estimation du nombre de tuiles et de la taille, progression et état de génération. Aucune option tuiles ne SHALL exiger l'édition JSON manuelle.

#### Scenario: Configuration complète depuis le menu
- **WHEN** l'auteur ouvre le menu « Packs de carte » et règle provider, bbox, zooms et stratégie
- **THEN** `global.map` est mis à jour via opérations MCP annulables, sans JSON manuel, et l'estimation tuiles/taille s'affiche

#### Scenario: Génération depuis le menu
- **GIVEN** une configuration valide dans le menu
- **WHEN** l'auteur lance la génération
- **THEN** le pack de tuiles est généré avec progression % et état explicite (succès / fichier fautif)

### Requirement: Packs en cache serveur avec les jeux JSON

Les packs de tuiles générés SHALL être mis en cache côté serveur et proposés au téléchargement avec les jeux JSON : l'export/téléchargement d'un jeu SHALL inclure le `game.json` et les tuiles de son pack actif, chaque fichier vérifié au manifest SHA-256. Un pack vérifié SHALL rejouer sans réseau.

#### Scenario: Téléchargement jeu + tuiles
- **GIVEN** un jeu avec un pack actif vérifié côté serveur
- **WHEN** l'auteur ou le joueur télécharge le jeu
- **THEN** le `game.json` et les tuiles du pack actif sont disponibles ensemble, vérifiés fichier par fichier

### Requirement: Multi-cache par projet avec suppression et pack actif

Plusieurs caches de tuiles SHALL pouvoir exister par projet. Le menu SHALL lister les packs (nom, config, taille, date, statut), permettre de les supprimer (confirmation exigée), et de désigner l'unique pack actif (`global.map.tilePackId`) utilisé dans les packs du jeu. Supprimer le pack actif SHALL retirer la désignation sans casser le JSON (le Fond `pack-tiles` replie sur fond uni). Désigner un pack actif SHALL être annulable par undo.

#### Scenario: Suppression d'un pack
- **GIVEN** un projet avec 2 packs dont un actif
- **WHEN** l'auteur supprime le pack non actif puis confirme
- **THEN** le pack disparaît du cache serveur, le jeu et le pack actif sont inchangés

#### Scenario: Suppression du pack actif
- **GIVEN** un projet dont le pack actif est supprimé après confirmation
- **WHEN** la suppression est appliquée
- **THEN** `tilePackId` est retiré, le JSON reste valide et la carte replie sur fond uni

#### Scenario: Désignation du pack actif
- **GIVEN** un projet avec 2 packs et aucun actif désigné
- **WHEN** l'auteur désigne le second comme actif
- **THEN** `global.map.tilePackId` porte son id (undo possible) et le prochain export embarque ses tuiles

### Requirement: Accès via le Fond tuiles du pack

La configuration de l'accès aux tuiles téléchargées SHALL se faire depuis le menu du widget map via le dropdown existant de l'option Fond (`"tuiles du pack"` / `background: "pack-tiles"`). Choisir ce fond SHALL lier l'écran au pack actif du projet, sans nouvelle valeur de fond ni URL réseau. Sans pack actif ou sans tuiles, le widget SHALL rendre le fond uni avec marqueurs et position, exactement comme la carte standalone.

#### Scenario: Fond pack actif rendu
- **GIVEN** un écran avec un widget map en Fond `"tuiles du pack"` et un pack actif disponible
- **WHEN** le joueur ouvre l'écran offline
- **THEN** les tuiles du pack actif s'affichent avec marqueurs, cercles et position depuis les fichiers locaux

#### Scenario: Fond pack sans actif, repli uni
- **GIVEN** le même écran mais aucun pack actif (supprimé ou jamais généré)
- **WHEN** le joueur ouvre l'écran
- **THEN** le fond est uni, marqueurs et position restent lisibles, sans erreur ni requête réseau
