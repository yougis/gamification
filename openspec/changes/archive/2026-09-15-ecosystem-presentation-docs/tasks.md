## 1. Rédaction du Document de Présentation

- [x] 1.1 Créer le fichier `docs/ecosystem-presentation.md` avec introduction à l'écosystème GeoPlay (usine à jeux, philosophie offline-first, publics cibles)
- [x] 1.2 Rédiger la section "Ce que le créateur peut faire" : composer un jeu visuellement, choisir des modules, définir des conditions, configurer la carte et le branding
- [x] 1.3 Rédiger la section "Comment ça marche" : le graphe de jeu (nœuds et connexions), les conditions d'activation (GEOFENCE, TIMER, tirage au sort), les états du jeu (verrouillé → déverrouillé → actif → complété)
- [x] 1.4 Rédiger la section "Les modules disponibles" : QUIZ (question-réponse), Différence (7 erreurs), Puzzle, Réalité Augmentée, Boussole — expliquer chacun de manière simple
- [x] 1.5 Rédiger la section "Les modes de jeu" : mode normal, mode triche/test, mode HOLD kiosque — quand et pourquoi les utiliser
- [x] 1.6 Rédiger la section "Ce qui se passe en arrière-plan" : persistance des scores, vérification des fichiers, téléchargement du pack, fonctionnement offline
- [x] 1.7 Rédiger la section "Comment démarrer" : étapes pour créer son premier jeu, de l'installation du Studio à l'export du pack
- [x] 1.8 Ajouter des liens vers le glossaire (`docs/glossary.md`) pour chaque concept technique introduit

## 2. Relecture et Validation

- [x] 2.1 Relire le document pour vérifier la cohérence avec les specs OpenArchives et la documentation technique existante
- [x] 2.2 Vérifier que le langage est accessible à un débutant sans formation technique
- [x] 2.3 Valider que tous les scénarios concrets mentionnent le bon fonctionnement du système
- [x] 2.4 Mettre à jour `ROADMAP.md` pour ajouter la référence à ce nouveau document de présentation

## 3. Vérification Finale

- [x] 3.1 Exécuter `openspec status --change "ecosystem-presentation-docs"` pour vérifier que tous les artifacts sont complets
- [x] 3.2 Exécuter `openspec validate --changes` pour valider le change
- [x] 3.3 Vérifier que le fichier `docs/ecosystem-presentation.md` est présent et cohérent
