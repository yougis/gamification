## Why

Le champ `inventoryAccess` existe au schéma et au moteur (change `player-inventory-toolbox`) : `false` masque l'icône d'inventaire sur un écran d'épreuve. Mais le Studio ne l'expose nulle part — l'auteur ne peut ni le voir ni le modifier sans éditer le JSON à la main, ce qui contredit la garantie « aucun champ d'UI sans équivalent JSON éditable sans JSON ».

## What Changes

- La famille 8 « Inventaire » de l'Inspecteur de nœud expose une case à cocher « Accès inventaire sur cet écran » (cochée par défaut = `inventoryAccess` absent/`true`, hérite de la règle triple) ; décocher pose `inventoryAccess: false` via l'opération nommée existante (`modifierNoeud`, un pas d'undo).
- Quand le jeu n'a ni objet ni `TOOLBOX` en présentation, la case affiche un rappel non bloquant (« sans effet : jeu sans inventaire ») sans empêcher l'édition.
- Aucun autre écran touché ; aucun nouveau champ schéma (le champ existe déjà).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : Inspecteur famille Inventaire — case d'accès inventaire par nœud.

## Impact

- Studio uniquement : `Inspecteur` (famille `FAMILLES[7]`), même pattern que les autres cases du panneau.
- Schéma graphe inchangé (champ déjà déclaré par `player-inventory-toolbox`) ; validateur et runtime inchangés.
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Aucune connexion réseau.
- Dépend du change `player-inventory-toolbox` (champ + règle d'affichage) non encore archivé.
