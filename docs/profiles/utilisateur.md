# Profil Utilisateur

Ce document decrit comment un utilisateur interagit avec un jeu
GeoPlay. Le langage est simple et oriente experience joueur.

## Comment jouer

1. **Importer un pack** : scanner le QR code ou importer le fichier
   depuis le Player. Le pack est verifie fichier par fichier
   (manifest SHA-256) avant demarrage.
2. **Lancer une session** : selectionner un jeu et une session.
   Le jeu charge ses donnees offline (fichiers app + SQLite).
3. **Naviguer** : deplacer le personnage sur la carte vers les POI
   eligibles. Le joueur approche physiquement des zones geofencees
   pour activer les mini-jeux.
4. **Interagir** : chaque POI peut etre un quiz, un jeu de difference,
   un puzzle, ou un marqueur AR. Le joueur rejoint la session et
   complete les etapes.

## Modeles de navigation

Les jeux utilisent des modeles de navigation predefinis :

- **BASIC** : course d'orientation classique sur carte
- **GUIDED** : parcours guide avec recit narratif
- **TREASURE_HUNT** : chasse au tresor avec indices
- **ESCAPE_GAME** : escape game avec boite a outils et enigmes
- **OPEN_EXPLORATION** : exploration libre de plusieurs POI

Le joueur peut voir plusieurs presentations simultanees :
carte (MAP), indices (CLUE), boite a outils (TOOLBOX), etc.

## Cycle de progression

Chaque etape suit le cycle `LOCKED → UNLOCKED → ACTIVE → COMPLETED`.
Le joueur voit uniquement les etapes deja decouvertes.

## Offline-first

Toutes les fonctionnalites joueurs fonctionnent sans reseau apres
telechargement. La progression est sauvegardee localement et
reprise automatiquement apres interruption.

## Principes structurants appliques

- Les donnees du jeu (rayons GPS, seuils, urls) sont lues depuis
  le JSON du jeu, jamais codes en dur
- Le jeu fonctionne en offline-first apres telechargement
- Chaque extension de type de module est enregistree dans le registre
  sans modifier le schema du jeu
