## ADDED Requirements

### Requirement: Surimpression fermable (terminal simulé)

Constat de périmètre : aucun player (natif, PWA, shared Compose) ne rend aujourd'hui les `ScreenDefinition` — le terminal joueur simulé du Studio est le seul renderer d'écrans. Le contrat ci-dessous y est implémenté ; le renderer natif/PWA le reprendra dans un change dédié.

Quand la zone `overlay` d'un écran porte `fermable: true`, le terminal simulé SHALL permettre au joueur de masquer la surimpression par clic sur son fond semi-transparent. L'écran dessous SHALL rester jouable (renderer déjà interactif ; aucune transition d'état, aucun event dédié, aucune complétion implicite). Une icône « message » persistante (chrome player, glyphe fixe teinté branding) SHALL être visible tant que l'overlay est masquée ; son activation SHALL réafficher l'overlay avec son état conservé (mémoire session, non persistée : à la reprise l'overlay revient affichée). Masquer et réafficher SHALL être libres et illimités. Sans `fermable` (défaut), le clic sur le fond SHALL ne rien masquer.

#### Scenario: Masquage au clic-fond, écran jouable

- **GIVEN** un Nœud ACTIVE avec overlay `fermable: true` par-dessus un quiz en cours
- **WHEN** le joueur clique le fond de la surimpression
- **THEN** l'overlay se masque, le quiz reste jouable, le Nœud reste ACTIVE, aucun event n'est journalisé

#### Scenario: Réouverture par l'icône message

- **GIVEN** le même Nœud avec l'overlay masquée (saisie en cours dans la carte)
- **WHEN** le joueur touche l'icône « message »
- **THEN** l'overlay réapparaît avec sa saisie conservée, toujours sans transition d'état

#### Scenario: Non fermable inchangé

- **GIVEN** un Nœud avec overlay sans `fermable`
- **WHEN** le joueur clique le fond de la surimpression
- **THEN** rien ne se masque et aucune icône « message » n'apparaît

#### Scenario: Reprise avec overlay affichée

- **GIVEN** une session où l'overlay `fermable: true` était masquée au kill
- **WHEN** le joueur reprend avec le même `sessionId`
- **THEN** l'overlay est affichée (état propre), la progression moteur est restaurée
