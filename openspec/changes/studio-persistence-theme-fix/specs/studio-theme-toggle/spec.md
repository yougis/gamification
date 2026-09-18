## ADDED Requirements

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
