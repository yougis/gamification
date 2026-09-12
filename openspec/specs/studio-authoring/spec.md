# studio-authoring Specification

## Purpose

Définit ce que le Studio GeoPlay doit offrir aux créateurs : composer, relire, valider et exporter un Jeu conforme sans écrire de JSON à la main.

## Requirements

### Requirement: Canvas graphe avec export garanti

Le Studio SHALL offrir un canvas visuel (nœuds draggable, arêtes = `activation`,
icônes par type de condition) où chaque modification garantit un export JSON
conforme au schéma 100. Aucun état visuel SHALL exister sans équivalent JSON.
L'état SHALL être immutable avec undo/redo.

#### Scenario: Glisser-déposer POOL

- **GIVEN** un auteur glisse 1 `RANDOM_POOL` et 5 nœuds POI sur le canvas
- **WHEN** il relie le pool aux 5 candidats
- **THEN** le JSON contient `randomPool` + 5 conditions `POOL_DRAWN` valides en couche 1

### Requirement: Formulaires dynamiques et MCP validant

Les formulaires d'édition SHALL être générés depuis les sous-schémas du registre,
la logique graphe restant découplée des formulaires de mini-jeux. Le MCP SHALL
exposer `composeNodes`, `setActivation`, `registerAsset`, `validateGame`,
`buildManifest`, `exportPack`, tous validés AJV contre le même schéma que le
runtime. Aucune production non validée (couches 1+2) ne SHALL sortir du Studio.

#### Scenario: Export bloqué sur graphe cassé

- **GIVEN** un Jeu avec FIN en AND sur 2 candidats exclusifs d'un pool 1/5
- **WHEN** l'auteur lance l'export
- **THEN** l'export est refusé avec l'erreur applicative et le nœud fautif surligné

### Requirement: Provenance et validation humaine

Chaque étape/asset SHALL porter `providerId`, licence, `sourceUrl` et un statut
`draft|reviewed|published` + `reviewedBy`. `draft` SHALL être injouable sauf mode
animateur-triche. La relecture SHALL montrer l'overlay source + données module
(ex. polygones 7-erreurs) avant passage en `reviewed`.

#### Scenario: Draft refusé au joueur

- **GIVEN** un pack contenant 1 nœud `draft`
- **WHEN** le runtime joueur le charge hors mode animateur
- **THEN** le Jeu est refusé avec le nœud fautif nommé

### Requirement: Overrides difficultés/modes et i18n verrouillée

Difficultés (`enfant|famille|expert`) et modes (`normal|animateur|soiree|
hardcore`, ex. `hintDisabled`, `timeLimit`, rayon réduit) SHALL être des
overrides, jamais une duplication du graphe. Les textes SHALL être des clés i18n
avec glossaire acronymes verrouillé (`auto|reviewed|locked`) : une retraduction
ne SHALL jamais écraser une correction `locked`.

#### Scenario: Retraduction sans écrasement

- **GIVEN** un acronyme corrigé `locked` en anglais
- **WHEN** le pack est régénéré en anglais
- **THEN** la correction est conservée et seul le reste est retraduit

### Requirement: Preview scriptée traçée

Le Studio SHALL offrir un simulateur pas-à-pas (bypass capteurs, `forceDraw` par
branche, injection `sessionId`) avec flag triche sur tout event simulé. La
fixture neutre 1/5→FIN SHALL être rejouable en un clic comme non-régression.

#### Scenario: Test des 5 branches

- **GIVEN** la fixture neutre chargée en preview
- **WHEN** l'auteur force tour à tour les 5 tirages
- **THEN** chaque branche s'active et atteint FIN sans erreur
