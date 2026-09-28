## ADDED Requirements

### Requirement: Arbre de l'écran global dans le volet des étapes

Quand `HOME` est présent, l'entrée « écran global — Accueil » du volet des étapes SHALL exposer un sous-arbre repliable des éléments de son écran, avec les mêmes modalités que les étapes : zones présentes dans l'ordre d'affichage (en-tête, contenu, pied de page, surimpression, fantômes exclus), puis widgets de chaque zone (type + libellé court, `map` libellé « carte »). L'arbre SHALL être replié par défaut et son état SHALL rester local, jamais persisté.

#### Scenario: Dépliage de l'arbre global

- **GIVEN** le volet des étapes avec un écran global (header + content avec carte)
- **WHEN** l'auteur déplie le sous-arbre de l'entrée Accueil
- **THEN** les zones header et content apparaissent, avec le widget carte sous content

### Requirement: Sélection arbre global vers le détail

Sélectionner une zone ou un widget de l'arbre global SHALL produire la même sélection que le clic canvas : pseudo-sélection Accueil + zone/widget, panneau détail affiché avec ses propriétés, canvas centré sur l'écran global. Sélectionner un nœud SHALL désélectionner l'arbre global et inversement (pseudo-sélection exclusive inchangée).

#### Scenario: Widget carte vers le détail

- **GIVEN** le sous-arbre global déplié avec un widget carte dans content
- **WHEN** l'auteur clique l'entrée du widget carte
- **THEN** le widget est sélectionné (surligné dans le canvas Screen) et le panneau de droite affiche ses propriétés carte

### Requirement: Pas de visuel d'écran dans le volet Étape

Le volet des étapes SHALL ne jamais rendre de visuel d'écran (ni PhoneCanvas ni mini-aperçu) : l'entrée Accueil n'expose que l'arbre. Le bouton « Ouvrir » historique de l'entrée SHALL être supprimé (l'ouverture d'étape se fait depuis le graphe, la liste ou la prévisualisation). Le volet Screen (WYSIWYG) et la prévisualisation SHALL rester inchangés, avec un rendu identique entre eux.

#### Scenario: Entrée sans visuel

- **GIVEN** l'entrée Accueil affichée avec un écran global composé
- **WHEN** l'auteur regarde le volet des étapes
- **THEN** aucun rendu d'écran n'apparaît, seul l'arbre repliable est proposé ; le volet Screen montre toujours le rendu WYSIWYG
