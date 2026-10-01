## MODIFIED Requirements

### Requirement: Compose Multiplatform pour l'UI

L'UI du player SHALL utiliser Compose Multiplatform pour les écrans communs :
- Affichage du graphe de jeu (liste des nœuds, états)
- Affichage des modules (QUIZ, 7-erreurs, PUZZLE, etc.)
- Navigation entre les écrans
- Affichage de la carte (fond schématique partagé ; tuiles natives par-dessus quand les shells les fournissent)

Les apps Android ET iOS SHALL héberger cette UI partagée (fragments/coquilles + `ComposeView`, providers natifs à la frontière). Aucun écran joueur SHALL être implémenté en code plateforme pur quand son équivalent existe en `commonMain`. Les écrans natifs restants (caméra AR, boussole) restent en `expect/actual` pour l'instant.

#### Scenario: Affichage du graphe sur Android
- **WHEN** le joueur ouvre une partie sur Android
- **THEN** le graphe de nœuds est affiché avec les états LOCKED/UNLOCKED/COMPLETED

#### Scenario: Affichage du graphe sur iOS
- **WHEN** le joueur ouvre une partie sur iOS
- **THEN** le graphe de nœuds est affiché avec les états LOCKED/UNLOCKED/COMPLETED

#### Scenario: Pas d'écran plateforme pur en double
- **GIVEN** un écran joueur existant en `commonMain`
- **WHEN** une app native l'affiche
- **THEN** elle l'héberge via `ComposeView`, sans réimplémentation plateforme
