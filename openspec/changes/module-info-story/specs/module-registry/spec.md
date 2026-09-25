## ADDED Requirements

### Requirement: Enregistrement du module INFO

Le type INFO (jusqu'ici type nu hors registre : données libres, placeholder générique) SHALL être enregistré avec son sous-schéma versionné `info.json` (`schemaVersion: "1.0.0"`, `steps[]` ordonnées, chaque étape `{ text?, image?, video?, audio? }` avec au moins un contenu requis, `additionalProperties: false`), ses besoins (aucun capteur : ni GPS, ni boussole, ni caméra, ni carte, ni verrouillage) et son `screenPlugin`. L'enregistrement SHALL suivre le montage `$ref` existant sans toucher au schéma racine Noeuds/Liens. Les `data` INFO libres existantes (champs ad hoc hors `steps`) SHALL être rejetées en C1 après enregistrement.

#### Scenario: Nouveau type sans toucher la racine
- **GIVEN** le type INFO enregistré avec son sous-schéma
- **WHEN** le schéma racine est relu
- **THEN** aucun de ses objets n'a changé (seuls le registre et le dossier des sous-schémas ont gagné une entrée)

#### Scenario: Données libres rejetées
- **GIVEN** un module INFO avec `data: { backgroundImage: "x.jpg" }` (champ ad hoc pré-enregistrement)
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (champ étranger au sous-schéma INFO)

#### Scenario: Étapes valides acceptées
- **GIVEN** un module INFO avec `data: { schemaVersion: "1.0.0", steps: [{ text: "Londres, 1891." }, { text: "Regardez.", image: "assets/loupe.svg" }] }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le module est accepté
