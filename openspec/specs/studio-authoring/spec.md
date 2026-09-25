# studio-authoring Specification

## Purpose

Définit ce que le Studio GeoPlay doit offrir aux créateurs : composer, relire, valider et exporter un Jeu conforme sans écrire de JSON à la main.

## Requirements

### Requirement: Canvas graphe avec export garanti

Le Studio SHALL offrir un canvas visuel (nœuds draggable, arêtes = `activation`,
icônes par type de condition) où chaque modification garantit un export JSON
conforme au schéma 100. Aucun état visuel SHALL exister sans équivalent JSON.
L'état SHALL être immutable avec undo/redo.

#### Scenario: Glisser-déposer POOL

- **GIVEN** un auteur glisse 1 `RANDOM_POOL` et 5 nœuds POI sur le canvas
- **WHEN** il relie le pool aux 5 candidats
- **THEN** le JSON contient `randomPool` + 5 conditions `POOL_DRAWN` valides en couche 1

### Requirement: Formulaires dynamiques et MCP validant

Les formulaires d'édition SHALL être générés depuis les sous-schémas du registre,
la logique graphe restant découplée des formulaires de mini-jeux. Le MCP SHALL
exposer `composeNodes`, `setActivation`, `registerAsset`, `validateGame`,
`buildManifest`, `exportPack`, tous validés AJV contre le même schéma que le
runtime. Aucune production non validée (couches 1+2) ne SHALL sortir du Studio.

#### Scenario: Export bloqué sur graphe cassé

- **GIVEN** un Jeu avec FIN en AND sur 2 candidats exclusifs d'un pool 1/5
- **WHEN** l'auteur lance l'export
- **THEN** l'export est refusé avec l'erreur applicative et le nœud fautif surligné

### Requirement: Configuration HOLD via MCP

Le Studio MCP SHALL exposer les operations suivantes pour le mode
kiosque :
- `setHoldMode(gameId, mode)` : configure `global.holdMode`
  (`"none"`, `"guidedAccess"`, `"screenPinning"`, `"lockTask"`)
- `setHoldExit(gameId, exitConfig)` : configure `global.holdExit`
  (`method`, `pin`, `adminPanel`)
- `getHoldConfig(gameId)` : retourne la configuration HOLD active

Toutes les operations sont validees AJV contre le meme schema que le
runtime. Aucune production non validee ne sort du Studio.

#### Scenario: Configurer HOLD via Studio

- **GIVEN** un Jeu en cours d'edition dans le Studio
- **WHEN** l'auteur appelle `setHoldMode(gameId, "guidedAccess")`
  puis `setHoldExit(gameId, {method: "adminPin", pin: "1234"})`
- **THEN** le JSON exporte contient `global.holdMode` et
  `global.holdExit` valides, l'export est refuse si incoherent

#### Scenario: Export bloque si holdMode sans holdExit

- **GIVEN** un Jeu avec `global.holdMode: "lockTask"` et pas de
  `global.holdExit`
- **WHEN** l'auteur lance l'export
- **THEN** l'export est refuse avec l'erreur holdExit manquant, le
  nœud fautif est identifié

### Requirement: Triche HOLD dans le preview Studio

Le preview Studio SHALL permettre de simuler le mode HOLD avec
`forceHoldExit` (simuler une sortie animateur) et `forceHoldLock`
(simuler un verrouillage kiosque). Chaque event simule porte le
flag triche et le flag `holdMode`. Le preview ne modifie pas le
JSON source.

#### Scenario: Preview HOLD pas-à-pas

- **GIVEN** un Jeu en mode HOLD, loaded en preview Studio
- **WHEN** l'auteur force `holdLock` puis `forceHoldExit`
- **THEN** les events portent le flag triche et le flag holdMode,
  la séquence est rejouable en un clic comme non-régression

### Requirement: Provenance et validation humaine

Chaque étape/asset SHALL porter `providerId`, licence, `sourceUrl`
et un statut `draft|reviewed|published` + `reviewedBy`. `draft` SHALL
être injouable sauf mode animateur-triche. La relecture SHALL montrer
l'overlay source + données module (ex. polygones 7-erreurs) avant
passage en `reviewed`. **En mode HOLD, le statut `reviewed` est
requis pour activer le kiosque ; un jeu en `draft` avec `holdMode !=
"none"` est refuse au runtime joueur (même en mode animateur),
car le verrouillage kiosque nécessite un jeu validé.**

#### Scenario: Draft refusé au joueur

- **GIVEN** un pack contenant 1 nœud `draft`
- **WHEN** le runtime joueur le charge hors mode animateur
- **THEN** le Jeu est refuse avec le nœud fautif nommé

#### Scenario: Draft HOLD refuse au joueur

- **GIVEN** un pack contenant 1 noeud `draft` avec `holdMode:
  "guidedAccess"`
- **WHEN** le runtime joueur le charge hors mode animateur
- **THEN** le Jeu est refuse avec le nœud fautif nommé et le flag
  holdMode est signalé

### Requirement: Overrides difficultés/modes et i18n verrouillée

Difficultés (`enfant|famille|expert`) et modes (`normal|animateur|soiree|
hardcore`, ex. `hintDisabled`, `timeLimit`, rayon réduit) SHALL être des
overrides, jamais une duplication du graphe. Les textes SHALL être des clés i18n
avec glossaire acronymes verrouillé (`auto|reviewed|locked`) : une retraduction
ne SHALL jamais écraser une correction `locked`. **Le mode HOLD est un
mode système ajouté à la liste des modes système (avec `triche/test` et
`preview Studio`). Il est configuré via `global` et non comme override de difficulté.**

#### Scenario: Retraduction sans écrasement

- **GIVEN** un acronyme corrigé `locked` en anglais
- **WHEN** le pack est régénéré en anglais
- **THEN** la correction est conservée et seul le reste est retraduit

#### Scenario: HOLD est un mode systeme a part entiere

- **GIVEN** un Jeu avec `global.holdMode: "screenPinning"`
- **WHEN** le Studio affiche les modes systeme
- **THEN** HOLD est listé comme mode système kiosque, distinct des
  modes de jeu `normal|animateur|soiree|hardcore`

### Requirement: Preview scriptée traçée

Le Studio SHALL offrir un simulateur pas-à-pas (bypass capteurs, `forceDraw` par
branche, injection `sessionId`) avec flag triche sur tout event simulé. **Le preview
HOLD offre en plus `forceHoldLock` / `forceHoldExit` avec flag triche et `holdMode`
sur les events.** La fixture neutre 1/5→FIN SHALL être rejouable en un clic comme non-régression.

#### Scenario: Test des 5 branches

- **GIVEN** la fixture neutre chargée en preview
- **WHEN** l'auteur force tour à tour les 5 tirages
- **THEN** chaque branche s'active et atteint FIN sans erreur

#### Scenario: Preview HOLD des 5 branches

- **GIVEN** la fixture neutre chargée en preview HOLD
- **WHEN** l'auteur force tour à tour les 5 tirages avec `forceHoldLock`
- **THEN** chaque branche s'active et atteint FIN, chaque event porte le flag triche et `holdMode`

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 7 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter, Inventaire — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

