## Why

En jeu, la boîte à outils n'est visible que quand la présentation l'impose : le joueur ne peut pas consulter son inventaire « à tout moment », alors que les jeux escape/chasse le lisent en permanence (vérifier une clé, relire un indice). Il faut un accès omniprésent, coupable par écran quand l'auteur veut isoler une épreuve.

## What Changes

- Le Player affiche une petite icône d'inventaire persistante dès que le jeu définit des objets ET que `presentation` inclut `TOOLBOX` ; l'icône ouvre la boîte à outils par-dessus l'écran courant (retour = reprise exacte, engine et file FIFO inchangés).
- Chaque Nœud MAY définir `inventoryAccess` (booléen, défaut `true`) : `false` masque l'icône sur cet écran (ex. épreuve sans aide). Lu depuis le JSON, jamais codé en dur.
- Jeux sans objet ou sans `TOOLBOX` : aucun changement (pas d'icône).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-schema` : Nœud — champ optionnel `inventoryAccess`.
- `viewer-orchestrator` : règle d'affichage de l'icône d'inventaire persistante.

## Impact

- Runtime natif + PWA (même moteur, même règle) : overlay toolbox, lecture du flag par nœud.
- Schéma graphe : un champ optionnel sur Nœud — rétrocompatible (absent = `true`).
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Aucune connexion réseau (overlay local, état SQLite existant).
- Aucune dépendance à un change précédent non archivé (lisible seul ; combiné au change 1 pour le CRUD auteur).
