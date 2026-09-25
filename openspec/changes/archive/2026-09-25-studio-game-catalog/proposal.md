## Why

La diffusion des jeux repose aujourd'hui sur des transferts manuels de fichiers (Drive, mail, câble) : aucune adresse stable par jeu, aucune notion de version côté joueur, et chaque tablette/téléphone doit recevoir ses fichiers un par un. Pour les flottes et le partage à distance, il faut un point de distribution unique où le Studio publie et où les players récupèrent.

## What Changes

- **Service catalogue hébergé** : le Studio publie un pack (même `game.json` + manifest `{path, version, size, sha256}` que l'export fichier) vers un service ; chaque jeu est versionné **par nom de jeu** (`gameId`), chaque publication créant une nouvelle version qui remplace la précédente comme « courante ».
- **Code d'accès à 4 chiffres** : chaque jeu publié reçoit un code unique (`0000`–`9999`), attribué à la publication. Le code n'est **pas** une sécurité : c'est un simple identifiant d'accès au bon jeu (pas d'authentification, pas de chiffrement lié au code, pas de rate-limiting au-delà de l'anti-abus de base).
- **Récupération côté player** : le joueur saisit le code à 4 chiffres (ou scanne un QR/lien qui l'encode) ; le player télécharge le pack courant du jeu, vérifie le manifest SHA-256 fichier par fichier comme aujourd'hui, puis joue offline. Un pack déjà vérifié ne se re-télécharge pas.
- **Intégrité inchangée** : le serveur est un transport non fiable — un pack altéré est refusé par le player exactement comme un fichier local corrompu.
- **Écran Importer réorienté** : le panneau d'historique local des imports est retiré de l'écran Importer, remplacé par l'import depuis le catalogue (liste des jeux publiés, recherche et filtrage) ; l'import fichier local reste accessible comme voie secondaire.

## Capabilities

### New Capabilities

- `game-catalog`: publication/versionnement des jeux par nom, codes d'accès à 4 chiffres, récupération et vérification côté player.

### Modified Capabilities

Aucune (aucun requirement existant ne change : le format du pack, la validation bi-couche et l'exécution offline restent identiques).

## Impact

- **Code** : nouveau service catalogue (publication, stockage des packs, résolution code → pack, liste des jeux) ; Studio (action « Publier », affichage du code, écran Importer retravaillé en browser catalogue) ; player natif + PWA (écran de saisie du code, téléchargement, réutilisation de la vérification manifest existante).
- **Schéma graphe** : aucune modification — le pack publié est byte-identique à l'export fichier ; aucun consommateur impacté (Studio MCP, runtime natif, orchestrateur, modules, packaging offline).
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre.
- **Réseau** : uniquement au moment de la publication (Studio → service) et du téléchargement (player → service) ; **jamais pendant le jeu**, qui reste offline-first.
- **Dépendance** : s'appuie sur `exportPackFull` (voie unique d'export) et la vérification manifest existante sans les rouvrir ; présuppose un hébergement du service (à trancher à l'implémentation : opéré par l'association ou tiers).
