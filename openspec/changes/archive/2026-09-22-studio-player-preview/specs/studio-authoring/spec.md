## MODIFIED Requirements

### Requirement: Prévisualisation traçée

L'écran Prévisualiser SHALL offrir un mode pas-à-pas (avance/retour nœud par nœud) et un panneau de triche regroupant bypass capteurs, `forceDraw` par branche, injection de `sessionId` et `forceHoldLock`/`forceHoldExit`.

Tout event simulé SHALL porter visuellement le flag triche (badge distinct, ex. "SIMULÉ") plus l'état HOLD courant : un event simulé ne SHALL jamais ressembler à un event réel dans les logs affichés.

Un bouton dédié SHALL relancer la fixture neutre 1/5→FIN en un clic avec résultat pass/fail immédiat.

Un rappel permanent SHALL indiquer que la prévisualisation n'écrit jamais dans le JSON source.

Le mode « Jeux » plein écran SHALL afficher le terminal joueur simulé : l'écran du Nœud ACTIVE, résolu global → Nœud et rendu en lecture seule (édition et sélection désactivées, zones fantômes masquées), avec le renderer joueur du Module quand le registre en déclare un, sinon un état non bloquant proposant la sortie par triche (terminer/abandonner). Valider dans le renderer joueur SHALL produire les mêmes transitions que le simulateur (Nœud COMPLETED, effets appliqués, event SIMULÉ journalisé). Le changement d'écran SHALL suivre le Nœud ACTIVE selon la file FIFO (1 modale max) ; la sortie du mode (Échap ou bouton) SHALL restaurer la vue auteur sans perdre l'état de simulation.

#### Scenario: Event simulé distinct d'un event réel

- **GIVEN** une session de prévisualisation avec bypass capteurs actif
- **WHEN** l'auteur consulte les logs affichés
- **THEN** chaque event simulé porte le badge "SIMULÉ" et aucun ne peut être confondu avec un event réel

#### Scenario: Écran du Nœud ACTIVE en plein écran

- **GIVEN** une session avec le Nœud `baker` (Module QUIZ) ACTIVE et le mode « Jeux » ouvert
- **WHEN** le terminal simulé s'affiche
- **THEN** l'écran `quiz-focus` de `baker` est rendu en lecture seule avec le quiz interactif, sans contrôles d'édition

#### Scenario: Validation jouée fait progresser la simulation

- **GIVEN** le quiz de `baker` affiché dans le terminal simulé
- **WHEN** l'auteur répond et valide
- **THEN** `baker` passe COMPLETED, ses effets sont appliqués et un event SIMULÉ est journalisé, comme via « Terminer »

#### Scenario: Changement d'écran piloté par le moteur

- **GIVEN** le mode « Jeux » ouvert et deux Nœuds éligibles en file FIFO
- **WHEN** le Nœud ACTIVE est terminé
- **THEN** le terminal affiche l'écran du Nœud ACTIVE suivant, jamais deux écrans à la fois

#### Scenario: Module sans renderer joueur non bloquant

- **GIVEN** un Nœud ACTIVE dont le Module ne déclare aucun renderer joueur
- **WHEN** le terminal simulé affiche ce Nœud
- **THEN** un état explicite propose terminer/abandonner par triche et la simulation continue

#### Scenario: Sortie du mode sans perte

- **GIVEN** le mode « Jeux » ouvert en cours de session simulée
- **WHEN** l'auteur appuie sur Échap ou le bouton de sortie
- **THEN** la vue auteur est restaurée avec file, tirages et journal inchangés
