## ADDED Requirements

### Requirement: Rail d'actions de la liste

Le rail de la liste repliée SHALL exposer, outre l'icône du panneau (déplier tel quel), les 4 icônes de création (Étape, Lieu, Tirage, Fin) avec leurs tooltips. Cliquer une icône de création SHALL créer le nœud correspondant **sans déplier** la liste (via l'action de création existante). Les champs texte (recherche, filtre) SHALL rester panneau-ouvert uniquement et n'ont aucun équivalent dans le rail.

#### Scenario: Création sans déplier
- **GIVEN** la liste repliée en rail
- **WHEN** l'auteur clique l'icône Lieu
- **THEN** un nœud lieu est créé et sélectionné, la liste reste repliée

#### Scenario: Déplier tel quel
- **GIVEN** la liste repliée en rail
- **WHEN** l'auteur clique l'icône du panneau liste
- **THEN** la liste se déploie dans son état précédent (recherche, filtre et sélection inchangés)

### Requirement: Rail d'actions du détail

Le rail du détail replié SHALL exposer, outre l'icône du panneau, les 9 icônes de familles de l'Inspecteur (mêmes icônes et tooltips que les tabs) quand un nœud est sélectionné. Cliquer une icône de famille SHALL déplier le détail **et** activer cette famille. Sans nœud sélectionné (placeholder, WYSIWYG), le rail SHALL se replier sur la seule icône du panneau.

#### Scenario: Famille depuis le rail
- **GIVEN** le détail replié avec un nœud sélectionné
- **WHEN** l'auteur clique l'icône « Effets » du rail
- **THEN** le détail se déploie avec la famille Effets active

#### Scenario: Repli sans sélection
- **GIVEN** le détail replié sans nœud sélectionné
- **WHEN** l'auteur regarde le rail
- **THEN** seule l'icône du panneau est affichée, avec le tooltip de dépliage

### Requirement: Rail d'actions du graphe

Le rail du graphe replié SHALL exposer, outre l'icône du panneau (déplier tel quel), les 3 icônes de vues (Graphe, Carte, Screen) et la pastille validation. Cliquer une icône de vue SHALL déplier le graphe **et** commuter vers cette vue. Cliquer la pastille SHALL naviguer vers l'écran Valider sans déplier (comme en panneau ouvert).

#### Scenario: Vue depuis le rail
- **GIVEN** le graphe replié en vue graphe
- **WHEN** l'auteur clique l'icône Carte du rail
- **THEN** le graphe se déploie directement en vue carte

#### Scenario: Pastille depuis le rail
- **GIVEN** le graphe replié avec 2 erreurs
- **WHEN** l'auteur clique la pastille du rail
- **THEN** l'écran Valider s'ouvre, le graphe reste replié

### Requirement: Toolbar graphe conditionnelle à la vue

Les boutons Recentrer / Aligner H / Aligner V de la toolbar flottante du graphe SHALL n'être rendus que si la vue centrale vaut `graphe` (canvas ReactFlow). Dans les vues carte et screen, seuls la pastille validation et le chevron de repli SHALL rester visibles. La règle d'activation Aligner (désactivé si moins de 2 nœuds sélectionnés, tooltip explicatif) SHALL être inchangée.

#### Scenario: Aligner masqué en vue carte
- **GIVEN** le panneau graphe ouvert en vue carte
- **WHEN** l'auteur regarde la toolbar flottante
- **THEN** Recentrer et Aligner sont absents, pastille et chevron restent visibles

#### Scenario: Aligner présent en vue graphe
- **GIVEN** le panneau graphe ouvert en vue graphe avec 1 nœud sélectionné
- **WHEN** l'auteur regarde la toolbar flottante
- **THEN** Recentrer, Aligner H et Aligner V sont visibles, Aligner désactivés avec le tooltip de sélection
