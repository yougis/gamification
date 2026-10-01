## ADDED Requirements

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
