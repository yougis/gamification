## MODIFIED Requirements

### Requirement: Repli en cascade des panneaux du Composer

Le Composer SHALL appliquer une règle de repli unique sur grand écran : ordre fixe en 3 colonnes — liste à gauche, panneau central (graphe/carte/screen) au centre, détail à droite. Seuls la liste et le détail sont repliables ; le panneau central n'est JAMAIS repliable (pas de chevron, pas de rail) et occupe tout l'espace restant en `flex-1`. Un panneau latéral replié SHALL laisser un rail fin à son emplacement (liste : rail à gauche ; détail : rail à droite) et le panneau central SHALL s'étendre ; quand liste et détail sont repliés, leurs rails restent à leur côté respectif (liste à gauche, détail à droite).

La commande de repli SHALL être un chevron ancré au bord du panneau, dont le sens indique la direction du mouvement (`<` sur le bord du panneau liste ouvert vers la gauche, `>` sur le bord droit du panneau détail ouvert). Aucun bouton texte « Replier » / « Déplier » / « Détail » ne SHALL exister dans le Composer.

Le rail replié SHALL afficher la seule icône du panneau avec un tooltip (« Liste des étapes — cliquer pour déplier »), selon la même logique icône + tooltip que la navigation des écrans et les tabs de l'Inspecteur. Aucun menu « molette » (engrenage) ne SHALL exister dans le Composer.

Les actions de réglage autrefois dans la molette SHALL être relocalisées : Recentrer/Aligner vers les contrôles natifs ReactFlow du canvas (Aligner reste désactivé si moins de 2 nœuds sélectionnés), réinitialisation des largeurs vers un double-clic sur le Splitter (découvrable via tooltip). L'état replié/déplié des panneaux latéraux SHALL persister en localStorage ; la clé historique `repliees.graphe` SHALL être ignorée (centre forcé déplié) puis nettoyée.

#### Scenario: Cascade liste puis détail

- **GIVEN** le Composer avec liste, centre et détail ouverts
- **WHEN** l'auteur replie la liste puis le détail
- **THEN** un rail `[L]` reste à gauche et un rail `[D]` reste à droite, et le panneau central occupe l'espace libéré sans jamais disparaître

#### Scenario: Chevron directionnel

- **GIVEN** le panneau liste ouvert
- **WHEN** l'auteur regarde son bord
- **THEN** un chevron `<` est visible (le contenu partira à gauche)
- **WHEN** l'auteur clique le chevron puis regarde le rail
- **THEN** le rail affiche l'icône du panneau avec le tooltip de dépliage

#### Scenario: Rail icon-only avec tooltip

- **GIVEN** la liste repliée en rail à gauche
- **WHEN** l'auteur survole le rail
- **THEN** un tooltip « Liste des étapes — cliquer pour déplier » s'affiche, sans aucun label texte permanent

#### Scenario: Persistance du repli

- **GIVEN** un Composer avec la liste repliée
- **WHEN** l'auteur recharge la page
- **THEN** la liste est toujours repliée, le centre et le détail inchangés ; un état persisté `repliees.graphe: true` est ignoré (centre visible)

#### Scenario: Centre non repliable

- **GIVEN** le Composer avec les 3 panneaux ouverts
- **WHEN** l'auteur cherche à replier le panneau central
- **THEN** aucune commande de repli n'existe sur le panneau central, qui reste visible en permanence

### Requirement: Rail d'actions de la liste

Le rail de la liste repliée SHALL rester à gauche et exposer, outre l'icône du panneau (déplier tel quel), les 4 icônes de création (Étape, Lieu, Tirage, Fin) avec leurs tooltips. Cliquer une icône de création SHALL créer le nœud correspondant **sans déplier** la liste (via l'action de création existante). Les champs texte (recherche, filtre) SHALL rester panneau-ouvert uniquement et n'ont aucun équivalent dans le rail.

