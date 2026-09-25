## MODIFIED Requirements

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 7 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter, Inventaire — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

Une barre globale SHALL afficher en permanence : le nom du jeu (champ auto-largeur suivant son contenu), son statut (`draft`/`reviewed`), les compteurs (nœuds, draft, reviewed), la pastille validation C1/C2, l'undo/redo sous forme d'icônes flèches et l'accès à l'export.

La navigation latérale SHALL être repliable en une colonne d'icônes sur grand écran, sans actions de création (la création vit dans la box des étapes et le rail replié).

Le détail de validation (verdicts C1/C2, listes d'erreurs, impasses navigables) SHALL vivre exclusivement dans l'écran Valider. Le Composer SHALL ne jamais afficher de liste d'erreurs détaillée : il affiche uniquement une pastille compacte d'état (ex. `⚠ N problèmes` / `✓ Valide`), cliquable vers l'écran Valider.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

#### Scenario: Menu replié sans création
- **GIVEN** le Studio en mode grand écran avec le menu latéral replié
- **WHEN** l'auteur regarde la barre latérale
- **THEN** seuls les écrans sont visibles en tant qu'icônes cliquables ; la création se fait dans la box des étapes ou le rail replié

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

## ADDED Requirements

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
