## Why

Chaque evolution de schema casse aujourd'hui les jeux existants ou exige une migration manuelle. Sans `schemaVersion` + migrations pures testees, le cout de migration explose avec M3 (backend, versions publiees immuables) et le runtime risque la lecture partielle d'un jeu trop recent (§3.3). Bloque M3 avec 912.

## What Changes

- `schemaVersion` entier dans chaque jeu ; chaque evolution de schema livre une migration pure testee `vN -> vN+1`.
- Studio migre a l'ouverture (migrations chainees, journalisees, annulables quand destructrices) ; runtime refuse un jeu de version superieure avec message clair (« mettez a jour l'application », code `E_SCHEMA_TOO_NEW`).
- Suite de non-regression : `game-5poi.json` et `sherlock-holmes` revalides C1+C2 apres chaque migration.
- Aucune migration i18n ici (change 912).

## Capabilities

### New Capabilities

- `schema-versioning`: versionnement, framework de migrations, refus explicite cote runtime.

### Modified Capabilities

- `game-schema`: ajout de `schemaVersion` (requis) et regles de compatibilite.

## Impact

- Schema Draft-07, Studio (migration a l'ouverture), runtime KMP (comparaison `schemaVersion` vs `minEngineVersion`), validateur, erreur `E_SCHEMA_TOO_NEW` (cf. catalogue §3.6, implemente en 903 mais code reserve ici).
- Bloque M3 (avec 912).

## Impact CodeGraph

- Inventaire exact a completer a l'apply via CodeGraph : schema racine, parseur Kotlin, code d'ouverture Studio.
- Parite TS = KMP sur le refus de version a verifier via la suite 908.
