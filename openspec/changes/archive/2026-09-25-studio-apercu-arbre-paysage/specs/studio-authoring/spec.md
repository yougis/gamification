## ADDED Requirements

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
