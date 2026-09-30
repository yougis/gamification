## MODIFIED Requirements

### Requirement: Styles POI par état

`MapWidget.poiStyle` (optionnel) SHALL associer une icône à chaque état moteur : `{ locked?, unlocked?, completed? }` (références d'icônes ou glyphes, jamais d'URL réseau). Non renseigné, le moteur SHALL appliquer son jeu d'icônes par défaut, distinct par état et lisible sans la couleur seule. L'état affiché SHALL suivre l'état moteur temps réel (`LOCKED → UNLOCKED → COMPLETED`).

#### Scenario: Icônes par défaut distinctes

- **GIVEN** un widget carte sans `poiStyle` et 3 POI dans les 3 états
- **WHEN** le joueur ouvre l'écran
- **THEN** les 3 marqueurs sont visuellement distincts sans recourir à la couleur seule

#### Scenario: Icônes auteur appliquées

- **GIVEN** un widget carte avec `poiStyle: { locked: "cadenas", unlocked: "etoile" }`
- **WHEN** le joueur ouvre l'écran
- **THEN** les POI verrouillés portent `cadenas`, les éligibles `etoile`, les autres états les défauts

### Requirement: Bouton à état lié vers l'étape

Le bouton du volet SHALL refléter l'éligibilité du POI sélectionné : `Ouvrir` actif si le POI est éligible (`UNLOCKED`), `Verrouillé` désactivé sinon. Activer `Ouvrir` SHALL présenter l'écran de l'étape éligible (même présentation d'éligible existant : aucune transition ajoutée, aucun event ajouté). Le bouton désactivé SHALL expliquer le verrouillage (motif générique, jamais de fuite discovery : un POI non découvert n'affiche pas de volet du tout).

#### Scenario: POI éligible ouvrable

- **GIVEN** un POI `UNLOCKED` sélectionné dans la carte
- **WHEN** le joueur touche `Ouvrir`
- **THEN** l'écran de l'étape s'ouvre sans event de progression, comme par tout autre déclencheur

#### Scenario: POI verrouillé non ouvrable

- **GIVEN** un POI `LOCKED` sélectionné dans la carte
- **WHEN** le joueur regarde le volet
- **THEN** le bouton affiche `Verrouillé`, désactivé, et aucun appui ne produit d'effet
