## Purpose

Définit le système de branding typé pour GeoPlay, remplaçant le `branding` unconstrained `JsonElement?` par une structure `Branding` typée avec des champs définis et validables.

## Requirements

### Requirement: Branding typé

Le jeu SHALL définir `branding` comme objet typé avec les propriétés suivantes :
- `name` (string) : nom du jeu ou du publisher
- `primaryColor` (string, hex) : couleur primaire de l'interface
- `secondaryColor` (string, hex) : couleur secondaire de l'interface
- `fontFamily` (string) : famille de polices
- `logo` (string optionnel) : référence à un asset visuel

Le branding SHALL être lu depuis le JSON du jeu, jamais codé en dur.

#### Scenario: Branding complet dans le JSON
- **GIVEN** un jeu avec `branding: {name: "Chasse au Trésor", primaryColor: "#1a7f37", secondaryColor: "#5f3dc4", fontFamily: "system-ui"}`
- **WHEN** le moteur charge le jeu
- **THEN** le Player applique ces valeurs de branding

#### Scenario: Branding minimal
- **GIVEN** un jeu avec `branding: {name: "Mon Jeu"}`
- **WHEN** le moteur charge le jeu
- **THEN** le Player utilise les valeurs par défaut pour les couleurs et la police

### Requirement: Branding global et par nœud

Le branding global `branding` s'applique à tout le jeu. Un nœud MAY définir un `branding` local qui surcharge le branding global pour ce nœud spécifique.

Le branding local d'un nœud SHALL être un objet partiel qui se fonde dans le branding global (merge récursif).

#### Scenario: Branding par nœud
- **GIVEN** un jeu avec `branding.primaryColor: "#1a7f37"` et un nœud avec `branding: {primaryColor: "#ff4400"}`
- **WHEN** le joueur atteint ce nœud
- **THEN** la couleur primaire est #ff4400 pour ce nœud, #1a7f37 pour le reste

### Requirement: Validation Draft-07

Le schema Draft-07 SHALL définir `branding` comme objet avec les champs typés ci-dessus. `additionalProperties: false` SHALL empêcher les champs inconnus.

#### Scenario: Branding valide
- **GIVEN** un jeu avec `branding: {name: "Test", primaryColor: "#1a7f37"}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Branding avec champ inconnu
- **GIVEN** un jeu avec `branding: {name: "Test", champInconnu: "valeur"}`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté

### Requirement: Studio configuration branding

Le Studio SHALL offrir un panneau de configuration du branding accessible depuis l'éditeur de jeu. Le panneau SHALL permettre de modifier `name`, `primaryColor`, `secondaryColor`, `fontFamily`, et `logo`.

En complément du panneau, le Studio SHALL afficher le `branding.name` comme champ éditable inline dans la barre globale (header), entre le nom de l'écran et les statistiques de nœuds. Le champ SHALL utiliser le même mécanisme `edit` + `setBranding` que le panneau.

Toute modification du branding SHALL garantir un export JSON conforme au schema Draft-07.

#### Scenario: Modification du branding dans le Studio
- **GIVEN** un jeu en édition
- **WHEN** l'auteur modifie `branding.primaryColor` dans le panneau
- **THEN** le JSON exporté contient la nouvelle couleur et passe la validation

#### Scenario: Nom éditable dans la barre globale
- **GIVEN** un jeu en édition avec `branding.name: "Chasse au Trésor"`
- **WHEN** l'auteur modifie le nom dans le champ de la barre globale
- **THEN** `game.branding.name` est mis à jour, le panneau Configuration globale reflète la modification, et le JSON exporté contient le nouveau nom

### Requirement: Branding dans le Player

Le Player mobile SHALL appliquer le branding pour :
- L'en-tête et la barre de navigation (`primaryColor`, `fontFamily`)
- Les accents et les éléments interactifs (`secondaryColor`)
- Les titres et le nom du jeu (`name`)
- La logo ou identifiant visuel (`logo`)

#### Scenario: Branding appliqué dans le Player
- **GIVEN** un jeu avec `branding: {name: "Aventure", primaryColor: "#ff4400", fontFamily: "Roboto"}`
- **WHEN** le joueur lance le jeu
- **THEN** l'interface affiche "Aventure" en Roboto avec #ff4400 comme accent
