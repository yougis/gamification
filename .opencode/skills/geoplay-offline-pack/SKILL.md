---
name: geoplay-offline-pack
description: Conceit ou controle le pack offline d'un Jeu GeoPlay natif (manifest SHA-256, license.json, i18n, tiles.json, zip, diff, quotas). A utiliser pour tout change pack 9xx et toute question de telechargement, versioning ou stockage terrain.
---

# Skill : geoplay-offline-pack

Specialiste du packaging offline GeoPlay natif (iOS + Android, fichiers app + SQLite).

## Contrat du pack

- **Manifest** : `{path, version, size, sha256}` par fichier (size = octets UTF-8, jamais String.length). Le manifest fait foi
  pour le versioning et l'integrite. Couvre game.json, i18n/*.json, assets, tuiles, tiles.json, license.json.
- **Contenu** : game.json + manifest + `tiles.json` (univers z/x/y, strategie, bbox/zooms ; liste vide si pas de tuile, coherence manifest<->index exigee) + `license.json` EdDSA le cas echeant + `.zip` unique transférable (streaming, taille affichee avant generation).
- **Transport** : archive pre-tuilee telechargee puis dezippee en worker.
- **Verification** : SHA-256 par fichier. Echec sur un fichier = retelechargement
  de ce seul fichier, jamais de tout le pack. Mise a jour differentielle par manifests (nouveaux/modifies copies, absents supprimes, identiques conserves, bascule atomique, progression SQLite preservee).
- **Diff** : ne retelecharge que les `version` changees. Reprise et background
  download obligatoires. Generation auteur interrompue = etat explicite, jamais pack actif implicite.
- **Lancement** : un pack partiel ou corrompu reste **non lancable**, avec etat
  explicite (progression %, fichier fautif). Catalogue d'erreurs E_* avec action proposee.

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
