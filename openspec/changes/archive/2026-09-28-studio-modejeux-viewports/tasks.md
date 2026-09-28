## 1. Viewports du Mode Jeux sur état partagé

- [x] 1.1 Ajouter la prop `viewport` (+ sélecteur compact en barre de terminal + mesure plein-cadre paysage) à `PlayerTerminal`, branchée sur `screenViewport` partagé, et vérifier : les 4 formats rendent le Nœud ACTIVE plein-cadre, la simulation (transitions, triche, FIFO, Échap) est inchangée
- [x] 1.2 Propager `viewport` à la salle d'attente (`ApercuAccueil`, défaut `phone-portrait` pour les autres appelants), et vérifier : `tsc` sans nouvelle erreur, choix suivi entre Screen et terminal, JSON inchangé quel que soit le viewport
