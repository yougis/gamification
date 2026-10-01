## 1. Unicité et seed

- [x] 1.1 Étendre la déduplication à tous les imports (identique → réutilise, même `gameId` → remplace en place) et vérifier qu'un double import ne crée qu'une entrée
- [x] 1.2 Corriger l'ensemencement (test par `gameId` lu + drapeau persisté) avec migration de nettoyage au premier démarrage, et vérifier zéro doublon après redémarrage et suppression respectée

## 2. Supprimer et recommencer

- [x] 2.1 Ajouter la suppression avec confirmation (dossier supprimé, historique conservé) et vérifier disparition + réimport retrouvant l'historique
- [x] 2.2 Ajouter « Recommencer » visible uniquement en mode animateur (nouvelle session vierge, historique gardé) et vérifier son absence hors triche

## 3. Validation croisée

- [x] 3.1 Lancer `assembleDebug`, tests et `openspec validate`, rejouer le parcours (import, réimport, suppression, reset, redémarrage) et vérifier la stabilité de la liste
