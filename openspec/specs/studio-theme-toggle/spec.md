## Purpose

Permet à l'auteur du Studio de basculer entre un thème sombre (par défaut) et un thème clair, améliorant l'ergonomie en environnement peu lumineux et la lisibilité des couleurs de branding.

## Requirements

### Requirement: Bascule sombre/clair dans la barre globale

Le Studio SHALL afficher un bouton de bascule thème dans la barre globale (header). Le bouton SHALL afficher une icône de soleil (thème sombre actif) ou de lune (thème clair actif) et permettre de basculer en un clic.

Le thème sélectionné SHALL être persisté dans `localStorage` sous la clé `studio-theme`. Au chargement du Studio, le thème est restauré depuis `localStorage`. Si aucune valeur n'est présente, le thème sombre est appliqué par défaut.

#### Scenario: Bascule vers le thème clair
- **GIVEN** le Studio affiche le thème sombre (par défaut)
- **WHEN** l'auteur clique sur le bouton de bascule thème
- **THEN** le thème clair est appliqué (fonds clairs, textes sombres), l'icône du bouton change de lune à soleil, et `localStorage` est mis à jour avec `studio-theme: "light"`

#### Scenario: Restauration du thème au chargement
- **GIVEN** l'auteur a sélectionné le thème clair lors d'une session précédente
- **WHEN** le Studio est rechargé
- **THEN** le thème clair est restauré depuis `localStorage` et l'icône du bouton affiche une lune

### Requirement: Variables CSS thème clair

Le thème clair SHALL redéfinir les variables CSS de `theme.css` via la classe `.theme-light` sur l'élément `<html>`. Les variables redéfinies SHALL inclure au minimum :

- `--surface`, `--surface-2`, `--surface-3` : fonds clairs
- `--ink`, `--ink-2`, `--ink-3` : textes sombres
- `--line`, `--line-forte` : bordures visibles sur fond clair

