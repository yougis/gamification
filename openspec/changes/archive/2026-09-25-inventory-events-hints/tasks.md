## 1. Moteur et journal

- [x] 1.1 Émettre et journaliser les 6 types d'événements d'inventaire en SQLite (écriture immédiate, reprise `sessionId`), et vérifier relecture après kill sans perte
- [x] 1.2 Rejeter tout type hors vocabulaire en C1 et toute référence d'objet inconnue en C2, et vérifier messages avec fautif nommé

## 2. Écoute et affichage

- [x] 2.1 Déclarer `inventoryHints` (définition partagée référencée par les sous-schémas) et afficher l'indice correspondant dans le renderer quand le Nœud est ACTIVE, et vérifier aucun état/score/effet modifié
- [x] 2.2 Couvrir QUIZ + un second module (PUZZLE) de bout en bout, et vérifier abonnement précis (`itemId`) et large (sans `itemId`)

## 3. Non-régression

- [x] 3.1 Rejouer une partie Sherlock complète et vérifier journal enrichi, 0 régression C1+C2, compat NATIVE/PWA inchangée
