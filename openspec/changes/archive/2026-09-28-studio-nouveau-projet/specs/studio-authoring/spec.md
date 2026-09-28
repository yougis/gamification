## MODIFIED Requirements

### Requirement: Noeud START par defaut dans un jeu nouveau

Un jeu cree via `jeuVide()` (nouveau jeu vierge) SHALL contenir par defaut un noeud `start` de type `INFO` avec `isEnding: false` et une activation `{ requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] }` (convention du START de référence : déclencheur toujours vrai à l'ouverture, conforme au `minItems: 1` du schéma — « activation vide » est interdit par la couche 1). Ce noeud sert de point de depart pour l'auteur et garantit que le canvas n'est jamais vide a l'ouverture.

Le noeud `start` ne peut pas etre supprime tant qu'il est le seul noeud du jeu (meme logique que `isEnding` : un jeu sans noeud est inutilisable).

#### Scenario: Nouveau jeu avec noeud start
- **GIVEN** un auteur qui cree un nouveau jeu
- **WHEN** le jeu est initialise
- **THEN** le canvas contient un noeud `start` (type INFO) positionne au centre, et l'auteur peut commencer a le configurer

#### Scenario: Jeu vierge sans erreur auto-infligée
- **GIVEN** un jeu vierge issu de `jeuVide()`, sans intervention auteur
- **WHEN** la validation Draft-07 tourne
- **THEN** aucune erreur ne porte sur `nodes/0/activation/requires` ni sur `isEnding` absent (seules les erreurs « FIN manquante » subsistent, guidées par la checklist)

#### Scenario: Jeu importe sans noeud start
- **GIVEN** un fichier JSON importe sans aucun noeud
- **WHEN** l'import est charge dans le Studio
- **THEN** un noeud `start` est ajoute automatiquement (comportement identique a `jeuVide()`)

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 7 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter, Inventaire — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

Une barre globale SHALL afficher en permanence : le nom du jeu (champ auto-largeur suivant son contenu), son statut (`draft`/`reviewed`), les compteurs (nœuds, draft, reviewed), la pastille validation C1/C2, l'undo/redo sous forme d'icônes flèches et l'accès à l'export.

La barre globale SHALL exposer un bouton « Nouveau projet » à côté du nom du projet : action destructive (style `btn-danger`), confirmation explicite avant exécution, réinitialisant l'éditeur sur `jeuVide()` (brouillon local vidé, sélection et session réinitialisées). En lecture seule, le bouton SHALL être désactivé.

La navigation latérale SHALL être repliable en une colonne d'icônes sur grand écran, sans actions de création (la création vit dans la box des étapes et le rail replié). Le repli SHALL fonctionner dans les deux sens : le menu ouvert SHALL exposer un contrôle « Replier le menu » (chevron, même logique icône + tooltip que les autres panneaux) et le rail replié SHALL exposer le contrôle « Déplier le menu ». L'état SHALL persister en localStorage et être restauré au chargement.

Le détail de validation (verdicts C1/C2, listes d'erreurs, impasses navigables) SHALL vivre exclusivement dans l'écran Valider. Le Composer SHALL ne jamais afficher de liste d'erreurs détaillée : il affiche uniquement une pastille compacte d'état (ex. `⚠ N problèmes` / `✓ Valide`), cliquable vers l'écran Valider.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

#### Scenario: Nouveau projet avec confirmation
- **GIVEN** un jeu de 5 nœuds affiché dans le Studio
- **WHEN** l'auteur active « Nouveau projet », confirme, puis annule (undo)
- **THEN** l'éditeur affiche le jeu vierge (`start` unique), puis undo restaure les 5 nœuds

#### Scenario: Nouveau projet refusé
- **GIVEN** un jeu de 5 nœuds affiché dans le Studio
- **WHEN** l'auteur active « Nouveau projet » puis refuse la confirmation
- **THEN** le jeu est strictement inchangé (aucune entrée d'historique ajoutée)

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
