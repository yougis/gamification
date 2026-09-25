## MODIFIED Requirements

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 6 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

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

## ADDED Requirements

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
