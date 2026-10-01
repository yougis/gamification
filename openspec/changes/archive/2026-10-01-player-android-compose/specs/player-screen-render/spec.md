## ADDED Requirements

### Requirement: Rendu natif Android via le renderer partagé

L'app Android SHALL rendre chaque nœud ouvert avec le renderer partagé (`ScreenRenderer` : zones header/content/footer/overlay, widgets, branding résolu, module du nœud), le tableau HOME (`HomeDashboard`) et la carte (`MapWidget` : marqueurs par état, volet, position). Le rendu SHALL être visuellement équivalent à iOS pour le même jeu et le même état (mêmes zones, mêmes widgets, mêmes états).

#### Scenario: Écran quiz-focus sur Android
- **WHEN** le joueur ouvre un nœud `UNLOCKED` avec header, content (texte + module QUIZ) et footer
- **THEN** les trois zones s'affichent avec le quiz interactif, comme sur iOS et dans le simulateur

#### Scenario: Carte avec POI sur Android
- **GIVEN** un jeu avec 3 POI découverts et une position GPS
- **WHEN** le joueur ouvre la carte
- **THEN** fond schématique, 3 marqueurs à leurs états et position s'affichent, la sélection ouvre le volet sans event