Une barre globale SHALL afficher en permanence : le nom du jeu (champ auto-largeur suivant son contenu), son statut (`draft`/`reviewed`), les compteurs (nœuds, draft, reviewed), la pastille validation C1/C2, l'undo/redo sous forme d'icônes flèches et l'accès à l'export.

La navigation latérale SHALL être repliable en une colonne d'icônes sur grand écran, sans actions de création (la création vit dans la box des étapes et le rail replié). Le repli SHALL fonctionner dans les deux sens : le menu ouvert SHALL exposer un contrôle « Replier le menu » (chevron, même logique icône + tooltip que les autres panneaux) et le rail replié SHALL exposer le contrôle « Déplier le menu ». L'état SHALL persister en localStorage et être restauré au chargement.

Le détail de validation (verdicts C1/C2, listes d'erreurs, impasses navigables) SHALL vivre exclusivement dans l'écran Valider. Le Composer SHALL ne jamais afficher de liste d'erreurs détaillée : il affiche uniquement une pastille compacte d'état (ex. `⚠ N problèmes` / `✓ Valide`), cliquable vers l'écran Valider.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

#### Scenario: Menu replié sans création
- **GIVEN** le Studio en mode grand écran avec le menu latéral replié
- **WHEN** l'auteur regarde la barre latérale
- **THEN** seuls les écrans sont visibles en tant qu'icônes cliquables ; la création se fait dans la box des étapes ou le rail replié

#### Scenario: Replier depuis le menu ouvert
- **GIVEN** le Studio en mode grand écran avec le menu latéral ouvert
- **WHEN** l'auteur active le contrôle « Replier le menu »
- **THEN** le menu se rétracte en colonne d'icônes et le Composer occupe l'espace libéré

#### Scenario: Aller-retour persistant du menu
- **GIVEN** un menu replié par l'auteur
- **WHEN** l'auteur recharge la page
- **THEN** le menu est toujours replié ; le dépliage depuis le rail restaure le menu ouvert

#### Scenario: Pastille compacte vers Valider
- **GIVEN** un jeu avec 3 erreurs de validation affiché dans le Composer
- **WHEN** l'auteur regarde le Composer
- **THEN** aucune liste d'erreurs n'est affichée, seule une pastille `⚠ 3 problèmes` est visible
- **WHEN** l'auteur clique la pastille
- **THEN** l'écran Valider s'ouvre avec le détail des 3 erreurs

#### Scenario: Pastille en entête
- **GIVEN** n'importe quel écran du Studio avec un jeu invalide
- **WHEN** l'auteur regarde la barre globale
- **THEN** la pastille `⚠ N problèmes` est visible à côté du nom du jeu et des compteurs, cliquable vers Valider

#### Scenario: Nom auto-largeur et undo flèches
- **GIVEN** un jeu nommé « La malédiction du studio Rathaway »
- **WHEN** l'auteur regarde la barre globale
- **THEN** le champ nom affiche le titre entier sans troncature, et undo/redo sont des icônes flèches avec tooltips

### Requirement: Densité compacte des boutons du Composer

Sur grand écran (`lg+`, usage pointeur), tous les boutons d'action du Composer (toolbar centrale Graphe/Carte/Screen, en-têtes liste/détail, rails, chevrons) SHALL utiliser une densité compacte : paddings, hauteurs et tailles d'icônes réduits d'un cran via une variante partagée, sans changer les libellés, les tooltips ni les actions déclenchées. Sur la vue étroite (`<lg`, onglets tactiles), les cibles SHALL rester conformes à la règle 44 px.

#### Scenario: Toolbar centrale compacte
- **GIVEN** le Composer en mode grand écran
- **WHEN** l'auteur regarde la barre du panneau central (Graphe, Carte, Screen, Tout sélectionner)
- **THEN** les boutons sont en densité compacte, avec libellés et tooltips inchangés, et commutent les vues comme avant

#### Scenario: Tactile non dégradé
- **GIVEN** le Composer en vue étroite sur tablette tactile
- **WHEN** l'auteur utilise les onglets et boutons
- **THEN** chaque cible tactile respecte 44 px minimum et reste activable au doigt

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

### Requirement: Accordéon des sections

Le Studio SHALL offrir un composant accordéon unique pour compacter les sections verticales : en-tête chevron + titre + badge résumé (compte d'éléments, origine d'héritage Global/Écran/Widget, état), contenu repliable. L'accordéon SHALL s'appliquer au `PropertiesPanel` WYSIWYG, aux formulaires de configuration des modules (quiz, puzzle, paramètres mini-jeux) et aux sous-sections à l'intérieur d'une famille de l'Inspecteur.

À la sélection d'un nœud ou d'un widget, seule la section pertinente au contexte SHALL s'ouvrir (« contexte seul »), les autres restant fermées. L'état ouvert/fermé de chaque section SHALL persister en localStorage et être restauré à la sélection suivante.

Les tabs à icônes des 9 familles de l'Inspecteur SHALL être conservés (navigation rapide entre concerns) : l'accordéon compacte *dans* une famille, il ne remplace jamais les tabs.

#### Scenario: Contexte seul à la sélection
- **GIVEN** un nœud QUIZ avec style personnalisé, toutes sections fermées en mémoire
- **WHEN** l'auteur clique un widget texte dans le canvas
- **THEN** seule la section « Contenu » s'ouvre, « Module », « Style — Écran » et « Avancé » restent fermés

#### Scenario: Badge sans ouverture
- **GIVEN** un module QUIZ avec 5 questions, section « Module » fermée
- **WHEN** l'auteur regarde l'en-tête
- **THEN** le badge affiche « 5 questions » sans qu'il soit nécessaire d'ouvrir

#### Scenario: Mémoire de l'accordéon
- **GIVEN** un auteur ayant ouvert « Avancé » puis rechargé la page
- **WHEN** il sélectionne le même nœud
- **THEN** « Avancé » est ouvert comme avant, les autres sections suivent la règle du contexte

### Requirement: Inspecteur de nœud

Le panneau d'inspection SHALL présenter des sections fixes dans cet ordre : `module` (type + version) → `activation` → `latch`/rejeu → `discovery` → `effects` → `inventoryRef` → `position`, générées depuis le registre de modules sans aucun champ codé en dur dans l'UI.

La section `module` SHALL afficher sous le dropdown de type le formulaire de configuration du module (le `propertiesPanel` du registre) quand le type en dispose un : chaque champ requis au schéma du module SHALL être renseignable ici, sans JSON. L'inline historique propre à un type (questions QUIZ) SHALL être supprimé au profit de ce panneau unique.

Le panneau d'inspection SHALL utiliser un système de sidebar à icônes : une colonne d'icônes identifiant chaque section, avec un contenu qui s'affiche lorsqu'une icône est sélectionnée. Si aucun nœud n'est sélectionné, la sidebar affiche un placeholder indiquant de sélectionner un nœud.

Si le module déclare `needsLock: true` alors que `holdMode == none`, le champ HOLD correspondant SHALL être affiché en lecture seule avec un lien direct vers la configuration globale et l'explication du blocage, jamais un blocage muet.

Des `presentationNeeds`/`experienceNeeds` non satisfaits par la config globale active SHALL afficher un avertissement inline sans bloquer — le blocage reste le rôle exclusif de l'écran Valider.

#### Scenario: Module needsLock sans HOLD expliqué
- **GIVEN** un nœud AR_MARKER (`needsLock: true`) dans un jeu avec `holdMode == "none"`
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** le champ HOLD est en lecture seule, explique qu'il faut un `holdMode` actif, et propose le lien vers la config globale

#### Scenario: Besoins non satisfaits avertis sans bloquer
- **GIVEN** un module avec `experienceNeeds: ["map"]` et un `experienceStyle` sans configuration `map`
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** un avertissement inline est affiché et l'édition du nœud reste possible

#### Scenario: Sidebar à icônes avec placeholder
- **GIVEN** le Composer ouvert sans nœud sélectionné
- **WHEN** l'auteur regarde le panneau d'inspection à droite
- **THEN** une colonne d'icônes est visible, le contenu affiche "Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier"

#### Scenario: Sélection d'une section via icône
- **GIVEN** un nœud sélectionné dans l'inspecteur
- **WHEN** l'auteur clique sur l'icône "Effets" (section 7)
- **THEN** le contenu de la section Effets s'affiche dans le panneau, les autres sections sont masquées

#### Scenario: Formulaire module sous le dropdown
- **GIVEN** un nœud BOUSSOLE avec `toleranceDeg` vide, ouvert dans l'Inspecteur
- **WHEN** l'auteur regarde sous le dropdown « Mini-jeu »
- **THEN** le champ tolérance est affiché (pas de JSON) et le renseigner fait passer la C1 sur ce champ

#### Scenario: Pas de doublon QUIZ
- **GIVEN** un nœud QUIZ ouvert dans l'Inspecteur
- **WHEN** l'auteur regarde la section module
- **THEN** un seul formulaire questions est affiché (le panneau registre), sans inline historique séparé

### Requirement: Gestion de l'inventaire

L'écran Composer SHALL offrir une vue liste des objets et une vue "référencé par" indiquant quels nœuds utilisent chaque objet. La suppression d'un objet référencé ailleurs SHALL exiger une confirmation listant les nœuds impactés.

#### Scenario: Suppression d'objet référencé
- **GIVEN** un objet `cle` utilisé par 2 nœuds via `ITEM_REQUIRED`
- **WHEN** l'auteur demande la suppression de `cle`
- **THEN** une confirmation liste les 2 nœuds impactés avant toute suppression

### Requirement: Configuration globale dédiée

La configuration globale SHALL vivre dans un panneau dédié (hors nœuds), structuré en sous-sections correspondant 1:1 aux opérations MCP : navigation & présentation, `experienceStyle` (sélecteur de preset + champs par dimension, avec indication visible si le preset a été modifié manuellement après sélection), branding typé (validé à la saisie, pas seulement à l'export), `gameMode`/`difficulty`, HOLD (`holdMode`, `holdExit`), GPS/carte.

Changer `holdMode` SHALL déclencher un recalcul visible des nœuds qui en dépendent.

#### Scenario: Changement de holdMode recalcule les dépendances
- **GIVEN** un jeu avec un module `needsLock` et `holdMode == "none"`
- **WHEN** l'auteur passe `holdMode` à `"guidedAccess"`
- **THEN** le nœud concerné affiche immédiatement son nouvel état de dépendance satisfaite

#### Scenario: Preset modifié signalé
- **GIVEN** un `experienceStyle` avec `preset: "BASIC"`
- **WHEN** l'auteur modifie manuellement `visual.primaryColor`
- **THEN** l'UI indique que le preset a divergé de sa référence

### Requirement: Parité d'état à l'import

Un import réussi SHALL placer le jeu exactement dans le même état que Composer après une création manuelle : même chaîne undo/redo, mêmes écrans disponibles. L'interface ne SHALL jamais proposer un "mode import" distinct aux capacités réduites.

Si le fichier échoue à la couche 1 (forme), l'erreur brute de schéma SHALL être affichée sans reformulation masquant l'information technique nécessaire au debug.

#### Scenario: Import puis édition immédiate
- **GIVEN** un fichier JSON valide importé avec succès
- **WHEN** l'auteur modifie un nœud puis annule (undo)
- **THEN** l'annulation fonctionne comme pour un jeu créé manuellement

### Requirement: File de relecture

L'écran Relire SHALL lister étapes et assets avec `providerId`, licence, `sourceUrl`, statut et `reviewedBy`, et offrir un filtre par statut avec le filtre `draft` mis en avant par défaut.

L'overlay de relecture SHALL montrer la source et les données du module associé, superposées quand le module s'y prête, côte-à-côte sinon.

Le passage `draft → reviewed` SHALL être une action explicite enregistrant `reviewedBy` (utilisateur courant), non modifiable a posteriori sans action distincte d'annulation de relecture.

Un compteur global des éléments encore `draft` SHALL rester visible en permanence, car il bloque l'export hors mode animateur.

Le message de blocage affiché dans Relire SHALL nommer la règle applicable : « aucun brouillon hors mode animateur » en général, et SHALL mentionner l'exigence kiosque (« jeu relu exigé ») uniquement quand `holdMode != "none"`. Le message SHALL jamais présenter le kiosque comme cause du blocage quand `holdMode` vaut `"none"`.

#### Scenario: Relecture avec overlay module
- **GIVEN** une étape 7-erreurs en statut `draft`
- **WHEN** l'auteur ouvre l'overlay de relecture
- **THEN** l'image source et les polygones du module sont affichés ensemble avant tout passage en `reviewed`

#### Scenario: Compteur draft et blocage HOLD
- **GIVEN** un jeu avec 2 éléments `draft` et `holdMode != "none"`
- **WHEN** l'auteur consulte n'importe quel écran
- **THEN** le compteur affiche 2 et l'export reste bloqué

#### Scenario: Compteur draft et blocage hors animateur

- **GIVEN** un jeu avec 2 éléments `draft`, `holdMode: "none"`, hors mode animateur
- **WHEN** l'auteur consulte n'importe quel écran
- **THEN** le compteur affiche 2 et l'export reste bloqué

#### Scenario: Message sans mention kiosque quand HOLD inactif

- **GIVEN** un jeu avec 1 nœud `draft` et `holdMode: "none"`
- **WHEN** l'auteur lit le message de blocage dans Relire
- **THEN** le message cite le nœud `draft` et ne mentionne pas le kiosque

#### Scenario: Message kiosque quand HOLD actif

- **GIVEN** un jeu avec 1 nœud `draft` et `holdMode: "lockTask"`
- **WHEN** l'auteur lit le message de blocage dans Relire
- **THEN** le message cite le nœud `draft` et l'exigence « jeu relu » du kiosque

### Requirement: Verdicts séparés et actionnables

L'écran Valider SHALL présenter les verdicts C1 (Draft-07) et C2 (applicative) dans deux blocs visuellement séparés, jamais fusionnés en un statut global unique.

Les erreurs C2 SHALL être groupées par catégorie (cycle, atteignabilité, pools, HOLD, références, consumable), et chaque erreur SHALL être cliquable pour naviguer vers le nœud fautif dans Composer avec surlignage temporaire.

La règle de dérivation "export possible" (C1 ∧ C2 ∧ pas de nœud `draft` hors mode animateur) SHALL être visible dans l'UI (aide contextuelle), jamais appliquée silencieusement.

#### Scenario: Erreur cliquable vers le fautif
- **GIVEN** un jeu avec une erreur C2 de cycle entre les nœuds A et B
- **WHEN** l'auteur clique l'erreur dans la catégorie cycle
- **THEN** Composer s'ouvre sur les nœuds A et B surlignés temporairement

### Requirement: Prévisualisation traçée

L'écran Prévisualiser SHALL offrir un mode pas-à-pas (avance/retour nœud par nœud) et un panneau de triche regroupant bypass capteurs, `forceDraw` par branche, injection de `sessionId` et `forceHoldLock`/`forceHoldExit`.

Tout event simulé SHALL porter visuellement le flag triche (badge distinct, ex. "SIMULÉ") plus l'état HOLD courant : un event simulé ne SHALL jamais ressembler à un event réel dans les logs affichés.

Un bouton dédié SHALL relancer la fixture neutre 1/5→FIN en un clic avec résultat pass/fail immédiat.
Un rappel permanent SHALL indiquer que la prévisualisation n'écrit jamais dans le JSON source.

Le mode « Jeux » plein écran SHALL afficher le terminal joueur simulé : l'écran du Nœud ACTIVE, résolu global → Nœud et rendu en lecture seule (édition et sélection désactivées, zones fantômes masquées), avec le renderer joueur du Module quand le registre en déclare un, sinon un état non bloquant proposant la sortie par triche (terminer/abandonner). Valider dans le renderer joueur SHALL produire les mêmes transitions que le simulateur (Nœud COMPLETED, effets appliqués, event SIMULÉ journalisé). Terminer (triche ou validation jouée) SHALL rouvrir automatiquement le Nœud ACTIVE suivant éligible au lieu de retomber sur l'attente. Le changement d'écran SHALL suivre le Nœud ACTIVE selon la file FIFO (1 modale max) ; la sortie du mode (Échap ou bouton) SHALL restaurer la vue auteur sans perdre l'état de simulation.

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

#### Scenario: Terminer avance au suivant

- **GIVEN** le mode « Jeux » ouvert avec `baker` ACTIVE puis terminé (triche ou validation jouée), un Nœud suivant éligible existant
- **WHEN** la complétion est enregistrée
- **THEN** le terminal affiche l'écran du Nœud ACTIVE suivant sans repasser par l'attente

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

### Requirement: Export à porte unique

Le bouton d'export SHALL être désactivé (jamais caché) tant que la validation échoue ou qu'un nœud est `draft` hors mode animateur, avec un message indiquant laquelle des deux conditions bloque.

La checklist « Contrôle pré-export » de l'écran Exporter SHALL être calculée depuis l'état réel du jeu et SHALL afficher au minimum : le verdict C1 (Draft-07), le verdict C2 (applicative), le décompte et les noms des nœuds encore `draft`, et les verdicts par canal d'export (NATIVE, PWA). Aucune ligne de la checklist SHALL être un texte statique : chaque ligne reflète le jeu courant et se met à jour à chaque modification.

La ligne relative à la relecture SHALL appliquer la règle kiosque uniquement quand `holdMode != "none"` : avec `holdMode: "none"`, seul le blocage « aucun brouillon hors mode animateur » SHALL apparaître ; avec `holdMode != "none"`, l'exigence « jeu relu » SHALL apparaître comme condition kiosque distincte.

Avant génération, l'écran SHALL afficher le résumé des fichiers à produire calculé depuis le jeu courant (jamais un exemple statique) ; après génération, chaque fichier SHALL afficher son `{path, version, size, sha256}` réel.

Le bouton d'export de l'écran Exporter SHALL déclencher la génération du pack (même opération que la règle centrale `canExport` autorise) quand il est actif. Le bouton Exporter de la barre globale SHALL ouvrir l'écran Exporter, qui reste la porte unique : l'interface SHALL n'exposer qu'une seule action d'export visible par défaut. Si la porte historique `exportPack` coexiste temporairement avec `exportPackFull`, elle SHALL être marquée dépréciée et masquée derrière un accès explicite.

#### Scenario: Export bloqué avec raison visible

- **GIVEN** un jeu valide C1+C2 mais avec 1 nœud `draft` hors mode animateur
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** le bouton est désactivé et le message nomme le nœud `draft` comme cause du blocage

#### Scenario: Checklist reflétant l'état réel

- **GIVEN** un jeu avec 2 nœuds `draft` et `holdMode: "none"`
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** la checklist affiche « 2 nœuds en statut draft » avec leurs noms, aucun texte statique, et aucune mention du kiosque

#### Scenario: Ligne kiosque seulement en HOLD actif

- **GIVEN** un jeu avec `holdMode: "guidedAccess"` et 1 nœud `draft`
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** la checklist affiche la condition kiosque « jeu relu exigé » en plus du nœud `draft` nommé

#### Scenario: Export réussi depuis l'écran Exporter

- **GIVEN** un jeu valide C1+C2 sans nœud `draft`
- **WHEN** l'auteur clique le bouton d'export de l'écran Exporter
- **THEN** le pack est généré et chaque fichier affiche son `{path, version, size, sha256}` réel

#### Scenario: Barre globale vers la porte unique

- **GIVEN** l'auteur dans n'importe quel écran du Studio
- **WHEN** il clique Exporter dans la barre globale
- **THEN** l'écran Exporter s'ouvre (aucun transfert direct), avec la checklist à jour

### Requirement: Calques transverses

Les calques i18n, difficultés/modes SHALL se superposer à Composer via un sélecteur de la barre globale, jamais comme écrans séparés.

Le calque i18n SHALL offrir un sélecteur de langue active, une vue clé/valeur et un indicateur de clés manquantes par langue. Les clés du glossaire verrouillé SHALL être visuellement non éditables (grisées + cadenas), jamais simplement "modifiables mais déconseillées".

Les difficultés/modes SHALL être présentés comme des surcouches du graphe (sélecteur de vue). L'UI ne SHALL offrir aucune action de type "dupliquer le graphe pour cette difficulté".

HOLD SHALL NOT figurer dans le même sélecteur que difficulté/mode : c'est un mode système configuré dans la configuration globale.

#### Scenario: Clé verrouillée non éditable
- **GIVEN** une clé i18n marquée `locked` dans le glossaire
- **WHEN** l'auteur ouvre le calque i18n
- **THEN** la clé est grisée avec un cadenas et aucune édition n'est possible

### Requirement: Garanties P0 traduites en interface

Toute action de l'UI SHALL passer par une opération MCP nommée et journalisée : aucune édition directe d'état contournant l'historique n'est permise.

Aucun champ d'UI SHALL n'exister sans équivalent persisté dans le JSON : si une valeur s'affiche, elle existe dans le JSON.

Le mode de lecture en conditions réelles SHALL vérifier lui-même le statut `draft`, indépendamment du contrôle à l'export.

La règle de blocage à l'export (validation ∧ statuts) SHALL être calculée par une règle centrale unique, jamais dupliquée en deux endroits de l'UI.

Les écrans Importer et Exporter ne SHALL initier aucune requête réseau.

#### Scenario: Action UI traçable dans l'historique
- **GIVEN** un auteur modifiant la couleur primaire du branding
- **WHEN** il ouvre l'historique undo/redo
- **THEN** l'entrée correspondante nomme l'opération MCP (`setBranding`), pas un diff JSON opaque

### Requirement: Vue carte/plan dans le Composer

Le Composer SHALL offrir un toggle entre la vue graphe et la vue carte/plan, visible en permanence dans la barre d'outils. Le toggle SHALL être opérationnel uniquement lorsque le jeu a une configuration de carte (`global.map` pour outdoor) ou de plans (`global.indoorPlans` pour indoor). Sans ces配置, le toggle SHALL être masqué ou désactivé.

La vue carte/plan SHALL supporter les mêmes interactions de sélection et d'édition que la vue graphe : sélection de nœud, undo/redo, édition via l'inspecteur. La sélection de nœud SHALL être synchronisée entre les deux vues (sélectionner un nœud dans la carte le sélectionne aussi dans le graphe).

#### Scenario: Toggle visible avec configuration carte
- **GIVEN** un jeu avec `global.map` configuré
- **WHEN** l'auteur ouvre le Composer
- **THEN** le toggle Carte/Graphe est visible et activé

#### Scenario: Toggle masqué sans configuration
- **GIVEN** un jeu sans `global.map` ni `global.indoorPlans`
- **WHEN** l'auteur ouvre le Composer
- **THEN** le toggle Carte/Graphe est masqué

#### Scenario: Sélection synchronisée carte → graphe
- **GIVEN** le Composer en vue carte avec un nœud sélectionné
- **WHEN** l'auteur bascule vers la vue graphe
- **THEN** le même nœud reste sélectionné dans la vue graphe

### Requirement: Section position dans l'inspecteur

L'inspecteur de nœud SHALL afficher une section `position` pour les nœuds ayant des coordonnées géographiques :
- **Outdoor** : champs `lat` et `lng` (liés à la condition GEOFENCE)
- **Indoor** : champs `planId`, `x`, `y` (liés à `node.position`)

La section position SHALL être placée après la section `activation` dans l'inspecteur. Les champs SHALL être éditables manuellement (saisie directe) ET mis à jour par interaction carte/plan (click/drag).

#### Scenario: Section position outdoor
- **GIVEN** un nœud avec condition GEOFENCE (lat: 48.01, lng: 2.01)
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** une section "Position" affiche les champs lat et lng avec les valeurs actuelles

#### Scenario: Section position indoor
- **GIVEN** un nœud avec position (planId: "plan-rdc", x: 5.0, y: 3.0)
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** une section "Position" affiche les champs planId, x et y avec les valeurs actuelles

#### Scenario: Modification manuelle met à jour la carte
- **GIVEN** un nœud avec GEOFENCE (lat: 48.01, lng: 2.01) en vue carte
- **WHEN** l'auteur modifie lat à 48.02 dans l'inspecteur
- **THEN** le marqueur se déplace sur la carte vers la nouvelle position

### Requirement: Suppression de noeud

Le Studio SHALL fournir un bouton de suppression dans l'Inspecteur et la NodeList pour chaque noeud. La suppression SHALL retirer le noeud du JSON et toutes les aretes (conditions `NODE_COMPLETED`, `POOL_DRAWN`, effects `REVEAL_NODE`/`UNLOCK_NODE`) qui le referencent en tant que source ou cible.

Si le noeud est reference par d'autres noeuds (conditions, effects, progression), une confirmation SHALL lister les noeuds impactes avant toute suppression.

Un noeud ne peut pas etre supprime s'il est le seul noeud `isEnding:true` du jeu (le validateur rejetterait le jeu).

#### Scenario: Suppression simple
- **GIVEN** un jeu avec 3 noeuds dont un noeud `etape-2` sans reference depuis d'autres noeuds
- **WHEN** l'auteur clique sur supprimer `etape-2` et confirme
- **THEN** le noeud est retire du JSON, les 2 autres noeuds restent inchanges, le canvas se met a jour

#### Scenario: Suppression avec references
- **GIVEN** un jeu avec 3 noeuds dont `etape-1` reference par une condition `NODE_COMPLETED` du noeud `etape-2`
- **WHEN** l'auteur demande la suppression de `etape-1`
- **THEN** une confirmation affiche "Ce noeud est reference par etape-2 (condition NODE_COMPLETED). Supprimer ?" avant toute action

#### Scenario: Suppression du dernier isEnding
- **GIVEN** un jeu avec 2 noeuds dont un seul `isEnding: true` (noeud `fin`)
- **WHEN** l'auteur demande la suppression de `fin`
- **THEN** la suppression est refusee avec le message "Impossible de supprimer le seul noeud de fin du jeu"

### Requirement: Renommage de noeud

Le Studio SHALL fournir un champ ID editable dans l'Inspecteur pour chaque noeud. Le renommage SHALL mettre a jour toutes les references au noeud dans le jeu : conditions `NODE_COMPLETED`, `POOL_DRAWN`, `anchorNodeId` de TIMER, effects `REVEAL_NODE`/`UNLOCK_NODE`, `sourceNode` de discovery, et tout autre champ referencant le nodeId.

Le validateur SHALL rejeter un ID duplique (unicite preservee). L'ID ne peut pas etre vide.

#### Scenario: Renommage avec propagation
- **GIVEN** un noeud `etape-1` reference par une condition `NODE_COMPLETED` dans `etape-2`
- **WHEN** l'auteur renomme `etape-1` en `chateau-louis-xiv`
- **THEN** la condition dans `etape-2` pointe desormais vers `chateau-louis-xiv`, le JSON est coherent

#### Scenario: Renommage vers ID existant
- **GIVEN** un noeud `etape-1` et un noeud `etape-2`
- **WHEN** l'auteur tente de renommer `etape-1` en `etape-2`
- **THEN** le renommage est refuse avec le message "Cet ID est deja utilise"

### Requirement: Duplication de noeud

Le Studio SHALL fournir un bouton de duplication dans l'Inspecteur et la NodeList. La duplication SHALL creer une copie du noeud avec un ID genere (suffixe `-copy` ou increment numerique), en conservant toutes ses proprietes (module, activation, latch, discovery, effects, inventoryRef).

Le noeud duplique SHALL etre place a cote du noeud source sur le canvas (position legèrement decalée). Seules les aretes entrantes/sortantes du noeud source ne sont PAS dupliquees (le noeud copie est isolé par defaut).

#### Scenario: Duplication d'un noeud
- **GIVEN** un noeud `chateau-1` avec un module QUIZ et 2 conditions
- **WHEN** l'auteur clique sur dupliquer
- **THEN** un nouveau noeud `chateau-1-copy` est cree avec le meme module et les memes conditions, positionne a cote sur le canvas

### Requirement: Noeud START par defaut dans un jeu nouveau

Un jeu cree via `jeuVide()` (nouveau jeu vierge) SHALL contenir par defaut un noeud `start` de type `INFO` avec `isEnding: false` et une activation vide. Ce noeud sert de point de depart pour l'auteur et garantit que le canvas n'est jamais vide a l'ouverture.

Le noeud `start` ne peut pas etre supprime tant qu'il est le seul noeud du jeu (meme logique que `isEnding` : un jeu sans noeud est inutilisable).

#### Scenario: Nouveau jeu avec noeud start
- **GIVEN** un auteur qui cree un nouveau jeu
- **WHEN** le jeu est initialise
- **THEN** le canvas contient un noeud `start` (type INFO) positionne au centre, et l'auteur peut commencer a le configurer

#### Scenario: Jeu importe sans noeud start
- **GIVEN** un fichier JSON importe sans aucun noeud
- **WHEN** l'import est charge dans le Studio
- **THEN** un noeud `start` est ajoute automatiquement (comportement identique a `jeuVide()`)

### Requirement: Detection de references orphelines

Le validateur applicatif (couche 2) SHALL detecter les references a des nodeId inexistants dans le jeu : conditions `NODE_COMPLETED`, `POOL_DRAWN`, `anchorNodeId` de TIMER, effects `REVEAL_NODE`/`UNLOCK_NODE`, `sourceNode` de discovery, `candidates` de RANDOM_POOL, et tout autre champ referencant un nodeId absent de `game.nodes`.

Chaque reference orpheline SHALL produire une erreur C2 dans la categorie "references", avec le nodeId source et le champ fautif identifies.

#### Scenario: Reference orpheline apres suppression
- **GIVEN** un jeu ou le noeud `etape-2` a ete supprime mais `etape-1` contient encore une condition `NODE_COMPLETED` vers `etape-2`
- **WHEN** le validateur tourne
- **THEN** le jeu est rejete avec l'erreur C2 : "Reference orpheline : etape-1.condition[0] pointe vers etape-2 (inexistant)"

### Requirement: Éditeur WYSIWYG screen builder

Le Studio SHALL offrir un éditeur WYSIWYG qui remplace l'Inspector fixe par un panneau de propriétés contextuel. L'éditeur SHALL comporter :
- Un canvas de prévisualisation phone-size (environ 375x667px) dans le panneau central du Composer, affichant les zones (header, content, footer) avec leurs widgets rendus
- Un panneau de propriétés contextuel dans le panneau droit, affichant les propriétés selon la sélection (rien → propriétés nœud, zone → propriétés zone, widget → propriétés widget, module widget → config module + propriétés widget)
- Un sélecteur de template (TemplatePicker) pour choisir parmi des templates de mise en page prédéfinis

Le panneau de propriétés contextuel SHALL conserver les 9 familles de l'Inspector existant (module, activation, latch/rejeu, discovery, effects, inventoryRef, etc.) dans le même ordre, mais dans un panneau contextuel plutôt que fixe. Les warnings `needsLock` et `experienceNeeds` SHALL être affichés dans le panneau contextuel.

Le canvas SHALL être synchronisé avec la sélection du nœud dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

#### Scenario: Bascule de l'Inspector vers le WYSIWYG

- **GIVEN** un auteur habitué à l'Inspector fixe
- **WHEN** le Studio affiche le nouveau Composer
- **THEN** les mêmes sections (module, activation, discovery, effects, etc.) sont disponibles dans le panneau contextuel du WYSIWYG, dans le même ordre

#### Scenario: Sélection de nœud affiche son screen

- **GIVEN** un jeu avec 3 nœuds ayant des screens différents
- **WHEN** l'auteur sélectionne le nœud 2 dans le graphe
- **THEN** le canvas affiche le screen du nœud 2 et le panneau de propriétés affiche ses propriétés

#### Scenario: Modification de widget persistée

- **GIVEN** un nœud avec un widget texte dans la zone header
- **WHEN** l'auteur modifie le texte du widget dans le panneau de propriétés
- **THEN** le texte est mis à jour dans le canvas et dans le JSON du nœud

### Requirement: Navigation graphe/screen dans le Composer

Le Composer SHALL offrir un toggle ou une navigation entre la vue graphe (canvas de nœuds et arêtes) et la vue screen (WYSIWYG du nœud sélectionné). La sélection de nœud SHALL être synchronisée entre les deux vues.

Un raccourci clavier ou bouton SHALL permet basculer rapidement entre la vue graphe et la vue screen du nœud sélectionné.

#### Scenario: Toggle vers la vue screen

- **GIVEN** le Composer en vue graphe avec un nœud sélectionné
- **WHEN** l'auteur clique sur le bouton "Screen" ou utilise le raccourci
- **THEN** le panneau central affiche le WYSIWYG screen du nœud sélectionné

#### Scenario: Retour à la vue graphe

- **GIVEN** le Composer en vue screen
- **WHEN** l'auteur clique sur le bouton "Graphe"
- **THEN** le panneau central revient à la vue graphe avec le même nœud sélectionné

### Requirement: Barre d'outils de création dans la liste

Les 4 actions de création (Étape de jeu, Lieu GPS, Tirage au sort, Fin du jeu) SHALL vivre à un seul endroit : en haut de la box des étapes (`NodeList`), visibles en permanence indépendamment de la sélection de nœud. Aucun doublon ne SHALL exister dans les mémos App ni dans la navigation repliée ; les icônes du rail replié (accès état replié) sont l'unique exception admise.

#### Scenario: Création depuis la liste
- **GIVEN** l'auteur dans l'onglet "Liste" du Composer
- **WHEN** il clique sur "Lieu GPS" dans la barre d'outils
- **THEN** un nouveau nœud de type INFO avec condition GEOFENCE est créé, sélectionné, et la vue bascule vers l'inspecteur

#### Scenario: Barre visible sans sélection
- **GIVEN** l'onglet "Liste" actif sans nœud sélectionné
- **WHEN** l'auteur regarde la barre d'outils
- **THEN** les 4 boutons de création sont visibles et cliquables

#### Scenario: Point d'entrée unique
- **GIVEN** le Composer avec tous les panneaux ouverts
- **WHEN** l'auteur cherche où créer une étape
- **THEN** un seul groupe de 4 boutons existe (haut de la box des étapes), hors rail replié

### Requirement: Suppression de l'onglet Essai du Composer

Le Composer SHALL ne plus proposer l'onglet "Essai". Le composant Apercu (simulateur de jeu) SHALL être déplacé dans l'écran Prévisualiser, qui devient l'écran unique de simulation pas-à-pas.

L'écran Prévisualiser SHALL intégrer le simulateur Apercu avec les mêmes fonctionnalités qu'auparavant : bypass capteurs, `forceDraw`, injection `sessionId`, flag triche, `forceHoldLock`/`forceHoldExit`.

#### Scenario: Apercu dans Prévisualiser
- **GIVEN** l'auteur navigue vers l'écran Prévisualiser
- **WHEN** il charge un jeu
- **THEN** le simulateur Apercu s'affiche avec les mêmes contrôles qu'auparavant dans l'onglet Essai du Composer

#### Scenario: Composer sans onglet Essai
- **GIVEN** le Composer ouvert
- **WHEN** l'auteur regarde les onglets disponibles
- **THEN** seuls les onglets "Graphe", "Liste" et "Détail" sont affichés (pas "Essai")

### Requirement: Hiérarchie de priorité des contrôles

Chaque contrôle du Studio (bouton, menu, action, champ de configuration, message, information) SHALL appartenir à exactement un tier de priorité, dérivé du `WorkflowStepper` 1→5 (Graphe → Épreuves → Relecture → Validation → Export) :
- **P0 « prioritaire »** : fait avancer l'étape courante du workflow (créer un nœud, renseigner un mini-jeu, passer en relu, corriger une erreur, lancer la fixture, exporter). Toujours visible.
- **P1 « contextuel »** : n'a de sens que pour la sélection courante (config du widget cliqué, famille du nœud, pastille). Visible quand pertinent, jamais autrement.
- **P2 « avancé »** : exige de comprendre le schéma ou a un effet dangereux en production (édition JSON experte, rotation d'identifiant radio, secours par code, overrides, viewports d'aperçu, reset de layout, effacement du brouillon, triche de prévisualisation). Replié par défaut.

Les tiers P0/P1/P2 (visibilité des contrôles) sont sans rapport avec les « Garanties P0 » (traçabilité des opérations MCP), qui restent inchangées.

Sont sanctuarisés tel quel (hors tri) : le menu principal de gauche (7 écrans), la pastille validation, les rails d'actions, les tabs de l'Inspecteur et les accordéons « contexte seul ».

#### Scenario: Bouton destructif classé avancé
- **GIVEN** l'action « Effacer brouillon » (suppression locale irréversible)
- **WHEN** sa priorité est évaluée
- **THEN** elle est classée P2 (n'avance aucune étape, effet dangereux) et vit repliée avec confirmation

#### Scenario: Création classée prioritaire
- **GIVEN** les boutons Étape/Lieu/Tirage/Fin à l'étape 1 (Graphe)
- **WHEN** leur priorité est évaluée
- **THEN** ils sont classés P0 (font avancer l'étape courante) et restent visibles en permanence

#### Scenario: Config module classée contextuelle
- **GIVEN** les champs d'un widget texte quand aucun widget n'est sélectionné
- **WHEN** leur priorité est évaluée
- **THEN** ils sont classés P1 et restent masqués tant que le widget n'est pas sélectionné

### Requirement: Regroupement avancé par module

Les contrôles P2 SHALL vivre repliés dans des sections « Avancé » en bas de chaque module/famille (composant `Accordeon` existant, fermé par défaut, badge d'état, mémoire locale réutilisée), jamais au premier plan des formulaires. Les contrôles P2 transverses (bbox/zooms bruts, tileStrategy, glossaire verrouillé, reset de layout) SHALL vivre dans une section avancée de l'écran Config. Déplacer un contrôle en Avancé ne SHALL jamais changer son effet (même opération MCP, mêmes validations).

#### Scenario: Rotation master repliée
- **GIVEN** le bouton « Changer d'identifiant » (rotation = révocation radio terrain)
- **WHEN** l'auteur ouvre la famille Position d'un nœud PROXIMITY_MASTER
- **THEN** le bouton est dans la section « Avancé » fermée, le reste de la famille restant identique et fonctionnel

#### Scenario: Effet inchangé après déplacement
- **GIVEN** un contrôle P2 déplacé en section Avancé
- **WHEN** l'auteur l'ouvre et l'utilise
- **THEN** la même opération MCP est journalisée avec les mêmes validations qu'avant le déplacement

### Requirement: Création d'étape avec choix du module premier

Le choix du Module mini-jeu SHALL être le premier choix à la création d'une étape : l'auteur SHALL sélectionner le type de Module (parmi les types du registre, jamais une liste fermée en dur) avant toute composition d'écran. Le Nœud créé SHALL porter le `screen` issu du `defaultScreen` du Module choisi, avec un widget `{ type: "module" }` présent dans la zone content dès la création.

#### Scenario: Création avec module choisi

- **GIVEN** l'auteur crée une étape en choisissant le module PUZZLE
- **WHEN** l'étape est créée
- **THEN** son écran affiche le content par défaut du PUZZLE avec le widget du mini-jeu, sans action supplémentaire

#### Scenario: Création avec type sans plugin

- **GIVEN** l'auteur crée une étape en choisissant le module INFO (sans screenPlugin)
- **WHEN** l'étape est créée
- **THEN** son écran contient un widget `{ type: "module" }` générique dans la zone content

### Requirement: Changement de type de mini-jeu destructif

Changer le type du Module d'un Nœud via le dropdown « Mini-jeu » de la famille épreuve SHALL afficher un message indiquant que les modifications seront perdues et SHALL exiger une confirmation explicite. Sur confirmation, les `module.data` SHALL être détruites et seule la zone content SHALL être remplacée ; sur refus, le Nœud SHALL rester strictement inchangé.

#### Scenario: Changement confirmé

- **GIVEN** un Nœud QUIZ avec questions et content customisé
- **WHEN** l'auteur choisit PUZZLE dans le dropdown et confirme le message « modifications perdues »
- **THEN** les data du QUIZ sont détruites, les data par défaut du PUZZLE sont appliquées, et seule la zone content est remplacée (header/footer préservés)

#### Scenario: Changement refusé

- **GIVEN** un Nœud QUIZ avec questions
- **WHEN** l'auteur choisit PUZZLE dans le dropdown mais refuse la confirmation
- **THEN** le Nœud reste QUIZ avec ses data et son screen inchangés

### Requirement: Écran Inventaire dédié

L'écran Inventaire SHALL lister les objets du jeu chargé avec pour chacun : `icon` (vignette), `name`, `description`, badges `consumable`/`stackable`, et la mention « utilisé par : nœuds… » (réutilisant le calcul existant) avec navigation vers le nœud. Il SHALL permettre : création (`id` unique vérifié, `name`), édition de `name`/`description`/`consumable`/`stackable` après création, choix d'`icon` et d'`image` via parcours du poste ou dépôt (circuit manifest SHA-256 existant, non-image refusée), duplication (nouvel `id` proposé), réordonnancement (ordre = ordre d'affichage joueur), suppression avec confirmation listant les nœuds impactés. La carte « Objets / inventaire » SHALL disparaître de l'écran Configuration. Toute action SHALL passer par une opération MCP nommée et journalisée (historique undo/redo lisible).

#### Scenario: Création complète d'objet
- **GIVEN** l'écran Inventaire d'un jeu sans objet
- **WHEN** l'auteur crée « cle » (nom, description, icône déposée, consommable coché)
- **THEN** l'objet apparaît avec sa vignette et le JSON porte `id`/`name`/`description`/`icon`/`consumable`, le manifest contient l'icône

#### Scenario: Suppression avec impact
- **GIVEN** un objet `cle` requis par 2 nœuds
- **WHEN** l'auteur demande sa suppression
- **THEN** une confirmation liste les 2 nœuds avant toute suppression, et le refus laisse le jeu inchangé

### Requirement: Import d'objet depuis le catalogue

L'écran Inventaire SHALL proposer « Importer depuis le catalogue » : l'auteur SHALL choisir un jeu publié (liste du catalogue), puis un objet de ce jeu, puis valider la copie. En cas de collision d'`id`, un nouvel `id` SHALL être proposé (`id-importé`) avant validation, jamais écrasé silencieusement. L'import SHALL passer par une opération MCP nommée et journalisée.

#### Scenario: Import sans collision
- **GIVEN** l'écran Inventaire et le jeu « Chasse » publié avec l'objet `boussole-antique`
- **WHEN** l'auteur importe `boussole-antique`
- **THEN** l'objet apparaît à l'identique (nom, description, réglages) avec son icône ré-enregistrée au manifest

#### Scenario: Collision d'identifiant
- **GIVEN** le jeu courant contenant déjà `cle`
- **WHEN** l'auteur importe `cle` depuis un autre jeu
- **THEN** `cle-importé` est proposé, modifiable avant validation, l'objet d'origine est intact

### Requirement: Arbre des widgets dans la liste des étapes

Chaque ligne d'étape de la liste SHALL exposer un sous-arbre dépliable des éléments de son écran : zones présentes (en-tête, contenu, pied de page, surimpression) puis widgets de chaque zone (type + libellé court). Sélectionner une entrée de l'arbre SHALL sélectionner la zone ou le widget correspondant (même sélection que le clic canvas) et afficher ses détails dans le panneau de droite. Le sous-arbre SHALL refléter l'écran courant du nœud (zones fantômes exclues) et rester replié par défaut pour préserver la densité de la liste.

#### Scenario: Dépliage de l'arbre d'une étape

- **GIVEN** la liste avec un nœud `baker` (header + content avec quiz)
- **WHEN** l'auteur déplie le sous-arbre de `baker`
- **THEN** les zones header et content apparaissent, avec le widget module sous content

#### Scenario: Sélection d'un widget depuis l'arbre

- **GIVEN** le sous-arbre déplié d'un nœud avec un widget texte dans le header
- **WHEN** l'auteur clique l'entrée du widget texte
- **THEN** le widget est sélectionné (surligné dans le canvas) et le panneau de droite affiche ses propriétés

### Requirement: Données valides du nœud start par défaut

Le nœud `start` créé par défaut (jeu vide, import d'un fichier sans nœud) SHALL porter des données conformes au sous-schéma de son type de module : pour `INFO`, `schemaVersion` + au moins un step au contenu générique de bienvenue. Le `start` SHALL être accepté en couche 1 sur son `module.data`, indépendamment des autres champs.

#### Scenario: Jeu vide au commit initial
- **GIVEN** un auteur créant un nouveau jeu
- **WHEN** le `start` par défaut est validé en couche 1
- **THEN** aucune erreur ne porte sur `module/data` (le step de bienvenue est valide)

### Requirement: Ajout d'objet référencé créant une ligne

Dans la famille inventaire de l'inspecteur, le bouton « Ajouter un objet référencé » SHALL créer immédiatement une ligne éditable (sélecteur d'objet vide) : l'auteur choisit ensuite l'objet, modifie son choix ou supprime la ligne. Cliquer le bouton SHALL toujours faire apparaître une ligne ; il ne SHALL jamais produire un tableau vide sans ligne.

#### Scenario: Premier ajout

- **GIVEN** une étape sans objet référencé
- **WHEN** l'auteur clique « Ajouter un objet référencé »
- **THEN** une ligne avec sélecteur apparaît, l'auteur y choisit « Clé », et le JSON porte `inventoryRef: ["cle"]`

#### Scenario: Ajouts successifs

- **GIVEN** une étape avec un objet référencé
- **WHEN** l'auteur clique à nouveau « Ajouter un objet référencé »
- **THEN** une seconde ligne vide apparaît sans effacer la première

### Requirement: Effets multiples par étape

Une étape SHALL accepter N effets (N ≥ 0) : ajouter, réordonner implicitement (ordre du tableau), modifier et supprimer chaque effet indépendamment. Le bouton d'ajout SHALL rester disponible quel que soit le nombre d'effets existants (zéro, un ou plusieurs), et non disparaître après le premier. Chaque effet SHALL être validé et exporté comme aujourd'hui.

#### Scenario: Deuxième effet

- **GIVEN** une étape avec un effet `GIVE_ITEM {cle}`
- **WHEN** l'auteur ajoute un effet `REVEAL_NODE {message_secret}`
- **THEN** les deux effets coexistent dans le JSON, éditables et supprimables séparément

### Requirement: Entrée MODE JEUX depuis le premier nœud

Lancer le terminal joueur (« ▶ Mode Jeux ») sans nœud actif SHALL ouvrir le premier nœud éligible du jeu (tête de file de la simulation) au lieu de la salle d'attente. Si aucun nœud n'est éligible, la salle d'attente existante SHALL s'afficher (comportement inchangé). L'enchaînement suivant (effectuer les modules, compléter, ouvrir le suivant) SHALL rester piloté par la file existante, sans transition d'état ajoutée.

#### Scenario: Lancement depuis le début

- **GIVEN** une simulation neuve dont la file propose `baker` en premier
- **WHEN** l'auteur lance « ▶ Mode Jeux » sans nœud actif
- **THEN** le terminal affiche directement l'écran de `baker`, prêt à jouer

#### Scenario: File vide inchangée

- **GIVEN** une simulation sans nœud éligible
- **WHEN** l'auteur lance « ▶ Mode Jeux »
- **THEN** la salle d'attente s'affiche comme aujourd'hui

### Requirement: Libellé d'essai sans suffixe

Le bouton de l'écran Prévisualiser SHALL s'intituler « Essai du parcours », sans le suffixe « (triche tracée) ». Le comportement (essai avec triche tracée et badge SIMULÉ) SHALL rester inchangé ; seul le libellé est simplifié.

#### Scenario: Libellé simplifié

- **GIVEN** l'écran Prévisualiser affiché
- **WHEN** l'auteur regarde les actions d'essai
- **THEN** le bouton affiche « Essai du parcours », et l'essai trace toujours la triche comme avant

### Requirement: Écran Modules avec éditeur 7-erreurs

Le Studio SHALL offrir un écran « Modules » dans la navigation, hébergeant l'éditeur de zones du 7-erreurs en grand format : sélecteur du nœud DIFFERENCE_GAME (pré-sélectionné si deep-link), image source à son ratio réel occupant l'espace, calque de zones en %, outils rectangle et polygone, liste + suppression, le tout via l'opération nommée existante (undo natif). L'éditeur SHALL NE PAS vivre dans Relire : l'overlay de Relire reste en lecture seule (validation humaine) avec le même rendu proportionné.

#### Scenario: Édition grand format depuis le détail
- **GIVEN** un nœud 7-erreurs avec 2 zones, auteur dans le détail
- **WHEN** il touche « Éditer les zones »
- **THEN** l'écran Modules s'ouvre sur ce nœud, l'image est à son ratio, les 2 zones sont tracées, et un polygone ajouté persiste via undo

#### Scenario: Relire ne modifie rien
- **GIVEN** l'overlay Relire d'un 7-erreurs affiché au ratio réel
- **WHEN** l'auteur clique sur une zone
- **THEN** rien n'est modifié (lecture seule), seul l'écran Modules édite

### Requirement: Aperçu réduit et renvoi dans le détail

Le volet détail du Composer SHALL afficher pour un nœud DIFFERENCE_GAME un aperçu réduit STRICTEMENT proportionné à la source (ratio des dimensions naturelles, taille réduite pour tenir dans le volet, zones en %) avec le compteur de zones, plus un bouton « Éditer les zones » renvoyant vers l'écran Modules avec le nœud sélectionné (deep-link). L'aperçu SHALL NE JAMAIS déformer (fini le cadre 16:9 imposé).

#### Scenario: Aperçu fidèle puis renvoi
- **GIVEN** un 7-erreurs avec source panoramique (2:1) et 3 zones, volet détail étroit
- **WHEN** l'auteur regarde le détail puis touche « Éditer les zones »
- **THEN** l'aperçu est panoramique réduit avec les 3 zones au bon endroit, puis l'écran Modules s'ouvre sur ce nœud
