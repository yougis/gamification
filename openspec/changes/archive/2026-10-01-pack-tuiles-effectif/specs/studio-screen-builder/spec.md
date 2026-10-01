## MODIFIED Requirements

### Requirement: Fonds pack-only interchangeables

`MapWidget.background` SHALL valoir `"pack-tiles"` (défaut, tuiles pré-chargées `global.map`), `"indoor-plan"` (plan actif `global.indoorPlans`, jeux indoor) ou `"solid"` (fond uni). Toute source réseau (URL de tuiles, fond distant) SHALL être rejetée : les fonds sont des assets du pack (manifest SHA-256) ou le fallback uni. Sans tuiles ni plan, le widget SHALL rendre le fond uni avec marqueurs et position, exactement comme la carte standalone.

L'interdiction porte sur les DONNÉES du jeu (le JSON ne contient jamais d'URL de tuiles) : elle n'interdit pas à la prévisualisation auteur d'afficher des tuiles chargées en ligne à des fins de contrôle visuel. Quand un pack actif existe, l'aperçu auteur SHALL afficher les tuiles (source d'aperçu du Studio, en ligne) avec un badge « aperçu en ligne » ; sans pack actif, sans tuiles ou sans réseau, l'aperçu SHALL rester schématique (fond uni + marqueurs + position). Le JSON et le pack joueur SHALL rester inchangés par cet aperçu (pack-only strict côté données).

#### Scenario: Fond réseau rejeté

- **GIVEN** un widget carte avec `background: { url: "https://tuiles.exemple.fr/{z}/{x}/{y}.png" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (fonds hors enum pack-only)

#### Scenario: Tuiles absentes, fond uni

- **GIVEN** un jeu outdoor sans tuiles pré-chargées et un widget carte en `pack-tiles`
- **WHEN** le joueur ouvre l'écran
- **THEN** le fond est uni, marqueurs, cercles et position restent lisibles

#### Scenario: Aperçu auteur en ligne sans fuite JSON

- **GIVEN** un widget carte en `pack-tiles` avec un pack actif, auteur en ligne
- **WHEN** le PhoneCanvas affiche l'écran
- **THEN** les tuiles s'affichent avec le badge « aperçu en ligne », et le JSON du jeu ne contient toujours aucune URL

#### Scenario: Aperçu hors-ligne schématique

- **GIVEN** le même écran sans réseau
- **WHEN** le PhoneCanvas affiche l'écran
- **THEN** le fond schématique uni s'affiche avec marqueurs et position, sans erreur

## ADDED Requirements

### Requirement: Reflet discret du pack actif dans l'aperçu auteur

L'aperçu auteur du widget carte (canvas Screen et aperçu Home, même PhoneCanvas) SHALL refléter le pack actif du projet sans pastille visible : le titre du fond porte le nom du pack résolu, le badge « aperçu en ligne » s'affiche quand les tuiles sont chargées en ligne, et la mention « fond uni — aucun pack actif » s'affiche sinon. Sélectionner, naviguer et fermer SHALL rester sans effet (aperçu statique et non interactif, strate 2 inchangée).

#### Scenario: Titre et badge sans pastille

- **GIVEN** un écran avec un widget carte en `pack-tiles` et un pack actif « Centre-ville » (42 tuiles, `pret`)
- **WHEN** l'auteur ouvre l'écran dans le canvas puis l'aperçu Home
- **THEN** aucune pastille « pack actif » n'est visible, le titre du fond porte le nom du pack et le badge « aperçu en ligne » s'affiche, sans contrôle d'édition dans l'aperçu

#### Scenario: Mention sans actif

- **GIVEN** le même écran sans pack actif désigné
- **WHEN** l'auteur ouvre l'écran
- **THEN** la mention « fond uni — aucun pack actif » s'affiche, marqueurs et position restant visibles