#### Scenario: Création sans déplier

- **GIVEN** la liste repliée en rail à gauche
- **WHEN** l'auteur clique l'icône Lieu
- **THEN** un nœud lieu est créé et sélectionné, la liste reste repliée

#### Scenario: Déplier tel quel

- **GIVEN** la liste repliée en rail à gauche
- **WHEN** l'auteur clique l'icône du panneau liste
- **THEN** la liste se déploie dans son état précédent (recherche, filtre et sélection inchangés)

### Requirement: Toolbar graphe conditionnelle à la vue

Recentrer / Aligner H / Aligner V SHALL être intégrés aux contrôles natifs ReactFlow du canvas (`Controls` + `ControlButton`, bouton fit natif pour Recentrer). Aucune toolbar flottante custom ne SHALL exister sur le panneau central et aucun chevron de repli ne SHALL s'afficher en overlay du centre : le sélecteur de vues (Graphe, Carte, Screen) SHALL vivre dans la toolbar du panneau central. Dans les vues carte et screen, les contrôles natifs restent disponibles selon leur sens (Recentrer sans objet hors canvas). La règle d'activation Aligner (désactivé si moins de 2 nœuds sélectionnés, tooltip explicatif) SHALL être inchangée.

#### Scenario: Aligner masqué en vue carte

- **GIVEN** le panneau central ouvert en vue carte
- **WHEN** l'auteur regarde les contrôles natifs
- **THEN** Recentrer et Aligner sont absents, aucun chevron de repli n'est visible

#### Scenario: Aligner présent en vue graphe

- **GIVEN** le panneau central ouvert en vue graphe avec 1 nœud sélectionné
- **WHEN** l'auteur regarde les contrôles natifs
- **THEN** Recentrer, Aligner H et Aligner V sont visibles, Aligner désactivés avec le tooltip de sélection

#### Scenario: Sélecteur de vues dans le centre

- **GIVEN** le panneau central ouvert
- **WHEN** l'auteur regarde sa toolbar
- **THEN** les 3 vues (Graphe, Carte, Screen) sont commutables sans replier ni déplier aucun panneau

### Requirement: Pastille validation dans le Composer

Le Composer SHALL afficher une pastille compacte d'état de validation dans la barre globale de l'application (à côté du nom du jeu et des compteurs) : `✓ Valide` si aucune erreur, `⚠ N problèmes` sinon (N = nombre total d'erreurs C1 + C2). La pastille SHALL être cliquable vers l'écran Valider et SHALL porter un tooltip explicite (« Voir le détail dans Valider »).

La pastille ne SHALL jamais afficher le détail des erreurs (messages, nœuds fautifs, impasses) — ce détail vit exclusivement dans l'écran Valider. Il n'existe plus de pastille sur un rail central (le centre n'ayant plus de rail).

#### Scenario: Pastille verte sans erreur

- **GIVEN** un jeu valide affiché dans le Composer
- **WHEN** l'auteur regarde la barre globale
- **THEN** la pastille affiche `✓ Valide`

#### Scenario: Pastille cliquable avec erreurs

- **GIVEN** un jeu avec 2 erreurs C2 affiché dans le Composer
- **WHEN** l'auteur clique la pastille `⚠ 2 problèmes`
- **THEN** l'écran Valider s'ouvre avec les 2 erreurs groupées par catégorie

## REMOVED Requirements

### Requirement: Rail d'actions du graphe

**Reason**: Le panneau central (graphe/carte/screen) n'est plus repliable ; il n'a donc plus de rail replié. Les 3 icônes de vues migrent dans la toolbar du panneau central, la pastille rail disparaît (doublon de la barre globale).

**Migration**: Supprimer `repliees.graphe`, le composant `RailReplie` pour le graphe et ses actions ; commuter les vues depuis la toolbar centrale ; nettoyer `geoplay-layout-v1` (ignorer puis supprimer la clé `graphe`).
