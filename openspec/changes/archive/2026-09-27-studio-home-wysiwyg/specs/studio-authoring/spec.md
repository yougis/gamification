## ADDED Requirements

### Requirement: Canvas WYSIWYG de l'écran global

Quand la pseudo-sélection « écran global — Accueil » est active, le panneau central SHALL afficher `PhoneCanvas` lié à `global.screen` (et non à un nœud) avec les mêmes capacités que les étapes : zones header/content/footer/overlay (création au clic fantôme, suppression sauf content), widgets texte/image/bouton/progression/module/espacement (ajout, édition en place, drag inter-zones, suppression), sélecteur de viewport, annulation par undo via les opérations nommées (`setGlobalScreen` et ajouts calqués sur les nœuds). Un bandeau SHALL signaler « écran global — défaut des étapes ». Quitter la pseudo-sélection SHALL restaurer le canvas du nœud sans perte.

#### Scenario: Édition du fond global au canvas

- **GIVEN** l'entrée Accueil sélectionnée, écran global vide
- **WHEN** l'auteur ajoute un widget texte « Bienvenue » dans le header
- **THEN** `global.screen.zones.header` porte le widget (annulable par undo) et les étapes sans screen propre l'héritent

#### Scenario: Retour au nœud sans perte

- **GIVEN** l'écran global édité puis un nœud sélectionné
- **WHEN** le canvas bascule
- **THEN** l'écran du nœud s'affiche avec ses données intactes, l'écran global est conservé tel quel

### Requirement: Héritage visible des styles globaux du jeu

Le canvas de l'écran global SHALL résoudre et afficher `global.screen.styles` comme base de style (police, taille, graisse, couleur, alignement), avec les mêmes témoins d'héritage que les étapes (badges Global/Écran/Widget) : sur l'écran global, « Global » désigne les styles du jeu et « Écran » l'écran global lui-même. Renseigner surcharge, effacer retombe sur l'héritage — sémantique inchangée.

#### Scenario: Surcharge lisible

- **GIVEN** `global.screen.styles: { fontSize: 14 }`
- **WHEN** l'auteur ouvre la section style de l'écran global
- **THEN** 14 s'affiche comme base (badge Global), modifiable en surcharge d'écran

### Requirement: Blocs d'accès en aperçu dérivé

Le rendu de l'écran global SHALL montrer, en lecture seule, les accès transverses du joueur dérivés des présentations actives : carte (si `MAP` configurée), boîte à outils (si `TOOLBOX` + objets, même règle que l'icône persistante), messages d'info du jeu. Ces blocs SHALL refléter la configuration temps réel (cocher `MAP` les fait apparaître) et SHALL n'offrir aucune édition (clic = rappel « dérivé », pas de sélection persistante). Ils SHALL suivre la charte UX du canvas (cartes, puces, typographie du Studio).

#### Scenario: Carte et inventaire visibles

- **GIVEN** un jeu avec `MAP` + `TOOLBOX` et 3 objets, écran global affiché
- **WHEN** l'auteur regarde le canvas
- **THEN** un bloc carte et un bloc boîte à outils (3 objets) s'affichent en lecture seule avec la même charte que le reste

#### Scenario: Accès absent sans configuration

- **GIVEN** un jeu sans `MAP`
- **WHEN** l'auteur regarde le canvas global
- **THEN** aucun bloc carte n'apparaît, sans erreur ni emplacement vide
