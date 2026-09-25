## ADDED Requirements

### Requirement: Ajout d'objet référencé créant une ligne

Dans la famille inventaire de l'inspecteur, le bouton « Ajouter un objet référencé » SHALL créer immédiatement une ligne éditable (sélecteur d'objet vide) : l'auteur choisit ensuite l'objet, modifie son choix ou supprime la ligne. Cliquer le bouton SHALL toujours faire apparaître une ligne ; il ne SHALL jamais produire un tableau vide sans ligne.

#### Scenario: Premier ajout

- **GIVEN** une étape sans objet référencé
- **WHEN** l'auteur clique « Ajouter un objet référencé »
- **THEN** une ligne avec sélecteur apparaît, l'auteur y choisit « Clé », et le JSON porte `inventoryRef: ["cle"]`

#### Scenario: Ajouts successifs

- **GIVEN** une étape avec un objet référencé
- **WHEN** l'auteur clique à nouveau « Ajouter un objet référencé »
- **THEN** une seconde ligne vide apparaît sans effacer la première

### Requirement: Effets multiples par étape

Une étape SHALL accepter N effets (N ≥ 0) : ajouter, réordonner implicitement (ordre du tableau), modifier et supprimer chaque effet indépendamment. Le bouton d'ajout SHALL rester disponible quel que soit le nombre d'effets existants (zéro, un ou plusieurs), et non disparaître après le premier. Chaque effet SHALL être validé et exporté comme aujourd'hui.

#### Scenario: Deuxième effet

- **GIVEN** une étape avec un effet `GIVE_ITEM {cle}`
- **WHEN** l'auteur ajoute un effet `REVEAL_NODE {message_secret}`
- **THEN** les deux effets coexistent dans le JSON, éditables et supprimables séparément

### Requirement: Entrée MODE JEUX depuis le premier nœud

Lancer le terminal joueur (« ▶ Mode Jeux ») sans nœud actif SHALL ouvrir le premier nœud éligible du jeu (tête de file de la simulation) au lieu de la salle d'attente. Si aucun nœud n'est éligible, la salle d'attente existante SHALL s'afficher (comportement inchangé). L'enchaînement suivant (effectuer les modules, compléter, ouvrir le suivant) SHALL rester piloté par la file existante, sans transition d'état ajoutée.

#### Scenario: Lancement depuis le début

- **GIVEN** une simulation neuve dont la file propose `baker` en premier
- **WHEN** l'auteur lance « ▶ Mode Jeux » sans nœud actif
- **THEN** le terminal affiche directement l'écran de `baker`, prêt à jouer

#### Scenario: File vide inchangée

- **GIVEN** une simulation sans nœud éligible
- **WHEN** l'auteur lance « ▶ Mode Jeux »
- **THEN** la salle d'attente s'affiche comme aujourd'hui

### Requirement: Libellé d'essai sans suffixe

Le bouton de l'écran Prévisualiser SHALL s'intituler « Essai du parcours », sans le suffixe « (triche tracée) ». Le comportement (essai avec triche tracée et badge SIMULÉ) SHALL rester inchangé ; seul le libellé est simplifié.

#### Scenario: Libellé simplifié

- **GIVEN** l'écran Prévisualiser affiché
- **WHEN** l'auteur regarde les actions d'essai
- **THEN** le bouton affiche « Essai du parcours », et l'essai trace toujours la triche comme avant
