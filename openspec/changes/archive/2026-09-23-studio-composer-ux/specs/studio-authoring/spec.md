## MODIFIED Requirements

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 6 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

Une barre globale SHALL afficher en permanence : le nom du jeu, son statut (`draft`/`reviewed`), l'indicateur de validation C1/C2, l'undo/redo et l'accès à l'export.

La navigation latérale SHALL être repliable en une colonne d'icônes sur grand écran, avec accès direct aux actions de création (Étape, Lieu, Tirage, Fin) dans l'état replié.

Le détail de validation (verdicts C1/C2, listes d'erreurs, impasses navigables) SHALL vivre exclusivement dans l'écran Valider. Le Composer SHALL ne jamais afficher de liste d'erreurs détaillée : il affiche uniquement une pastille compacte d'état (ex. `⚠ N problèmes` / `✓ Valide`), cliquable vers l'écran Valider.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

#### Scenario: Menu replié avec actions de création
- **GIVEN** le Studio en mode grand écran avec le menu latéral replié
- **WHEN** l'auteur regarde la barre latérale
- **THEN** les boutons de création (Étape, Lieu, Tirage, Fin) sont visibles en tant qu'icônes cliquables, même sans nœud sélectionné

#### Scenario: Pastille compacte vers Valider
- **GIVEN** un jeu avec 3 erreurs de validation affiché dans le Composer
- **WHEN** l'auteur regarde le Composer
- **THEN** aucune liste d'erreurs n'est affichée, seule une pastille `⚠ 3 problèmes` est visible
- **WHEN** l'auteur clique la pastille
- **THEN** l'écran Valider s'ouvre avec le détail des 3 erreurs

## ADDED Requirements

### Requirement: Repli en cascade des panneaux du Composer

Le Composer SHALL appliquer une règle de repli unique : le graphe se rétracte vers la gauche (contre la navigation), la liste et le détail se rétractent vers la droite. Un panneau replié SHALL laisser un rail fin à son emplacement et les panneaux voisins SHALL s'étendre ; quand liste et détail sont repliés, leurs rails SHALL s'empiler à droite dans l'ordre (liste puis détail).

La commande de repli SHALL être un chevron ancré au bord du panneau, dont le sens indique la direction du mouvement (`>` sur le bord droit d'un panneau ouvert, `<` sur son rail pour déplier). Aucun bouton texte « Replier » / « Déplier » / « Détail » ne SHALL exister dans le Composer.

Le rail replié SHALL afficher la seule icône du panneau avec un tooltip (« Liste des étapes — cliquer pour déplier »), selon la même logique icône + tooltip que la navigation des écrans et les tabs de l'Inspecteur. Aucun menu « molette » (engrenage) ne SHALL exister dans le Composer.

Les actions de réglage autrefois dans la molette SHALL être relocalisées : Recentrer/Aligner vers une mini-toolbar flottante contextuelle du graphe (Aligner reste désactivé si moins de 2 nœuds sélectionnés), réinitialisation des largeurs vers un double-clic sur le Splitter (découvrable via tooltip). L'état replié/déplié SHALL persister en localStorage.

#### Scenario: Cascade liste puis détail
- **GIVEN** le Composer avec graphe, liste et détail ouverts
- **WHEN** l'auteur replie la liste puis le détail
- **THEN** deux rails `[L][D]` s'empilent à droite dans cet ordre et le graphe occupe l'espace libéré

#### Scenario: Chevron directionnel
- **GIVEN** le panneau détail ouvert
- **WHEN** l'auteur regarde son bord droit
- **THEN** un chevron `>` est visible (le contenu partira à droite)
- **WHEN** l'auteur clique le chevron puis regarde le rail
- **THEN** le rail affiche l'icône du panneau et un chevron `<` (le contenu reviendra)

#### Scenario: Rail icon-only avec tooltip
- **GIVEN** la liste repliée en rail
- **WHEN** l'auteur survole le rail
- **THEN** un tooltip « Liste des étapes — cliquer pour déplier » s'affiche, sans aucun label texte permanent

#### Scenario: Persistance du repli
- **GIVEN** un Composer avec la liste repliée
- **WHEN** l'auteur recharge la page
- **THEN** la liste est toujours repliée, le graphe et le détail inchangés

### Requirement: Pastille validation dans le Composer

Le Composer SHALL afficher une pastille compacte d'état de validation dans la barre d'outils du graphe : `✓ Valide` si aucune erreur, `⚠ N problèmes` sinon (N = nombre total d'erreurs C1 + C2). La pastille SHALL être cliquable vers l'écran Valider et SHALL porter un tooltip explicite (« Voir le détail dans Valider »).

La pastille ne SHALL jamais afficher le détail des erreurs (messages, nœuds fautifs, impasses) — ce détail vit exclusivement dans l'écran Valider.

#### Scenario: Pastille verte sans erreur
- **GIVEN** un jeu valide affiché dans le Composer
- **WHEN** l'auteur regarde la barre d'outils du graphe
- **THEN** la pastille affiche `✓ Valide`

#### Scenario: Pastille cliquable avec erreurs
- **GIVEN** un jeu avec 2 erreurs C2 affiché dans le Composer
- **WHEN** l'auteur clique la pastille `⚠ 2 problèmes`
- **THEN** l'écran Valider s'ouvre avec les 2 erreurs groupées par catégorie

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
