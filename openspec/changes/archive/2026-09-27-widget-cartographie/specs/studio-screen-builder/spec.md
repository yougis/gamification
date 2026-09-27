## ADDED Requirements

### Requirement: Variante MapWidget strate 2

Le schéma SHALL définir une variante `MapWidget` au discriminant `type` des Widget : `{ type: "map", source, background?, poiStyle?, volet?, styles? }`. `MapWidget` est strate 2 (lié, passif) : il lit le moteur (positions, états, éligibilité) et SHALL NE JAMAIS produire ni transition d'état ni event de progression ni effet. `additionalProperties: false` SHALL être appliqué à la variante.

#### Scenario: Widget carte valide

- **GIVEN** un widget `{ type: "map", source: { kind: "steps" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Champ étranger rejeté

- **GIVEN** un widget `{ type: "map", source: { kind: "steps" }, questions: [] }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (champ étranger à MapWidget)

### Requirement: Invariant des 3 strates

Tout widget SHALL appartenir à exactement une strate : strate 1 CONTENU (passif, auteur : `text`, `image`, `button`, `spacer`, `progress` — affiche, zéro lecture moteur, zéro effet), strate 2 LIÉ (passif, dérivé du jeu : `map` et futurs liés — lit le moteur, zéro écriture, zéro event), strate 3 MOTEUR (`module`, unique portail vers le mini-jeu — seul widget pouvant compléter, scorer, déclencher transitions, effects et events). Aucun widget de strate 1 ou 2 SHALL porter de mécanique de complétion ou de score.

#### Scenario: Carte sans mécanique

- **GIVEN** un écran avec un widget `map` et un widget `module`
- **WHEN** le joueur interagit avec la carte (sélection, navigation)
- **THEN** aucune complétion, aucun score, aucun event de progression n'est émis ; seule l'interaction avec le `module` peut en produire

### Requirement: Source steps avec filtre découverts seuls

