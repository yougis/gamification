## ADDED Requirements

### Requirement: Écran Importer scrollable

L'écran Importer SHALL rester entièrement accessible sur tout écran : son contenu SHALL défiler verticalement pour que chaque voie (QR, URL, catalogue distant, fichier local, catalogue local) soit atteignable quelle que soit la hauteur disponible. Aucune action SHALL être tronquée hors d'atteinte.

#### Scenario: Petit écran complet
- **GIVEN** l'écran Importer sur un téléphone basse résolution
- **WHEN** l'auteur fait défiler vers le bas
- **THEN** les cartes catalogue, fichier et catalogue local deviennent visibles et activables

### Requirement: Ouverture du pack importé

Après un import réussi (URL, fichier, QR, catalogue distant), le player SHALL ouvrir le pack qui vient d'être installé, jamais un autre : l'identifiant du pack installé SHALL être transmis à l'écran de jeu via la navigation. La résolution `firstOrNull()` SHALL ne servir que de défaut au démarrage à froid (aucun argument).

#### Scenario: URL GitHub ouvre le bon jeu
- **GIVEN** un import URL réussi installant `packs/monjeu_<ts>`
- **WHEN** la partie démarre
- **THEN** le titre affiche `monjeu` et ses étapes, pas un pack plus ancien ni le `reference-5poi` embarqué

#### Scenario: Démarrage à froid inchangé
- **GIVEN** un lancement de l'app sans navigation d'import
- **WHEN** l'écran de jeu charge
- **THEN** le pack le plus récent s'ouvre, ou le `reference-5poi` embarqué si aucun pack installé

### Requirement: Catalogue local des jeux installés

L'écran Importer SHALL lister les jeux installés sur le téléphone : pour chaque pack, `gameId`, version du schéma, date d'installation et état vérifié. La liste SHALL être triée du plus récent au plus ancien. Choisir un jeu SHALL l'ouvrir directement après re-vérification SHA-256 de ses fichiers ; un pack corrompu SHALL être signalé avec le fichier fautif et ne SHALL pas être lancé.

#### Scenario: Rejouer sans réimporter
- **GIVEN** deux jeux installés à des dates différentes
- **WHEN** l'auteur ouvre l'écran Importer
- **THEN** les deux jeux sont listés, le plus récent en premier, et toucher l'ancien l'ouvre sans réseau

#### Scenario: Pack local corrompu refusé
- **GIVEN** un pack installé dont un asset a été altéré après installation
- **WHEN** l'auteur tente de l'ouvrir depuis le catalogue local
- **THEN** l'ouverture est refusée avec le fichier fautif nommé, comme à l'import
