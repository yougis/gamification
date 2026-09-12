---
name: geoplay-offline-pack
description: Conceit ou controle le pack offline d'un Jeu GeoPlay natif (manifest SHA-256, archive, diff, packs carte, SQLite). A utiliser pour le change 300 et toute question de telechargement, versioning ou stockage terrain.
---

# Skill : geoplay-offline-pack

Specialiste du packaging offline GeoPlay natif (iOS + Android, fichiers app + SQLite).

## Contrat du pack

- **Manifest** : `{path, version, size, sha256}` par fichier. Le manifest fait foi
  pour le versioning et l'integrite.
- **Transport** : archive pre-tuilee telechargee puis dezippee en worker.
- **Verification** : SHA-256 par fichier. Echec sur un fichier = retelechargement
  de ce seul fichier, jamais de tout le pack.
- **Diff** : ne retelecharge que les `version` changees. Reprise et background
  download obligatoires.
- **Lancement** : un pack partiel ou corrompu reste **non lancable**, avec etat
  explicite (progression, fichier fautif).

## Carte et donnees

- Fond imagerie configurable : `{provider, bbox, minZoom, maxZoom, attribution}`.
  La taille se chiffre depuis bbox/zooms **avant** telechargement, avec estimation
  affichee et barre de progression.
- Fallback : image statique si tuiles absentes ; trace GPX + fleche boussole
  restent utilisables sur fond uni.
- Stockage : progression joueur, `randomDraws[sessionId][poolNodeId]` et tirages
  en SQLite, persistance immediate, jamais recalcules.
- Difficultes/modes (variantes, pas de duplication de graphe) et assets suivent
  le meme manifest.

## Instructions

- Chiffre toujours taille, nombre de fichiers et politique de diff avant de
  proposer un pack.
- Refuse tout design `partiel = jouable` et toute verification globale seule
  (hash global sans hash par fichier).
- Rappelle les differes hors socle : sync P2P/serveur (change dedie), pas de
  protocole "ultrarapide" magique — parallele + delta + reprise.