Le thème clair SHALL conserver les variables d'accent, d'alerte et de tirage inchangées (l'auteur doit reconnaître son branding).

#### Scenario: Application du thème clair
- **GIVEN** le thème clair est sélectionné
- **WHEN** le Studio affiche l'interface
- **THEN** les fonds sont clairs (ex. `#fafafa`), les textes sont sombres (ex. `#1a1a1a`), et les accents restent identiques au thème sombre

#### Scenario: Thème clair sans altération du branding
- **GIVEN** un jeu avec `branding.primaryColor: "#ff4400"`
- **WHEN** le thème clair est appliqué
- **THEN** la couleur primaire `#ff4400` n'est pas affectée

### Requirement: Persistance du choix de thème

Le choix de thème SHALL persister uniquement dans `localStorage`, jamais dans le JSON du jeu ni dans une base de données distante. Le choix de thème SHALL être un préférence UI locale, jamais synchronisée.

#### Scenario: Persistance locale uniquement
- **GIVEN** l'auteur bascule vers le thème clair
- **WHEN** l'export du jeu est généré
- **THEN** le JSON exporté ne contient aucune référence au thème sélectionné

### Requirement: Accessibilité du bouton de bascule

Le bouton de bascule thème SHALL respecter les contraintes d'accessibilité du Studio :
- taille minimale de toucher 44px
- aria-label explicite (« Basculer en mode clair » ou « Basculer en mode sombre »)
- focus visible
- contraste de couleur suffisant sur les deux thèmes

#### Scenario: Accessibilité du bouton
- **GIVEN** le Studio affiche le thème sombre
- **WHEN** l'auteur navigue au clavier jusqu'au bouton de bascule
- **THEN** le bouton est visible, focusable, et porte un aria-label décrivant l'action

### Requirement: Couverture totale du thème clair

Le thème clair SHALL couvrir la totalité de l'interface visible, sans zone laissée en couleurs sombres. En plus des variables existantes (`--surface*`, `--ink*`, `--line*`), le mode clair SHALL redéfinir :

- les nœuds du graphe ReactFlow : fond clair, texte sombre, bordure visible ;
- les libellés d'arêtes et les arêtes (couleur lisible sur fond clair, sélection toujours accentuée) ;
- le fond du canvas graphe, les contrôles et la minimap ;
- tout token Tailwind à valeur sombre codée en dur (`bg-canvas`, `bg-panel`, `bg-surface*`, `text-snow`, `text-fog`, `border-rule`, etc.) : chaque token SHALL résoudre une valeur claire sous `.theme-light`.

Le branding du jeu (`branding.primaryColor`, couleurs de modules, `experienceStyle`) SHALL rester inchangé par le basculement de thème.

#### Scenario: Graphe entièrement clair
- **WHEN** l'auteur bascule en thème clair avec un jeu de 5 nœuds affiché dans le graphe
- **THEN** le fond du canvas est clair, chaque nœud a un fond clair avec texte sombre lisible, et les arêtes restent visibles

#### Scenario: Tokens Tailwind adaptés
- **WHEN** le thème clair est actif
- **THEN** aucun panneau, bouton ou bordure n'affiche les couleurs sombres `#08090b`, `#111318`, `#181c24` ni le texte `#e8eaed` en dehors du branding jeu

#### Scenario: Bascule aller-retour sans régression sombre
- **WHEN** l'auteur bascule clair puis revient en sombre
- **THEN** le thème sombre est pixel-identique à l'état avant bascule (fonds `#08090b`/`#111318`, textes `#e8eaed`)

### Requirement: Nœuds et arêtes ReactFlow thématisés

Les styles par défaut de ReactFlow (nœuds blancs, arêtes sombres) ne SHALL plus être utilisés bruts : le Studio SHALL piloter explicitement le mode couleur du graphe (`colorMode` lié au thème) et styler nœuds, arêtes et libellés via les variables CSS du thème, de sorte que le graphe suive le basculement sombre/clair comme le reste de l'interface.

#### Scenario: Nœuds suivent le thème
- **WHEN** l'auteur bascule de sombre vers clair avec des nœuds sélectionnés et non sélectionnés
- **THEN** les nœuds sélectionnés gardent leur anneau de sélection visible et les nœuds non sélectionnés restent distinguables (brouillon, tirage, fin)

### Requirement: Textes des écrans lisibles sur tout fond et tout thème

Tout texte d'écran sans couleur explicite (canvas WYSIWYG, terminal joueur simulé) SHALL être lisible quel que soit le thème du Studio et le fond de l'écran : sans fond coloré, le texte hérite du thème actif (sombre→clair, clair→sombre) ; sur fond de couleur posée par le jeu (templates `quiz-focus`, puzzle, cadenas, écran par défaut `#1a1a2e`), le texte SHALL prendre une couleur à contraste calculé (fond sombre→texte clair, fond clair→texte sombre). Une couleur explicite posée par l'auteur (widget, branding) SHALL rester verbatim et prime sur tout calcul. Aucun texte d'écran SHALL rester figé sur une couleur codée en dur d'un seul thème.

#### Scenario: Template sombre en thème clair

- **GIVEN** un nœud QUIZ (fond template `#14141f`, textes sans couleur explicite) affiché en thème clair
- **WHEN** le canvas rend l'écran
- **THEN** les textes sont clairs et lisibles sur le fond sombre (pas de texte sombre sur fond sombre)

#### Scenario: Sans fond, suivi du thème

- **GIVEN** un écran sans fond coloré affiché en thème sombre puis clair
- **WHEN** l'auteur bascule de thème
- **THEN** les textes suivent le thème (clairs puis sombres) par héritage

#### Scenario: Couleur auteur conservée

- **GIVEN** un widget texte avec une couleur explicite `#ff4400`
- **WHEN** le canvas rend l'écran sur n'importe quel fond et thème
- **THEN** ce texte garde `#ff4400` (choix auteur), tout le reste suit la règle
