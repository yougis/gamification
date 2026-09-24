## MODIFIED Requirements

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 6 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

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

#### Scenario: Menu replié avec actions de création
- **GIVEN** le Studio en mode grand écran avec le menu latéral replié
- **WHEN** l'auteur regarde la barre latérale
- **THEN** les boutons de création (Étape, Lieu, Tirage, Fin) sont visibles en tant qu'icônes cliquables, même sans nœud sélectionné

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

### Requirement: Toolbar graphe conditionnelle à la vue

Recentrer / Aligner H / Aligner V SHALL être intégrés aux contrôles natifs ReactFlow du canvas (`Controls` + `ControlButton`, bouton fit natif pour Recentrer). Aucune toolbar flottante custom ne SHALL exister sur le panneau graphe : seul le chevron de repli reste en overlay. Dans les vues carte et screen, les contrôles natifs restent disponibles selon leur sens (Recentrer sans objet hors canvas). La règle d'activation Aligner (désactivé si moins de 2 nœuds sélectionnés, tooltip explicatif) SHALL être inchangée.

#### Scenario: Aligner masqué en vue carte
- **GIVEN** le panneau graphe ouvert en vue carte
- **WHEN** l'auteur regarde les contrôles natifs
- **THEN** Recentrer et Aligner sont absents, le chevron de repli reste visible

#### Scenario: Aligner présent en vue graphe
- **GIVEN** le panneau graphe ouvert en vue graphe avec 1 nœud sélectionné
- **WHEN** l'auteur regarde les contrôles natifs
- **THEN** Recentrer, Aligner H et Aligner V sont visibles, Aligner désactivés avec le tooltip de sélection

### Requirement: Pastille validation dans le Composer

