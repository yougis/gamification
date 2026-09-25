## Why

Les mini-jeux sont aujourd'hui aveugles à ce que le joueur fait dans l'inventaire : impossible de dire « tu as sélectionné la loupe, voici un indice pour ce quiz » sans coder un couplage ad hoc par jeu. Le moteur journalise déjà des événements de session : il manque le vocabulaire d'inventaire et la règle d'écoute côté mini-jeux.

## What Changes

- Vocabulaire fermé et versionné d'événements d'inventaire, émis par le moteur et journalisés en SQLite comme les `SessionEvent` existants : `INVENTORY_OPENED`, `ITEM_SELECTED`, `ITEM_USED`, `ITEM_COMBINED`, `ITEM_GIVEN`, `ITEM_REMOVED` (chacun avec `itemId` quand pertinent). Registre fermé : un mini-jeu ne peut écouter que ces types.
- Tout mini-jeu MAY déclarer dans son `module.data` un tableau optionnel `inventoryHints: [{ event, itemId?, hint }]` : quand un événement correspondant survient pendant que le Nœud est ACTIVE, le renderer affiche `hint`. Plusieurs abonnements cumulables ; dernier événement gagne en cas de conflit d'affichage.
- Aucune logique impérative : l'événement ne déclenche ni transition d'état ni effet — seul un indice s'affiche. Les effets restent l'affaire de `effects`/`activation` existants.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-inventory` : vocabulaire et journalisation des événements d'inventaire.
- `minigame-modules` : mécanisme générique d'indices sur événements d'inventaire.

## Impact

- Moteur (natif + PWA, même code) : émission + journalisation ; renderers : affichage d'indice.
- Schéma graphe : `inventoryHints` optionnel sur les `data` de mini-jeux (déclaration partagée référencée par les sous-schémas, sans toucher la racine Noeuds/Liens).
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW ; aucun nouveau module (mécanisme transverse).
- Aucune connexion réseau (journal SQLite local).
- Indépendant des changes 1–3 (lisible et implémentable seul ; combiné à eux pour l'atelier complet).
