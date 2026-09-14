## Why

Les jeux GeoPlay en flotte fournie ont besoin d'un mode kiosque qui verrouille
physiquement le terminal pendant une session : le joueur ne peut pas quitter
l'application (bouton Home, app-switcher, notifications). L'animateur est le seul
autorisé à sortir du mode via une action dédiée. Sans HOLD, le jeu ne peut
pas garantir l'intégrité d'une session terrain en milieu contrôlé.

## What Changes

- Ajout de `global.holdMode` et `global.holdExit` au schema du jeu (Draft-07).
  Quand `holdMode != "none"`, le runtime active le verrouillage kiosque au
  lancement de la session et le relâche à la fin ou sur action animateur.
- Mode kiosque OS : Guided Access (iOS) / Screen Pinning (Android) /
  Lock Task Mode. Le jeu n'intercepte jamais le Home — l'OS verrouille.
- Action de sortie animateur : PIN, code ou geste configuré dans le JSON,
  saisie par l'animateur (jamais le joueur). Déverrouillage + event tracé.
- Tous les modes (y compris non-HOLD) journalisent entrées/sorties de session
  dans l'interface pour l'animateur (audit trail).
- `module-registry` : ajout du champ `needsLock` pour signaler aux modules
  qu'ils nécessitent le verrouillage kiosque.
- `studio-authoring` : MCP expose `setHoldMode` / `setHoldExit` pour la
  configuration par l'auteur.
- `game-validation` : valide que `holdExit` est cohérent avec `holdMode`
  (présence, format du PIN, méthode supportée).
- **Non-modification** : la machine à états `LOCKED -> UNLOCKED -> ACTIVE ->
  COMPLETED` n'est pas altérée. HOLD est une enveloppe meta-état, pas une
  condition graphe. Pas de nouveau type de condition dans l'enum.

## Capabilities

### New Capabilities

- Aucune (HOLD est transversal, pas un nouveau domaine).

### Modified Capabilities

- `game-schema` : ajout de `global.holdMode` (enum) et `global.holdExit`
  (objet sortie) au schema racine. `additionalProperties:false` mis à jour.
- `viewer-orchestrator` : la boucle d'évaluation et les callbacks `onPause`/
  `onStop` deviennent HOLD-aware : verrouillage OS actif quand `holdMode !=
  "none"`, journalisation systématique des entrées/sorties.
- `studio-authoring` : le MCP ajoute `setHoldMode` et `setHoldExit` aux
  opérations de composition/export. Le Studio peut configurer HOLD pour
  chaque jeu.
- `module-registry` : ajout du champ optionnel `needsLock` (bool) dans
  l'enregistrement du module ; un module marqué `needsLock:true` ne peut
  être joué que si `holdMode != "none"`.
- `game-validation` : couche applicative vérifiant la cohérence `holdMode` /
  `holdExit` (PIN valide, méthode supportée, adminPanel si applicable).

## Impact

- Touche le schema graphe (ajout de champs `global`) : consommateurs impactés
  Studio MCP, runtime natif, orchestrateur, validateur.
- Réseau : 0 en parcours joueur ; le verrouillage kiosque est local et le
  PIN est stocké/chiffré localement (SQLite) ou fourni par l'animateur à
  chaque session. Pas d'exception offline-first.
- Dépend de : `100` (schema), `400` (viewer-orchestrator), `000` (archivé).
