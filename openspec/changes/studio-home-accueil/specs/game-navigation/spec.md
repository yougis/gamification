## MODIFIED Requirements

### Requirement: Présentation selon le modèle

Le moteur SHALL supporter différentes présentations pour le Player mobile selon le modèle de navigation.

Les modes de présentation SHALL inclure :
- `MAP` : carte numérique avec position et POIs
- `LIST` : liste des étapes
- `STORY` : récit narratif séquentiel
- `CLUE` : affichage d'indices
- `TOOLBOX` : boîte à outils / inventaire
- `TIMELINE` : frise chronologique de progression
- `HOME` : tableau de bord entre les étapes (temps écoulé, comptes à rebours par POI, états, proposition d'ouverture)

Un jeu peut combiner plusieurs présentations simultanément (ex. `MAP + TOOLBOX + CLUE` pour un escape game géolocalisé).

Quand `presentation` inclut `HOME`, le player SHALL exposer en permanence une entrée « Accueil » (tab/barre) affichant le tableau de bord, y compris quand une autre vue est active ; l'affichage par défaut (tableau si aucune modale ACTIVE) est inchangé. Aller vers ou quitter l'Accueil SHALL ne produire ni transition d'état ni event de progression. Les vues restent exclusives (pas de superposition).

#### Scenario: Présentation MAP pour BASIC
- **GIVEN** un jeu BASIC avec `presentation: ["MAP"]`
- **WHEN** le joueur ouvre l'application
- **THEN** la carte s'affiche avec les POIs éligibles

#### Scenario: Présentation CLUE + MAP pour TREASURE_HUNT
- **GIVEN** un jeu TREASURE_HUNT avec `presentation: ["CLUE", "MAP"]`
- **WHEN** le joueur résout un indice
- **THEN** l'indice suivant s'affiche et la carte révèle la nouvelle zone

#### Scenario: Présentation STORY pour GUIDED
- **GIVEN** un jeu GUIDED avec `presentation: ["STORY"]`
- **WHEN** le joueur complète une étape
- **THEN** l'étape suivante s'affiche dans le récit narratif

#### Scenario: Retour à l'Accueil depuis une autre vue
- **GIVEN** un jeu avec `presentation: ["HOME", "MAP"]`, joueur sur la carte avec une modale ACTIVE fermée
- **WHEN** le joueur touche l'onglet « Accueil »
- **THEN** le tableau de bord s'affiche (temps, POI, étape à ouvrir), sans transition d'état ni event