Le Composer SHALL afficher une pastille compacte d'état de validation dans la barre globale de l'application (à côté du nom du jeu et des compteurs) : `✓ Valide` si aucune erreur, `⚠ N problèmes` sinon (N = nombre total d'erreurs C1 + C2). La pastille SHALL être cliquable vers l'écran Valider et SHALL porter un tooltip explicite (« Voir le détail dans Valider »).

La pastille ne SHALL jamais afficher le détail des erreurs (messages, nœuds fautifs, impasses) — ce détail vit exclusivement dans l'écran Valider. Le rail du graphe replié conserve sa pastille (navigation sans déplier).

#### Scenario: Pastille verte sans erreur
- **GIVEN** un jeu valide affiché dans le Composer
- **WHEN** l'auteur regarde la barre globale
- **THEN** la pastille affiche `✓ Valide`

#### Scenario: Pastille cliquable avec erreurs
- **GIVEN** un jeu avec 2 erreurs C2 affiché dans le Composer
- **WHEN** l'auteur clique la pastille `⚠ 2 problèmes`
- **THEN** l'écran Valider s'ouvre avec les 2 erreurs groupées par catégorie

### Requirement: Barre d'outils de création dans la liste

Les 4 actions de création (Étape de jeu, Lieu GPS, Tirage au sort, Fin du jeu) SHALL vivre à un seul endroit : en haut de la box des étapes (`NodeList`), visibles en permanence indépendamment de la sélection de nœud. Aucun doublon ne SHALL exister dans les mémos App ni dans la navigation repliée ; les icônes du rail replié (accès état replié) sont l'unique exception admise.

#### Scenario: Création depuis la liste
- **GIVEN** l'auteur dans l'onglet "Liste" du Composer
- **WHEN** il clique sur "Lieu GPS" dans la barre d'outils
- **THEN** un nouveau nœud de type INFO avec condition GEOFENCE est créé, sélectionné, et la vue bascule vers l'inspecteur

#### Scenario: Barre visible sans sélection
- **GIVEN** l'onglet "Liste" actif sans nœud sélectionné
- **WHEN** l'auteur regarde la barre d'outils
- **THEN** les 4 boutons de création sont visibles et cliquables

#### Scenario: Point d'entrée unique
- **GIVEN** le Composer avec tous les panneaux ouverts
- **WHEN** l'auteur cherche où créer une étape
- **THEN** un seul groupe de 4 boutons existe (haut de la box des étapes), hors rail replié

### Requirement: Prévisualisation traçée

L'écran Prévisualiser SHALL offrir un mode pas-à-pas (avance/retour nœud par nœud) et un panneau de triche regroupant bypass capteurs, `forceDraw` par branche, injection de `sessionId` et `forceHoldLock`/`forceHoldExit`.

Tout event simulé SHALL porter visuellement le flag triche (badge distinct, ex. "SIMULÉ") plus l'état HOLD courant : un event simulé ne SHALL jamais ressembler à un event réel dans les logs affichés.

Un bouton dédié SHALL relancer la fixture neutre 1/5→FIN en un clic avec résultat pass/fail immédiat.
Un rappel permanent SHALL indiquer que la prévisualisation n'écrit jamais dans le JSON source.

Le mode « Jeux » plein écran SHALL afficher le terminal joueur simulé : l'écran du Nœud ACTIVE, résolu global → Nœud et rendu en lecture seule (édition et sélection désactivées, zones fantômes masquées), avec le renderer joueur du Module quand le registre en déclare un, sinon un état non bloquant proposant la sortie par triche (terminer/abandonner). Valider dans le renderer joueur SHALL produire les mêmes transitions que le simulateur (Nœud COMPLETED, effets appliqués, event SIMULÉ journalisé). Terminer (triche ou validation jouée) SHALL rouvrir automatiquement le Nœud ACTIVE suivant éligible au lieu de retomber sur l'attente. Le changement d'écran SHALL suivre le Nœud ACTIVE selon la file FIFO (1 modale max) ; la sortie du mode (Échap ou bouton) SHALL restaurer la vue auteur sans perdre l'état de simulation.

#### Scenario: Event simulé distinct d'un event réel

- **GIVEN** une session de prévisualisation avec bypass capteurs actif
- **WHEN** l'auteur consulte les logs affichés
- **THEN** chaque event simulé porte le badge "SIMULÉ" et aucun ne peut être confondu avec un event réel

#### Scenario: Écran du Nœud ACTIVE en plein écran

- **GIVEN** une session avec le Nœud `baker` (Module QUIZ) ACTIVE et le mode « Jeux » ouvert
- **WHEN** le terminal simulé s'affiche
- **THEN** l'écran `quiz-focus` de `baker` est rendu en lecture seule avec le quiz interactif, sans contrôles d'édition

#### Scenario: Validation jouée fait progresser la simulation

- **GIVEN** le quiz de `baker` affiché dans le terminal simulé
- **WHEN** l'auteur répond et valide
- **THEN** `baker` passe COMPLETED, ses effets sont appliqués et un event SIMULÉ est journalisé, comme via « Terminer »

#### Scenario: Terminer avance au suivant

- **GIVEN** le mode « Jeux » ouvert avec `baker` ACTIVE puis terminé (triche ou validation jouée), un Nœud suivant éligible existant
- **WHEN** la complétion est enregistrée
- **THEN** le terminal affiche l'écran du Nœud ACTIVE suivant sans repasser par l'attente

#### Scenario: Changement d'écran piloté par le moteur

- **GIVEN** le mode « Jeux » ouvert et deux Nœuds éligibles en file FIFO
- **WHEN** le Nœud ACTIVE est terminé
- **THEN** le terminal affiche l'écran du Nœud ACTIVE suivant, jamais deux écrans à la fois

#### Scenario: Module sans renderer joueur non bloquant

- **GIVEN** un Nœud ACTIVE dont le Module ne déclare aucun renderer joueur
- **WHEN** le terminal simulé affiche ce Nœud
- **THEN** un état explicite propose terminer/abandonner par triche et la simulation continue

#### Scenario: Sortie du mode sans perte

- **GIVEN** le mode « Jeux » ouvert en cours de session simulée
- **WHEN** l'auteur appuie sur Échap ou le bouton de sortie
- **THEN** la vue auteur est restaurée avec file, tirages et journal inchangés
