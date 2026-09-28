## MODIFIED Requirements

### Requirement: Téléchargement vérifié, différentiel, reprenable

Le moteur SHALL vérifier SHA-256 par fichier, ne re-télécharger que les
`version` changées, reprendre après coupure et supporter le background download.
Un pack partiel ou corrompu SHALL rester **non lançable** avec état explicite
(progression %, fichier fautif). La taille totale SHALL être chiffrée et
affichée **avant** téléchargement.

Les mêmes garanties SHALL s'appliquer à la génération côté auteur : le
téléchargement des octets de tuiles (bbox × zooms du pack) SHALL vérifier
chaque tuile au SHA-256, reprendre après coupure, et laisser le pack en état
explicite (`generation` avec progression %, `echec` avec fichier fautif nommé)
tant qu'une tuile manque ou est corrompue. Un pack en échec SHALL ne jamais
devenir le pack actif implicitement.

#### Scenario: Coupure puis reprise

- **GIVEN** un téléchargement interrompu à 60 %
- **WHEN** le joueur relance
- **THEN** seuls les fichiers manquants repartent, sans tout reprendre

#### Scenario: Partiel non lançable

- **GIVEN** un pack à 90 % vérifié
- **WHEN** le joueur tente de lancer
- **THEN** le lancement est refusé avec la progression et le fichier manquant

#### Scenario: Génération auteur interrompue

- **GIVEN** une génération de pack de tuiles coupée à 60 %
- **WHEN** l'auteur relance la génération
- **THEN** seules les tuiles manquantes repartent, le pack reste en état `generation` avec sa progression, et il ne devient pas actif

### Requirement: Carte configurable avec fallback

Le fond SHALL être configuré `{provider, bbox, minZoom, maxZoom, attribution, tileStrategy, tileRadiusMeters}` (MapLibre Native), la trace GPX et la boussole SHALL rester utilisables sur
fond uni, et une image statique SHALL servir de fallback si les tuiles manquent.
Stacks web exclues (Leaflet, WebXR), Mapbox par défaut exclu (licence offline).

`tileStrategy` SHALL valoir `fixed` (bbox statique, défaut), `viewport` (auto selon viewport), `radius` (bbox autour des POI avec `tileRadiusMeters`), ou `none` (pas de carte, jeux indoor/purement indoor).

Quand un pack de tuiles actif est désigné (`tilePackId`), l'export SHALL embarquer les octets des tuiles de ce pack (référencées au manifest fichier par fichier) ; sans pack actif, le comportement reste celui de la bbox calculée à l'export.

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

#### Scenario: Export embarquant le pack actif

- **GIVEN** un projet avec un pack actif `pret` de 42 tuiles vérifiées
- **WHEN** l'auteur exporte le jeu
- **THEN** les 42 tuiles sont embarquées avec leurs entrées manifest SHA-256, et le pack joueur rejoue offline

## ADDED Requirements

### Requirement: Téléchargement réel des tuiles à la génération

La génération d'un pack de tuiles SHALL télécharger les octets de chaque tuile couverte par (bbox × minZoom..maxZoom), dans le respect de la politique d'usage du provider : attribution affichée et embarquée, requêtes limitées en débit, périmètre strictement borné à la bbox calculée (jamais de pré-chargement massif hors zone). La progression SHALL être visible en % avec le fichier courant, et toute erreur SHALL nommer le fichier fautif.

#### Scenario: Génération complète vérifiée

- **GIVEN** un pack configuré (bbox + zooms, 42 tuiles estimées)
- **WHEN** l'auteur lance la génération avec réseau
- **THEN** les 42 octets sont téléchargés, vérifiés au SHA-256, et le pack passe en état `pret`

#### Scenario: Tuile en échec nommée

- **GIVEN** une génération dont la tuile `tuiles/14/8192/5463.png` échoue 3 fois
- **WHEN** le seuil est atteint
- **THEN** le pack passe en état `echec` avec ce fichier nommé, sans marquer les tuiles réussies comme perdues

### Requirement: Stockage serveur des octets de tuiles

Le serveur SHALL stocker les octets des tuiles de chaque pack généré à côté de ses métas, adressables par le pack et vérifiables au SHA-256 du manifest. La suppression d'un pack SHALL supprimer ses métas ET ses octets. Les octets SHALL être proposés au téléchargement avec le `game.json` (même pipeline d'export), pour que le pack joueur soit autonome.

#### Scenario: Suppression purgeant les octets

- **GIVEN** un pack `pret` avec 42 tuiles stockées côté serveur
- **WHEN** l'auteur le supprime après confirmation
- **THEN** métas et octets disparaissent, et un export ultérieur ne référence plus ces tuiles

#### Scenario: Pack joueur autonome

- **GIVEN** un jeu exporté avec son pack actif `pret`
- **WHEN** le joueur importe le pack puis coupe le réseau
- **THEN** la carte affiche les tuiles depuis les fichiers locaux, vérifiées au manifest
