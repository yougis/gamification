## 1. Registre joueur et état non bloquant

- [x] 1.1 Ajouter `getPlayer(type)` dans `module-screen-plugin.ts` branchant `QuizPlayerRenderer` et `PuzzlePlayerRenderer`, et vérifier qu'un type inconnu retourne null sans lever, vérifié par un test unitaire ou un script tsx
- [x] 1.2 Créer le composant d'état non bloquant (type du Module + boutons terminer/abandonner par triche) et vérifier son affichage pour un Module sans renderer, vérifié visuellement dans le Studio

## 2. Vue terminal plein écran

- [x] 2.1 Créer le composant terminal (chrome mobile, viewport téléphone, `PhoneCanvas` en lecture seule avec `showGhosts={false}` et sans handlers d'édition) et vérifier qu'aucun clic ne modifie le JSON, vérifié par un écran habillé affiché sans contrôles d'édition
- [x] 2.2 Ajouter l'entrée vers le mode « Jeux » depuis Prévisualiser et la sortie (Échap + bouton) avec conservation de l'état de simulation, vérifié par un aller-retour sans perte de file/tirages/journal
- [x] 2.3 Afficher le rappel SIMULÉ permanent et le badge HOLD dans le chrome du terminal, vérifié visuellement dans les deux thèmes du Studio

## 3. Câblage moteur de simulation

- [x] 3.1 Résoudre et afficher l'écran du Nœud ACTIVE via `resolveScreen` à chaque changement (avec repli écran par défaut), et vérifier le suivi sur une avance FIFO à deux Nœuds, vérifié par le changement d'écran observé
- [x] 3.2 Brancher `onComplete` des renderers joueurs sur le chemin « Terminer » (COMPLETED + effets + event SIMULÉ journalisé), et vérifier sur le quiz de `baker` dans Sherlock, vérifié par le journal et l'état du Nœud
- [x] 3.3 Garantir une seule modale affichée (file FIFO inchangée, pas de second écran) y compris avec deux éligibilités simultanées, vérifié par une simulation à deux géofences vraies

## 4. Vérification d'ensemble

- [x] 4.1 Rejouer une partie Sherlock complète dans le mode (start → tirage → branche → fin) et constater écrans, validation jouée et `isEnding` atteint, vérifié par la session observée de bout en bout
- [x] 4.2 Faire tourner les smokes Studio concernées et constater 0 échec, vérifié par la sortie des commandes
