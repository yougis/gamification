## MODIFIED Requirements

### Requirement: Canvas graphe détaillé

Le canvas SHALL offrir : nœuds déplaçables de dimensions uniformes sur grille libre, zoom/pan standard, arêtes au rendu par défaut reliant le bas de la source vers le haut de la cible, sélection multiple, alignement/distribution basique, recherche de nœud par nom ou type.

Le canvas SHALL utiliser le rendu par défaut de ReactFlow sans surcharge de style par statut ou par type : pas de fonds, rails, ombres ni bordures custom sur les nœuds ; pas de couleurs, pointillés, marqueurs ni pilules sur les arêtes. Chaque arête SHALL porter son libellé de condition en texte simple (prop standard).

Le statut `draft` SHALL rester visible dans la liste des étapes, l'écran Relire et le blocage d'export — jamais sur le nœud du canvas lui-même.

La sélection (simple et multiple) SHALL être stable : sélectionner un nœud ne SHALL jamais déclencher de boucle de re-rendu (`Maximum update depth exceeded`). Un événement de sélection identique à la sélection courante SHALL ne produire aucun changement d'état observable.

Seul un déplacement réel SHALL modifier les positions persistées des nœuds. Une sélection sans déplacement SHALL laisser les positions strictement inchangées.

Le recadrage automatique SHALL intervenir uniquement au montage du canvas, à l'arrivée du premier nœud, ou sur action explicite `Recentrer`. Il SHALL ne jamais se déclencher en réponse à un zoom/pan manuel ni à une sélection.

Le canvas SHALL n'être présenté comme vide que si le jeu ne contient aucun nœud. Un canvas non monté (graphe replié, autre onglet actif) SHALL ne jamais être présenté comme un graphe vide.

La sélection SHALL être unique et partagée entre le canvas et la liste des étapes : l'ensemble des nœuds sélectionnés est identique des deux côtés à tout instant. Sélectionner dans la liste SHALL surligner le nœud du canvas ; sélectionner sur le canvas SHALL marquer l'élément de la liste.

Un clic simple sur un bloc du canvas ou une ligne de la liste SHALL remplacer la sélection par ce seul nœud. Un clic combiné à la touche Maj SHALL ajouter le nœud à la sélection courante (ou le retirer s'il y est déjà) sans toucher aux autres. Un clic sur le fond vide du canvas SHALL vider toute sélection.

Le Studio SHALL offrir une action « Tout sélectionner / Tout désélectionner » (barre du graphe et en-tête de la liste, même action) : elle SHALL sélectionner tous les nœuds du jeu, ou vider la sélection si tous sont déjà sélectionnés. Son libellé SHALL refléter l'état courant.

Le panneau détail SHALL suivre le nœud primaire (dernier nœud cliqué) ; une sélection multiple SHALL ne jamais ouvrir plusieurs panneaux.

#### Scenario: Boîtes aux dimensions uniformes
- **GIVEN** un jeu avec 5 nœuds aux identifiants de longueurs variées
- **WHEN** le canvas s'affiche
- **THEN** toutes les boîtes ont la même largeur et les libellés restent lisibles sans tronquer l'identifiant

#### Scenario: Liens verticaux bas vers haut
- **GIVEN** un nœud A placé au-dessus d'un nœud B avec une arête A→B
- **WHEN** le canvas s'affiche
- **THEN** le lien sort par le bas de A et entre par le haut de B avec le libellé de condition en texte simple

#### Scenario: Nœud draft reconnaissable sans valider
- **GIVEN** un jeu avec 1 nœud `draft` parmi 5 nœuds
- **WHEN** l'auteur regarde le canvas sans lancer aucune validation
- **THEN** aucune distinction visuelle n'apparaît sur le canvas et la liste des étapes indique le statut `draft` du nœud

#### Scenario: Sélection stable sans boucle
- **GIVEN** un jeu avec 3 nœuds affichés sur le canvas
- **WHEN** l'auteur clique sur un nœud
- **THEN** le nœud devient sélectionné, aucune erreur `Maximum update depth exceeded` n'est levée, et l'interaction suivante reste immédiate

#### Scenario: Sélection identique sans effet
- **GIVEN** un nœud déjà sélectionné sur le canvas
- **WHEN** le même état de sélection est ré-émis
- **THEN** aucun changement d'état observable ne se produit (pas de re-rendu en cascade)

#### Scenario: Seul le déplacement persiste
- **GIVEN** un jeu avec 2 nœuds positionnés
- **WHEN** l'auteur déplace un nœud puis le dépose
- **THEN** la nouvelle position est persistée
- **WHEN** l'auteur sélectionne un nœud sans le déplacer
- **THEN** les positions persistées restent strictement inchangées

#### Scenario: Zoom manuel non contrarié
- **GIVEN** un jeu avec des étapes cadrées sur le canvas
- **WHEN** l'auteur zoome manuellement
- **THEN** aucun recadrage automatique ne ramène la caméra et le niveau de zoom choisi est conservé

#### Scenario: Vide réel distingué du non monté
- **GIVEN** un jeu sans aucun nœud
- **WHEN** l'auteur ouvre le Composer
- **THEN** le canvas indique un graphe vide avec l'aide à la création
- **GIVEN** un jeu avec des nœuds mais le graphe replié ou un autre onglet actif
- **THEN** aucun message de graphe vide n'est présenté pour le canvas

#### Scenario: Clic simple remplace la sélection
- **GIVEN** un jeu avec 3 nœuds dont 2 sélectionnés (Maj+clic)
- **WHEN** l'auteur clique simplement sur le 3e nœud
- **THEN** seul le 3e nœud est sélectionné, dans le canvas comme dans la liste

#### Scenario: Maj+clic ajoute à la sélection
- **GIVEN** un jeu avec 3 nœuds dont 1 sélectionné
- **WHEN** l'auteur Maj+clique sur un 2e nœud
- **THEN** les 2 nœuds sont sélectionnés des deux côtés et le panneau détail suit le 2e nœud
- **WHEN** l'auteur Maj+clique à nouveau sur le 2e nœud
- **THEN** seul le 1er reste sélectionné

#### Scenario: Tout sélectionner puis tout désélectionner
- **GIVEN** un jeu avec 5 nœuds et aucune sélection
- **WHEN** l'auteur active « Tout sélectionner »
- **THEN** les 5 nœuds sont sélectionnés dans le canvas et la liste, et l'action affiche « Tout désélectionner »
- **WHEN** l'auteur active « Tout désélectionner »
- **THEN** plus aucun nœud n'est sélectionné des deux côtés

#### Scenario: Sélection liste reflétée sur le canvas
- **GIVEN** un jeu avec 3 nœuds et aucune sélection
- **WHEN** l'auteur clique sur le 2e élément de la liste des étapes
- **THEN** le 2e nœud est surligné sur le canvas et le panneau détail l'affiche
