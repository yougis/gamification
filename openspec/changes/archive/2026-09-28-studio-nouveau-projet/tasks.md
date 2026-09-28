## 1. Jeu vierge valide et bouton Nouveau projet

- [x] 1.1 Corriger le `start` de `jeuVide()` (`activation` TIMER GAME_START 0, `isEnding: false` explicite), et vérifier : jeu vierge sans erreur sur `nodes/0/activation/requires` ni `isEnding` (seule FIN manquante), C2 inchangée sur les jeux sains
- [x] 1.2 Ajouter le bouton « Nouveau projet » (`btn-danger`, `confirm`, désactivé en lecture seule) à côté du nom du projet dans la barre globale en réutilisant `effacerBrouillon`, ajouter le `start` automatique à l'import sans nœud, et vérifier : confirmer réinitialise (undo restaure), refuser ne change rien, import vide charge avec `start`
