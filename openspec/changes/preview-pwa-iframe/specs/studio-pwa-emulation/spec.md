## Purpose

Permettre de jouer le vrai jeu courant dans l'écran Prévisualiser du Studio en embarquant la PWA dans une iframe, au lieu de dupliquer son rendu.

## ADDED Requirements

### Requirement: Iframe PWA dans Prévisualiser

L'écran Prévisualiser SHALL embarquer la PWA dans une iframe dimensionnée aux viewports Studio (téléphone/tablette, portrait/paysage, sélecteur existant). La cible PWA SHALL être configurable (URL déployée stable par défaut, build local en repli).

#### Scenario: Ouverture émulée
- **WHEN** l'auteur ouvre l'onglet d'émulation avec un jeu valide
- **THEN** la PWA s'affiche dans l'iframe aux dimensions du viewport courant, chargée sur le jeu courant

#### Scenario: Cible injoignable explicite
- **WHEN** la cible PWA ne répond pas
- **THEN** un état explicite propose de basculer de cible, jamais une iframe vide silencieuse

### Requirement: Endpoint emulate du jeu courant

Le Studio SHALL servir le jeu courant sur `/emulate/game.json`, `/emulate/manifest.json` (reconstruit via le code d'export), `/emulate/compat.json` et `/emulate/assets/*` (assets de session, mémoire uniquement). Un asset manquant SHALL refuser explicitement avec le fichier nommé.

#### Scenario: Manifest reconstruit
- **WHEN** l'émulation démarre avec 3 assets en session
- **THEN** `/emulate/manifest.json` liste les 3 fichiers avec SHA-256 valides et la PWA vérifie sans erreur

### Requirement: Sessions namespacées

Chaque émulation SHALL tourner dans un namespace de stockage dédié (sessions, progression, tirages) pour ne jamais lire ni écrire les parties réelles.

#### Scenario: Émulation sans pollution
- **WHEN** l'auteur joue une partie émulée puis ouvre la PWA réelle
- **THEN** la PWA réelle ne voit aucune trace de l'émulation

### Requirement: Sortie et viewport conservés

Quitter (Échap/bouton) SHALL fermer l'iframe sans toucher au jeu édité ni à la session d'essai. Le viewport SHALL être partagé avec le reste du Studio et rester local d'édition.

#### Scenario: Sortie propre
- **WHEN** l'auteur quitte l'émulation en cours de partie
- **THEN** le JSON du jeu est inchangé et l'état d'essai est conservé
