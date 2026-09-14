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

### Requirement: Configuration HOLD via MCP

Le Studio MCP SHALL exposer les operations suivantes pour le mode
kiosque :
- `setHoldMode(gameId, mode)` : configure `global.holdMode`
  (`"none"`, `"guidedAccess"`, `"screenPinning"`, `"lockTask"`)
- `setHoldExit(gameId, exitConfig)` : configure `global.holdExit`
  (`method`, `pin`, `adminPanel`)
- `getHoldConfig(gameId)` : retourne la configuration HOLD active

Toutes les operations sont validees AJV contre le meme schema que le
runtime. Aucune production non validee ne sort du Studio.

#### Scenario: Configurer HOLD via Studio

- **GIVEN** un Jeu en cours d'edition dans le Studio
- **WHEN** l'auteur appelle `setHoldMode(gameId, "guidedAccess")`
  puis `setHoldExit(gameId, {method: "adminPin", pin: "1234"})`
- **THEN** le JSON exporte contient `global.holdMode` et
  `global.holdExit` valides, l'export est refuse si incoherent

#### Scenario: Export bloque si holdMode sans holdExit

- **GIVEN** un Jeu avec `global.holdMode: "lockTask"` et pas de
  `global.holdExit`
- **WHEN** l'auteur lance l'export
- **THEN** l'export est refuse avec l'erreur holdExit manquant, le
  nœud fautif est identifié

### Requirement: Triche HOLD dans le preview Studio

Le preview Studio SHALL permettre de simuler le mode HOLD avec
`forceHoldExit` (simuler une sortie animateur) et `forceHoldLock`
(simuler un verrouillage kiosque). Chaque event simule porte le
flag triche et le flag `holdMode`. Le preview ne modifie pas le
JSON source.

#### Scenario: Preview HOLD pas-à-pas

- **GIVEN** un Jeu en mode HOLD, loaded en preview Studio
- **WHEN** l'auteur force `holdLock` puis `forceHoldExit`
- **THEN** les events portent le flag triche et le flag holdMode,
  la séquence est rejouable en un clic comme non-régression

### Requirement: Provenance et validation humaine

Chaque étape/asset SHALL porter `providerId`, licence, `sourceUrl`
et un statut `draft|reviewed|published` + `reviewedBy`. `draft` SHALL
être injouable sauf mode animateur-triche. La relecture SHALL montrer
l'overlay source + données module (ex. polygones 7-erreurs) avant
passage en `reviewed`. **En mode HOLD, le statut `reviewed` est
requis pour activer le kiosque ; un jeu en `draft` avec `holdMode !=
"none"` est refuse au runtime joueur (même en mode animateur),
car le verrouillage kiosque nécessite un jeu validé.**

#### Scenario: Draft refusé au joueur

- **GIVEN** un pack contenant 1 nœud `draft`
- **WHEN** le runtime joueur le charge hors mode animateur
- **THEN** le Jeu est refuse avec le nœud fautif nommé

#### Scenario: Draft HOLD refuse au joueur

- **GIVEN** un pack contenant 1 noeud `draft` avec `holdMode:
  "guidedAccess"`
- **WHEN** le runtime joueur le charge hors mode animateur
- **THEN** le Jeu est refuse avec le nœud fautif nommé et le flag
  holdMode est signalé

### Requirement: Overrides difficultés/modes et i18n verrouillée

Difficultés (`enfant|famille|expert`) et modes (`normal|animateur|soiree|
hardcore`, ex. `hintDisabled`, `timeLimit`, rayon réduit) SHALL être des
overrides, jamais une duplication du graphe. Les textes SHALL être des clés i18n
avec glossaire acronymes verrouillé (`auto|reviewed|locked`) : une retraduction
ne SHALL jamais écraser une correction `locked`. **Le mode HOLD est un
mode système ajouté à la liste des modes système (avec `triche/test` et
`preview Studio`). Il est configuré via `global` et non comme override de difficulté.**

#### Scenario: Retraduction sans écrasement

- **GIVEN** un acronyme corrigé `locked` en anglais
- **WHEN** le pack est régénéré en anglais
- **THEN** la correction est conservée et seul le reste est retraduit

#### Scenario: HOLD est un mode systeme a part entiere

- **GIVEN** un Jeu avec `global.holdMode: "screenPinning"`
- **WHEN** le Studio affiche les modes systeme
- **THEN** HOLD est listé comme mode système kiosque, distinct des
  modes de jeu `normal|animateur|soiree|hardcore`

### Requirement: Preview scriptée traçée

Le Studio SHALL offrir un simulateur pas-à-pas (bypass capteurs, `forceDraw` par
branche, injection `sessionId`) avec flag triche sur tout event simulé. **Le preview
HOLD offre en plus `forceHoldLock` / `forceHoldExit` avec flag triche et `holdMode`
sur les events.** La fixture neutre 1/5→FIN SHALL être rejouable en un clic comme non-régression.

#### Scenario: Test des 5 branches

- **GIVEN** la fixture neutre chargée en preview
- **WHEN** l'auteur force tour à tour les 5 tirages
- **THEN** chaque branche s'active et atteint FIN sans erreur

#### Scenario: Preview HOLD des 5 branches

- **GIVEN** la fixture neutre chargée en preview HOLD
- **WHEN** l'auteur force tour à tour les 5 tirages avec `forceHoldLock`
- **THEN** chaque branche s'active et atteint FIN, chaque event porte le flag triche et `holdMode`
