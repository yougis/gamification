## MODIFIED Requirements

### Requirement: Prévisualisation traçée

L'écran Prévisualiser SHALL offrir un mode pas-à-pas et un panneau de triche (bypass, `forceDraw`, `sessionId`, `forceHoldLock`/`forceHoldExit`). Tout event simulé SHALL porter badge "SIMULÉ" + HOLD courant. Rappel permanent : jamais d'ecriture JSON source. Le terminal SHALL afficher l'etape ouverte en mode vue (sans modale imposee), viewports partages avec Screen, retour HOME systematique sur Valider/Abandon, sortie sans perte.

#### Scenario: Terminal en tablette paysage partagée
- **GIVEN** Screen affichant un écran en tablette paysage (1024×768)
- **WHEN** l'auteur lance « ▶ Mode Jeux » sur le noeud ouvert en mode jouable
- **THEN** le terminal affiche le même écran en 1024×768 plein-cadre sans ascenseur, avec le sélecteur 4 formats, et la simulation progresse comme en portrait

#### Scenario: Choix viewport suivi entre Screen et terminal
- **GIVEN** un auteur ayant choisi téléphone paysage dans le terminal
- **WHEN** il quitte (Échap) puis revient dans Screen
- **THEN** Screen affiche toujours téléphone paysage (état partagé), et le JSON du jeu est inchangé

#### Scenario: Event simulé distinct d'un event réel
- **GIVEN** une session de prévisualisation avec bypass capteurs actif
- **WHEN** l'auteur consulte les logs affichés
- **THEN** chaque event simulé porte le badge "SIMULÉ" et aucun ne peut être confondu avec un event réel

#### Scenario: Écran du Nœud ACTIVE en plein écran
- **GIVEN** une session avec le Nœud `baker` (Module QUIZ) ouvert en mode jouable et le mode « Jeux » ouvert
- **WHEN** le terminal simulé s'affiche
- **THEN** l'écran `quiz-focus` de `baker` est rendu en lecture seule d'edition avec le quiz interactif, sans contrôles d'édition

#### Scenario: Validation jouée fait progresser la simulation
- **GIVEN** le quiz de `baker` affiché dans le terminal simulé
- **WHEN** l'auteur répond et valide
- **THEN** `baker` passe COMPLETED, ses effets sont appliqués et un event SIMULÉ est journalisé, comme via « Terminer », puis retour HOME simule

#### Scenario: Terminer avance au suivant
- **GIVEN** le mode « Jeux » ouvert avec `baker` ouvert puis terminé, un Nœud suivant éligible existant
- **WHEN** la complétion est enregistrée
- **THEN** le terminal revient HOME avec le suivant propose, sans ouverture auto

#### Scenario: Changement d'écran piloté par le moteur
- **GIVEN** le mode « Jeux » ouvert et deux Nœuds éligibles en suggestion
- **WHEN** un noeud est termine
- **THEN** HOME propose le suivant, jamais deux écrans à la fois

#### Scenario: Module sans renderer joueur non bloquant
- **GIVEN** un Nœud ouvert dont le Module ne déclare aucun renderer joueur
- **WHEN** le terminal simulé affiche ce Nœud
- **THEN** un état explicite propose terminer/abandonner par triche et la simulation continue

#### Scenario: Sortie du mode sans perte
- **GIVEN** le mode « Jeux » ouvert en cours de session simulée
- **WHEN** l'auteur appuie sur Échap ou le bouton de sortie
- **THEN** la vue auteur est restaurée avec file, tirages et journal inchangés