`MapWidget.source` SHALL être `{ kind: "steps", filter?: "discovered" | "all" }` (défaut `discovered`). Avec `discovered`, seules les étapes découvertes (`VISIBLE_NOW` ou discovery satisfaite) sont affichées ; les étapes non découvertes SHALL rester invisibles (jamais d'icône de remplacement). `all` est réservé aux jeux sans mécanique de découverte et SHALL être signalé comme éventant les étapes cachées. Le validateur applicatif SHALL émettre un avertissement (pas un rejet) quand `filter: "all"` coexiste avec des nœuds en discovery non-`VISIBLE_NOW`.

#### Scenario: Étape cachée invisible par défaut

- **GIVEN** un widget carte avec `source: { kind: "steps" }` et un nœud en `discovery: { mode: ON_CLUE }` non révélé
- **WHEN** le joueur ouvre l'écran
- **THEN** le nœud n'apparaît ni en marqueur ni en liste, sans emplacement vide

#### Scenario: Filtre all averti

- **GIVEN** un widget carte avec `source: { kind: "steps", filter: "all" }` et un nœud en discovery `ON_CLUE`
- **WHEN** la validation applicative tourne
- **THEN** un avertissement signale l'éventement des étapes cachées, sans bloquer

### Requirement: Fonds pack-only interchangeables

`MapWidget.background` SHALL valoir `"pack-tiles"` (défaut, tuiles pré-chargées `global.map`), `"indoor-plan"` (plan actif `global.indoorPlans`, jeux indoor) ou `"solid"` (fond uni). Toute source réseau (URL de tuiles, fond distant) SHALL être rejetée : les fonds sont des assets du pack (manifest SHA-256) ou le fallback uni. Sans tuiles ni plan, le widget SHALL rendre le fond uni avec marqueurs et position, exactement comme la carte standalone.

#### Scenario: Fond réseau rejeté

- **GIVEN** un widget carte avec `background: { url: "https://tuiles.exemple.fr/{z}/{x}/{y}.png" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (fonds hors enum pack-only)

#### Scenario: Tuiles absentes, fond uni

- **GIVEN** un jeu outdoor sans tuiles pré-chargées et un widget carte en `pack-tiles`
- **WHEN** le joueur ouvre l'écran
- **THEN** le fond est uni, marqueurs, cercles et position restent lisibles

### Requirement: Styles POI par état

`MapWidget.poiStyle` (optionnel) SHALL associer une icône à chaque état moteur : `{ locked?, unlocked?, active?, completed? }` (références d'icônes ou glyphes, jamais d'URL réseau). Non renseigné, le moteur SHALL appliquer son jeu d'icônes par défaut, distinct par état et lisible sans la couleur seule. L'état affiché SHALL suivre l'état moteur temps réel (`LOCKED → UNLOCKED → ACTIVE → COMPLETED`).

#### Scenario: Icônes par défaut distinctes

- **GIVEN** un widget carte sans `poiStyle` et 4 POI dans les 4 états
- **WHEN** le joueur ouvre l'écran
- **THEN** les 4 marqueurs sont visuellement distincts sans recourir à la couleur seule

#### Scenario: Icônes auteur appliquées

- **GIVEN** un widget carte avec `poiStyle: { locked: "cadenas", unlocked: "etoile" }`
- **WHEN** le joueur ouvre l'écran
- **THEN** les POI verrouillés portent `cadenas`, les éligibles `etoile`, les autres états les défauts

### Requirement: Volet composé par l'auteur avec défaut texte + bouton

`MapWidget.volet` (optionnel) SHALL être un contenu de widgets strate 1 affiché à la sélection d'un marqueur, avec un contexte implicite = le POI sélectionné (champs liés disponibles : nom, état, compte à rebours). À la pose du widget, un **volet par défaut** SHALL être créé : un widget `text` (nom du POI) + un widget `button` d'accès au POI, actif seulement si le POI est déverrouillé. L'auteur MAY remplacer ce contenu librement (ajout, édition, suppression, comme tout contenu de zone, annulable par undo).

#### Scenario: Volet par défaut à la pose

- **GIVEN** un auteur posant un widget carte dans un écran
- **WHEN** le widget est créé
- **THEN** son volet contient un texte (nom du POI sélectionné) et un bouton d'accès inactif tant que le POI est verrouillé

#### Scenario: Volet personnalisé conservé

- **GIVEN** un volet modifié par l'auteur (texte d'ambiance ajouté)
- **WHEN** l'auteur recharge le Studio puis rouvre l'écran
- **THEN** le volet personnalisé est intact, le défaut n'est jamais réappliqué

### Requirement: Bouton à état lié vers l'étape

Le bouton du volet SHALL refléter l'éligibilité du POI sélectionné : `Ouvrir` actif si le POI est éligible (`UNLOCKED`, pas de modale ACTIVE concurrente), `Verrouillé` désactivé sinon. Activer `Ouvrir` SHALL présenter l'écran de l'étape éligible (même présentation d'éligible existant : aucune transition ajoutée, aucun event ajouté). Le bouton désactivé SHALL expliquer le verrouillage (motif générique, jamais de fuite discovery : un POI non découvert n'affiche pas de volet du tout).

#### Scenario: POI éligible ouvrable

- **GIVEN** un POI `UNLOCKED` sélectionné dans la carte
- **WHEN** le joueur touche `Ouvrir`
- **THEN** l'écran de l'étape s'ouvre sans event de progression, comme par tout autre déclencheur

#### Scenario: POI verrouillé non ouvrable

- **GIVEN** un POI `LOCKED` sélectionné dans la carte
- **WHEN** le joueur regarde le volet
- **THEN** le bouton affiche `Verrouillé`, désactivé, et aucun appui ne produit d'effet

### Requirement: Champ source ouvert pour les futurs liés

Le sous-objet `source` SHALL être le point d'extension des futurs widgets liés (tableau, messages, timer) : `source: { kind: <enum> }` où l'enum démarre à `"steps"` et s'étend par change dédié, avec `additionalProperties: false` par kind. Un kind inconnu SHALL être rejeté en couche 1 (compatibilité traitée par enregistrement, jamais par lecture silencieuse). Le validateur applicatif SHALL vérifier la cohérence source/jeu (ex. source steps avec jeu HOME-seul sans nœud = avertissement, pas rejet).

#### Scenario: Kind inconnu rejeté

- **GIVEN** un widget avec `source: { kind: "scores" }` (kind futur non enregistré)
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (kind hors enum)
