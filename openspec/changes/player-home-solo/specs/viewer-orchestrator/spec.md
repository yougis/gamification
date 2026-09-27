## ADDED Requirements

### Requirement: Mode Jeux lançable sans étape quand HOME est actif

Lancer le terminal joueur (« ▶ Mode Jeux ») SHALL être possible même sans nœud actif ni file quand `HOME` figure dans `presentation` : le terminal s'ouvre alors directement sur le tableau de bord (temps écoulé, zéro POI, pas de proposition d'ouverture). Sans `HOME`, le bouton reste désactivé sans actif ni file (comportement inchangé).

#### Scenario: Lancement HOME-seul

- **GIVEN** un jeu avec `presentation: ["HOME"]`, `nodes: []`, aucune simulation active
- **WHEN** l'auteur lance « ▶ Mode Jeux »
- **THEN** le terminal affiche le tableau (temps qui tourne, aucun POI), sans erreur

#### Scenario: Sans HOME ni file, toujours désactivé

- **GIVEN** un jeu avec `presentation: ["MAP"]`, sans nœud actif ni file
- **WHEN** l'auteur regarde le bouton « ▶ Mode Jeux »
- **THEN** il est désactivé comme aujourd'hui

### Requirement: Session sans fin assumée

Un jeu HOME-seul (aucun `isEnding`) SHALL tourner sans terminaison : aucune transition de fin n'est attendue, aucun event de fin n'est émis. La sortie SHALL se faire par Quitter (player) / fermeture du terminal (Studio), avec reprise exacte sur le même `sessionId`. Le journal SHALL mentionner la session sans fin au démarrage pour éviter toute attente de terminaison.

#### Scenario: Pas de fin attendue

- **GIVEN** une partie HOME-seule en cours
- **WHEN** le joueur consulte l'état de partie
- **THEN** aucun compte à rebours de fin ni écran de fin n'est annoncé ; Quitter reprend à l'identique
