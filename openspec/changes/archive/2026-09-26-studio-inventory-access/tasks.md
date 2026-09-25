## 1. Case d'accès inventaire

- [x] 1.1 Ajouter la case « Accès inventaire sur cet écran » dans la famille 8 de l'Inspecteur (via `upd`, op `modifierNoeud`), et vérifier cocher/décocher pose/retire `inventoryAccess` avec undo en un pas
- [x] 1.2 Afficher le rappel non bloquant sans objet ni `TOOLBOX`, et vérifier l'édition reste possible et Valider inchangé

## 2. Non-régression

- [x] 2.1 Ouvrir un jeu existant sans `inventoryAccess` et vérifier case cochée, JSON inchangé, C1+C2 à 0 erreur
