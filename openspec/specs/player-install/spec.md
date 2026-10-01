# player-install Specification

## Purpose

Définit l'application joueur Android générique : importer un pack Studio, le vérifier, le jouer offline, journaliser scores et progression.

## Requirements

### Requirement: Import de pack vérifié

Le Player SHALL importer un pack par QR, lien ou fichier, vérifier le manifest
SHA-256 par fichier au premier lancement et refuser tout pack partiel ou
corrompu avec état explicite (progression %, fichier fautif). Un pack vérifié
SHALL rejouer sans réseau.

#### Scenario: QR scanné en borne

- **GIVEN** un joueur scannant le QR du pack `reference-5poi` sans réseau ensuite
- **WHEN** l'import se termine
- **THEN** le pack est vérifié fichier par fichier puis le jeu démarre offline

#### Scenario: Pack corrompu refusé

- **GIVEN** un pack dont 1 asset sur 20 a un SHA-256 faux
- **WHEN** le joueur tente de lancer
- **THEN** seul ce fichier est re-téléchargé (si réseau) ou le lancement est
  refusé avec le fichier nommé (sans réseau)

### Requirement: Exécution graphe et modules

Le Player SHALL exécuter la sémantique des specs (`viewer-orchestrator`, états,
`latch`, pools persistés) et rendre les 5 modules socle avec leurs
fallbacks (2D, sans-capteur, dilatation tactile). Un type inconnu SHALL dégrader
le nœud avec message, jamais crasher le Jeu.

#### Scenario: Partie 5 POI de bout en bout

- **GIVEN** le pack `reference-5poi` importé
- **WHEN** le joueur joue le tirage puis la branche jusqu'à FIN
- **THEN** chaque état suit la machine `LOCKED→UNLOCKED→COMPLETED`

### Requirement: Progression et scores journalisés

Progression, `randomDraws[sessionId]` et events (avec flag triche) SHALL vivre
en SQLite, écriture immédiate. Reprendre = même `sessionId` ; nouvelle partie =
nouveau `sessionId`. Aucune transmission réseau au socle (resync différée 600).

#### Scenario: Reprise après kill

- **GIVEN** une partie avec tirage persisté puis app tuée
- **WHEN** le joueur rouvre la même partie
- **THEN** le tirage est relu, aucun re-tirage

### Requirement: Distribution Android progressive

Le Player SHALL s'installer en sideload (APK debug) au POC puis via Play
Interne, avec permissions justifiées dans le flux (localisation, Bluetooth,
caméra). Le `versionCode` SHALL suivre l'app, jamais le pack (les packs sont
versionnés par leur manifest).

Le Player SHALL également être distribuable sur iOS via TestFlight, avec un
build automatisé par GitHub Actions sur runner macOS. Le `versionCode` iOS
SHALL suivre le même schéma que Android.

#### Scenario: Installation borne associative

- **GIVEN** une tablette sans compte Google
- **WHEN** l'animateur installe l'APK et importe le pack par fichier
- **THEN** le jeu tourne sans compte ni réseau

#### Scenario: Build iOS via GitHub Actions

- **WHEN** un commit est poussé sur la branche principale
- **THEN** GitHub Actions build le module shared KMP pour iOS, compile l'app iOS, et produit un artefact TestFlight-ready

#### Scenario: Test sur iPhone 12

- **GIVEN** un iPhone 12 connecté en développement
- **WHEN** l'animateur installe l'app iOS via Xcode ou TestFlight
- **THEN** le jeu tourne avec la même logique que la version Android

### Requirement: Export compatible natif unique

Le même JSON de jeu SHALL s'exporter vers le player natif sans fork (même
schéma, même manifest, même validation AJV). Il n'existe plus qu'un seul canal de distribution, jamais une variante du
jeu. L'export SHALL afficher le verdict de compatibilité natif avant
génération (voir `player-compatibility`).

#### Scenario: Jeu exporte vers le natif

- **GIVEN** un jeu QUIZ/PUZZLE sans capteur exotique
- **WHEN** l'auteur exporte vers `NATIVE`
- **THEN** le pack contient le `game.json` et passe la validation AJV

### Requirement: Build iOS automatisé

Le Player iOS SHALL être buildé automatiquement via GitHub Actions sur un
runner macOS. Le workflow SHALL :
1. Compiler le module `shared` KMP pour `iosArm64`
2. Compiler l'app iOS via `xcodebuild`
3. Produire un artefact `.ipa` ou bundle TestFlight
4. Utiliser des secrets GitHub pour le code signing (certificat, profil)

Le workflow SHALL se déclencher sur :
- Push sur la branche `main`
- Tag de version (pour les releases)
- Pull request (pour les builds de vérification)

#### Scenario: Build automatique sur push
- **WHEN** un développeur push un commit sur `main`
- **THEN** GitHub Actions lance le build iOS et upload l'artefact

#### Scenario: Build de vérification sur PR
- **WHEN** une pull request est créée
- **THEN** GitHub Actions build iOS sans publier (vérification uniquement)

