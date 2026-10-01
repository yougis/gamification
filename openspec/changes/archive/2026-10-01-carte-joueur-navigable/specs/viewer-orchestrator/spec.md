## MODIFIED Requirements

### Requirement: Rendu joueur du widget carte

Le player (natif et PWA, via leurs renderers respectifs) SHALL rendre le widget `map` avec : le fond pack-only configuré (tuiles `global.map`, plan indoor actif, ou fond uni en repli) ; un marqueur par étape de la source (filtre `discovered` par défaut) avec l'icône de son état temps réel (`poiStyle` auteur ou défauts) ; les cercles de géofence (outdoor) ; la position du joueur et la trace GPX display quand disponibles. Le rendu SHALL rester lisible et jouable offline, sans jamais requérir le réseau.

La position du joueur SHALL être alimentée par la source de localisation de la plateforme (`LocationProvider` natif, Geolocation côté PWA) et affichée comme point distinct des marqueurs, avec recentrage optionnel. Sans position (GPS coupé, permission refusée, stub), la carte SHALL rester complète et navigable, sans erreur ni état bloquant.

#### Scenario: Carte offline complète

- **GIVEN** un pack vérifié avec tuiles et un widget carte (`source steps`, 3 POI découverts)
- **WHEN** le joueur ouvre l'écran sans réseau
- **THEN** fond, 3 marqueurs à leurs états, cercles et position s'affichent depuis les fichiers locaux

#### Scenario: Étape cachée absente côté joueur

- **GIVEN** le même écran avec un 4e nœud en discovery non révélée
- **WHEN** le joueur ouvre l'écran
- **THEN** aucun marqueur du 4e nœud n'apparaît

#### Scenario: Position GPS affichée

- **GIVEN** un joueur géolocalisé ouvrant un écran avec widget carte
- **WHEN** la position est disponible
- **THEN** un point distinct des marqueurs indique la position, déplaçable par recentrage, sans produire d'event

#### Scenario: GPS indisponible sans blocage

- **GIVEN** un joueur sans GPS (permission refusée) ouvrant le même écran
- **WHEN** la carte s'affiche
- **THEN** marqueurs, cercles et navigation restent complets, aucun message d'erreur bloquant

## ADDED Requirements

### Requirement: Carte joueur navigable

Le widget carte joueur SHALL être navigable : déplacement par glisser, zoom par pincement ET par boutons +/- (accessibilité tactile et desktop), recentrage sur la position ou sur l'emprise des POI. Le viewport SHALL être un état UI strictement local (comme la sélection) : panorer, zoomer, recentrer SHALL ne produire ni transition d'état ni event de progression. Le volet du POI sélectionné SHALL suivre (ancré au marqueur ou panneau) sans jamais déclencher de mécanique de complétion ou de score (strate 2 inchangée).

#### Scenario: Pan et zoom sans effet moteur

- **GIVEN** un joueur déplaçant et zoomant la carte puis sélectionnant un marqueur
- **WHEN** le journal est consulté
- **THEN** aucun event n'a été émis et les états moteur sont inchangés

#### Scenario: Zoom boutons accessible

- **GIVEN** un joueur sans geste pincement (desktop, accessibilité)
- **WHEN** il utilise les boutons +/-
- **THEN** le zoom s'applique par paliers, recentré sur le centre de vue, sans event
