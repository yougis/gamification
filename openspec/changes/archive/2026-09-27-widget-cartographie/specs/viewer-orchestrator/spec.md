## ADDED Requirements

### Requirement: Rendu joueur du widget carte

Le player (natif et PWA, via leurs renderers respectifs) SHALL rendre le widget `map` avec : le fond pack-only configuré (tuiles `global.map`, plan indoor actif, ou fond uni en repli) ; un marqueur par étape de la source (filtre `discovered` par défaut) avec l'icône de son état temps réel (`poiStyle` auteur ou défauts) ; les cercles de géofence (outdoor) ; la position du joueur et la trace GPX display quand disponibles. Le rendu SHALL rester lisible et jouable offline, sans jamais requérir le réseau.

#### Scenario: Carte offline complète

- **GIVEN** un pack vérifié avec tuiles et un widget carte (`source steps`, 3 POI découverts)
- **WHEN** le joueur ouvre l'écran sans réseau
- **THEN** fond, 3 marqueurs à leurs états, cercles et position s'affichent depuis les fichiers locaux

#### Scenario: Étape cachée absente côté joueur

- **GIVEN** le même écran avec un 4e nœud en discovery non révélée
- **WHEN** le joueur ouvre l'écran
- **THEN** aucun marqueur du 4e nœud n'apparaît

### Requirement: Sélection et volet passifs

Toucher un marqueur SHALL sélectionner le POI (état UI local) et afficher son volet (composé auteur ou défaut texte + bouton). Sélectionner, naviguer sur la carte et fermer le volet SHALL ne produire ni transition d'état ni event de progression. Le bouton `Ouvrir` SHALL présenter l'étape éligible (même présentation d'éligible existant) ; le bouton `Verrouillé` SHALL rester sans effet.

#### Scenario: Sélection sans effet moteur

- **GIVEN** un joueur sélectionnant un marqueur `LOCKED` puis fermant le volet
- **WHEN** le journal est consulté
- **THEN** aucun event n'a été émis et les états moteur sont inchangés

#### Scenario: Ouverture depuis le volet

- **GIVEN** un POI `UNLOCKED` sélectionné, aucune modale ACTIVE
- **WHEN** le joueur touche `Ouvrir`
- **THEN** l'écran de l'étape s'ouvre, sans event ajouté, avec la file FIFO inchangée

### Requirement: Widget carte plein écran depuis HOME

Depuis HOME, l'icône du widget carte SHALL ouvrir la carte en plein écran **à la place** de HOME (navigation, pas overlay) ; le retour SHALL se faire via l'entrée « Accueil » (le tableau de bord se réaffiche à l'identique). Un seul widget plein écran à la fois : en ouvrir un second SHALL remplacer le premier, sans file. Le plein écran SHALL être inaccessible pendant une modale ACTIVE d'épreuve (vues exclusives, comme les présentations). Ouvrir, naviguer et revenir SHALL ne produire ni transition ni event.

#### Scenario: Aller-retour plein écran

- **GIVEN** un joueur sur HOME sans modale ACTIVE
- **WHEN** il touche l'icône carte puis l'entrée « Accueil »
- **THEN** la carte plein écran s'affiche puis HOME revient à l'identique, sans event

#### Scenario: Plein écran verrouillé pendant une épreuve

- **GIVEN** un nœud ACTIVE (quiz en cours)
- **WHEN** le joueur tente d'ouvrir la carte plein écran
- **THEN** l'ouverture est refusée (ou l'icône est absente) et l'épreuve continue sans interruption