#### Scenario: Release via tag
- **WHEN** un tag `v*` est créé
- **THEN** GitHub Actions build iOS et upload sur TestFlight

### Requirement: Compatibilité schéma JSON

Le Player iOS SHALL consommer le même format de pack JSON que le Player
Android. Le schema Draft-07 `game-schema` SHALL être validé par les deux
applications. Aucune adaptation de format ne SHALL être nécessaire pour
iOS.

#### Scenario: Pack exporté jouable sur iOS
- **WHEN** un pack est exporté par le Studio
- **THEN** il est jouable sur Android ET iOS sans modification

#### Scenario: Validation JSON identique
- **WHEN** un pack est importé sur iOS
- **THEN** la validation Draft-07 produit le même résultat que sur Android

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

### Requirement: Unicité par gameId

Le catalogue local SHALL contenir au plus une entrée par `gameId`. Tout import (URL, fichier, QR, catalogue distant) SHALL : réutiliser l'entrée existante si le contenu est identique (même SHA du `game.json`, horodatage rafraîchi), remplacer l'entrée en place si le `gameId` existe avec un contenu différent, créer une entrée sinon. Aucun autre flux (démarrage, ouverture, essai) SHALL créer d'entrée.

#### Scenario: Réimport identique sans doublon
- **GIVEN** le jeu `chasse` installé depuis un JSON
- **WHEN** le même fichier est réimporté
- **THEN** une seule entrée `chasse` subsiste, avec date rafraîchie

#### Scenario: Nouvelle version remplace
- **GIVEN** le jeu `chasse` v1 installé
- **WHEN** un JSON `chasse` v2 (contenu différent) est importé
- **THEN** l'entrée `chasse` porte v2, aucun second dossier `chasse` n'existe

#### Scenario: Démarrage sans création
- **GIVEN** trois jeux installés, app tuée
- **WHEN** l'app redémarre puis l'auteur ouvre le catalogue
- **THEN** les trois mêmes entrées sont listées, aucune ajoutée

### Requirement: Ensemencement unique respectant la suppression

Le jeu de référence embarqué SHALL être ensemencé au plus une fois (drapeau persisté) et seulement si aucun pack de ce `gameId` n'est installé (test sur le `gameId` lu, jamais sur le nom de dossier). Si l'auteur supprime ce jeu, il SHALL ne jamais être re-créé.

#### Scenario: Pas de doublon au redémarrage
- **GIVEN** le `reference-5poi` installé, app tuée
- **WHEN** l'app redémarre
- **THEN** aucun nouveau dossier n'est créé

#### Scenario: Suppression respectée
- **GIVEN** le `reference-5poi` supprimé par l'auteur
- **WHEN** l'app redémarre
- **THEN** le jeu ne réapparaît pas

### Requirement: Suppression explicite d'un jeu

Chaque entrée SHALL proposer la suppression (confirmation explicite) : le dossier du pack est supprimé, l'historique SQLite des sessions est conservé (orphelin assumé, rejouable si le jeu est réimporté sous le même `gameId`).

#### Scenario: Suppression confirmée
- **GIVEN** le jeu `chasse` installé avec une session terminée
- **WHEN** l'auteur confirme la suppression
- **THEN** l'entrée disparaît, le dossier n'existe plus, et réimporter `chasse` retrouve l'historique

#### Scenario: Refus sans effet
- **GIVEN** la confirmation de suppression affichée
- **WHEN** l'auteur refuse
- **THEN** rien n'est supprimé ni modifié

### Requirement: Reset triche par nouvelle session

En mode animateur actif uniquement, chaque entrée SHALL proposer « Recommencer » : une session vierge est créée pour ce jeu (tirages et progression vierges), l'historique des sessions précédentes étant conservé. Hors mode animateur, l'action SHALL être absente (pas seulement désactivée).

#### Scenario: Recommencer en triche
- **GIVEN** le jeu `chasse` terminé, mode animateur actif
- **WHEN** l'auteur choisit « Recommencer »
- **THEN** une nouvelle session vierge démarre et l'ancienne reste consultable dans l'historique

#### Scenario: Invisible hors triche
- **GIVEN** le même jeu, mode animateur inactif
- **WHEN** l'auteur regarde l'entrée
- **THEN** aucune action « Recommencer » n'apparaît

### Requirement: Mise à jour depuis un pack complet

L'import d'un `.zip` (fichier local) ou d'un pack service pour un `gameId` déjà installé SHALL proposer la mise à jour différentielle plutôt qu'une seconde entrée : le catalogue local garde une seule entrée par `gameId` (règle `player-catalogue-stable` inchangée). Le contrôle de taille SHALL s'appliquer avant application (delta estimé, pas le pack entier).

#### Scenario: Zip de mise à jour
- **GIVEN** le jeu `chasse` v1 installé et un `.zip` `chasse` v2 importé par fichier
- **WHEN** l'auteur confirme la mise à jour après le contrôle de taille
- **THEN** seule la différence est appliquée, l'entrée reste unique, la progression est préservée
