## MODIFIED Requirements

### Requirement: Définition ZoneContent

Une `ZoneContent` SHALL contenir :
- `layout` (string, défaut `"stack"`) : `"stack"` (vertical), `"grid"` (colonnes), `"free"` (positionnement libre)
- `widgets` (tableau de Widget, >=0 éléments)
- `fermable` (booléen optionnel, défaut `false`) : réservé à la zone `overlay` — `true` autorise en plus le masquage au clic sur le fond ; dans tous les cas le renderer affiche un contrôle de fermeture (icône message). Sur les autres zones, la valeur est ignorée.

`additionalProperties: false` SHALL être appliqué.

#### Scenario: Zone avec layout stack

- **GIVEN** une zone avec `layout: "stack"` et 2 widgets
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée

#### Scenario: Zone avec layout inconnu

- **GIVEN** une zone avec `layout: "flexbox"`
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est rejeté (valeur non dans l'enum)

#### Scenario: Overlay fermable acceptée

- **GIVEN** une zone overlay avec `fermable: true` et 1 widget
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée

#### Scenario: Overlay sans fermable (défaut fermé)

- **GIVEN** une zone overlay sans champ `fermable`
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée et le renderer affiche le contrôle de fermeture (seul le clic-fond reste inerte)
