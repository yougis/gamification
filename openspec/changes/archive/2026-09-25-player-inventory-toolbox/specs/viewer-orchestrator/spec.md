## ADDED Requirements

### Requirement: Icône d'inventaire persistante

Quand le jeu définit des objets (`objects[]` non vide) ET que `presentation` inclut `TOOLBOX`, le Player SHALL afficher une icône d'inventaire persistante sur tous les écrans, sauf sur les Nœuds avec `inventoryAccess: false`. L'ouverture SHALL afficher la boîte à outils en overlay ; la fermeture SHALL reprendre l'écran exact (état moteur, modale ACTIVE et file FIFO inchangés). Sans objet ou sans `TOOLBOX`, aucune icône SHALL apparaître.

#### Scenario: Accès à tout moment
- **GIVEN** un jeu avec objets et `presentation: ["MAP", "TOOLBOX"]`, joueur sur un Nœud sans `inventoryAccess`
- **WHEN** le joueur touche l'icône puis la referme
- **THEN** la boîte à outils s'est ouverte par-dessus et l'écran est restauré à l'identique, sans transition d'état

#### Scenario: Épreuve isolée
- **GIVEN** un Nœud avec `inventoryAccess: false` dans le même jeu
- **WHEN** le joueur atteint ce Nœud
- **THEN** aucune icône n'est affichée tant que le Nœud est ACTIVE

#### Scenario: Jeu sans inventaire inchangé
- **GIVEN** un jeu BASIC sans objet
- **WHEN** le joueur ouvre le jeu
- **THEN** aucune icône d'inventaire n'apparaît
