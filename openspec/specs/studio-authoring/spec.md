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

### Requirement: Organisation en écrans

Le Studio SHALL organiser son interface en 6 écrans — Composer, Importer, Relire, Valider, Prévisualiser, Exporter — accessibles depuis une navigation latérale. Les préoccupations transverses (i18n, difficultés/modes) SHALL être des calques superposés, jamais des écrans séparés.

Une barre globale SHALL afficher en permanence : le nom du jeu, son statut (`draft`/`reviewed`), l'indicateur de validation C1/C2, l'undo/redo et l'accès à l'export.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

### Requirement: Canvas graphe détaillé

Le canvas SHALL offrir : nœuds déplaçables sur grille libre, zoom/pan standard, arêtes directionnelles (flèche) avec un style distinct quand la relation porte une condition, icône par type de condition, sélection multiple, alignement/distribution basique, recherche de nœud par nom ou type.

Un nœud en statut `draft` SHALL être visuellement distinct (bordure pointillée + badge) en permanence, pas seulement lors de la validation.

#### Scenario: Nœud draft reconnaissable sans valider
- **GIVEN** un jeu avec 1 nœud `draft` parmi 5 nœuds
- **WHEN** l'auteur regarde le canvas sans lancer aucune validation
- **THEN** le nœud `draft` porte la bordure pointillée et le badge, les 4 autres non

### Requirement: Inspecteur de nœud

Le panneau d'inspection SHALL présenter des sections fixes dans cet ordre : `module` (type + version) → `activation` → `latch`/rejeu → `discovery` → `effects` → `inventoryRef`, générées depuis le registre de modules sans aucun champ codé en dur dans l'UI.

Si le module déclare `needsLock: true` alors que `holdMode == none`, le champ HOLD correspondant SHALL être affiché en lecture seule avec un lien direct vers la configuration globale et l'explication du blocage, jamais un blocage muet.

Des `presentationNeeds`/`experienceNeeds` non satisfaits par la config globale active SHALL afficher un avertissement inline sans bloquer — le blocage reste le rôle exclusif de l'écran Valider.

#### Scenario: Module needsLock sans HOLD expliqué
- **GIVEN** un nœud AR_MARKER (`needsLock: true`) dans un jeu avec `holdMode == "none"`
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** le champ HOLD est en lecture seule, explique qu'il faut un `holdMode` actif, et propose le lien vers la config globale

#### Scenario: Besoins non satisfaits avertis sans bloquer
- **GIVEN** un module avec `experienceNeeds: ["map"]` et un `experienceStyle` sans configuration `map`
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** un avertissement inline est affiché et l'édition du nœud reste possible

### Requirement: Gestion de l'inventaire

L'écran Composer SHALL offrir une vue liste des objets et une vue "référencé par" indiquant quels nœuds utilisent chaque objet. La suppression d'un objet référencé ailleurs SHALL exiger une confirmation listant les nœuds impactés.

#### Scenario: Suppression d'objet référencé
- **GIVEN** un objet `cle` utilisé par 2 nœuds via `ITEM_REQUIRED`
- **WHEN** l'auteur demande la suppression de `cle`
- **THEN** une confirmation liste les 2 nœuds impactés avant toute suppression

### Requirement: Configuration globale dédiée

La configuration globale SHALL vivre dans un panneau dédié (hors nœuds), structuré en sous-sections correspondant 1:1 aux opérations MCP : navigation & présentation, `experienceStyle` (sélecteur de preset + champs par dimension, avec indication visible si le preset a été modifié manuellement après sélection), branding typé (validé à la saisie, pas seulement à l'export), `gameMode`/`difficulty`, HOLD (`holdMode`, `holdExit`), GPS/carte.

Changer `holdMode` SHALL déclencher un recalcul visible des nœuds qui en dépendent.

#### Scenario: Changement de holdMode recalcule les dépendances
- **GIVEN** un jeu avec un module `needsLock` et `holdMode == "none"`
- **WHEN** l'auteur passe `holdMode` à `"guidedAccess"`
- **THEN** le nœud concerné affiche immédiatement son nouvel état de dépendance satisfaite

#### Scenario: Preset modifié signalé
- **GIVEN** un `experienceStyle` avec `preset: "BASIC"`
- **WHEN** l'auteur modifie manuellement `visual.primaryColor`
- **THEN** l'UI indique que le preset a divergé de sa référence

### Requirement: Parité d'état à l'import

Un import réussi SHALL placer le jeu exactement dans le même état que Composer après une création manuelle : même chaîne undo/redo, mêmes écrans disponibles. L'interface ne SHALL jamais proposer un "mode import" distinct aux capacités réduites.

Si le fichier échoue à la couche 1 (forme), l'erreur brute de schéma SHALL être affichée sans reformulation masquant l'information technique nécessaire au debug.

#### Scenario: Import puis édition immédiate
- **GIVEN** un fichier JSON valide importé avec succès
- **WHEN** l'auteur modifie un nœud puis annule (undo)
- **THEN** l'annulation fonctionne comme pour un jeu créé manuellement

### Requirement: File de relecture

L'écran Relire SHALL lister étapes et assets avec `providerId`, licence, `sourceUrl`, statut et `reviewedBy`, et offrir un filtre par statut avec le filtre `draft` mis en avant par défaut.

L'overlay de relecture SHALL montrer la source et les données du module associé, superposées quand le module s'y prête, côte-à-côte sinon.

Le passage `draft → reviewed` SHALL être une action explicite enregistrant `reviewedBy` (utilisateur courant), non modifiable a posteriori sans action distincte d'annulation de relecture.

Un compteur global des éléments encore `draft` SHALL rester visible en permanence, car il bloque l'export en HOLD.

#### Scenario: Relecture avec overlay module
- **GIVEN** une étape 7-erreurs en statut `draft`
- **WHEN** l'auteur ouvre l'overlay de relecture
- **THEN** l'image source et les polygones du module sont affichés ensemble avant tout passage en `reviewed`

#### Scenario: Compteur draft et blocage HOLD
- **GIVEN** un jeu avec 2 éléments `draft` et `holdMode != "none"`
- **WHEN** l'auteur consulte n'importe quel écran
- **THEN** le compteur affiche 2 et l'export reste bloqué

### Requirement: Verdicts séparés et actionnables

L'écran Valider SHALL présenter les verdicts C1 (Draft-07) et C2 (applicative) dans deux blocs visuellement séparés, jamais fusionnés en un statut global unique.

Les erreurs C2 SHALL être groupées par catégorie (cycle, atteignabilité, pools, HOLD, références, consumable), et chaque erreur SHALL être cliquable pour naviguer vers le nœud fautif dans Composer avec surlignage temporaire.

La règle de dérivation "export possible" (C1 ∧ C2 ∧ pas de nœud `draft` hors mode animateur) SHALL être visible dans l'UI (aide contextuelle), jamais appliquée silencieusement.

#### Scenario: Erreur cliquable vers le fautif
- **GIVEN** un jeu avec une erreur C2 de cycle entre les nœuds A et B
- **WHEN** l'auteur clique l'erreur dans la catégorie cycle
- **THEN** Composer s'ouvre sur les nœuds A et B surlignés temporairement

### Requirement: Prévisualisation traçée

L'écran Prévisualiser SHALL offrir un mode pas-à-pas (avance/retour nœud par nœud) et un panneau de triche regroupant bypass capteurs, `forceDraw` par branche, injection de `sessionId` et `forceHoldLock`/`forceHoldExit`.

Tout event simulé SHALL porter visuellement le flag triche (badge distinct, ex. "SIMULÉ") plus l'état HOLD courant : un event simulé ne SHALL jamais ressembler à un event réel dans les logs affichés.

Un bouton dédié SHALL relancer la fixture neutre 1/5→FIN en un clic avec résultat pass/fail immédiat.

Un rappel permanent SHALL indiquer que la prévisualisation n'écrit jamais dans le JSON source.

#### Scenario: Event simulé distinct d'un event réel
- **GIVEN** une session de prévisualisation avec bypass capteurs actif
- **WHEN** l'auteur consulte les logs affichés
- **THEN** chaque event simulé porte le badge "SIMULÉ" et aucun ne peut être confondu avec un event réel

### Requirement: Export à porte unique

Le bouton d'export SHALL être désactivé (jamais caché) tant que la validation échoue ou qu'un nœud est `draft` hors mode animateur, avec un message indiquant laquelle des deux conditions bloque.

Avant génération, l'écran SHALL afficher le résumé des fichiers à produire ; après génération, chaque fichier SHALL afficher son `{path, version, size, sha256}` réel.

L'interface SHALL n'exposer qu'une seule action d'export visible par défaut. Si la porte historique `exportPack` coexiste temporairement avec `exportPackFull`, elle SHALL être marquée dépréciée et masquée derrière un accès explicite.

#### Scenario: Export bloqué avec raison visible
- **GIVEN** un jeu valide C1+C2 mais avec 1 nœud `draft` hors mode animateur
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** le bouton est désactivé et le message nomme le nœud `draft` comme cause du blocage

### Requirement: Calques transverses

Les calques i18n, difficultés/modes SHALL se superposer à Composer via un sélecteur de la barre globale, jamais comme écrans séparés.

Le calque i18n SHALL offrir un sélecteur de langue active, une vue clé/valeur et un indicateur de clés manquantes par langue. Les clés du glossaire verrouillé SHALL être visuellement non éditables (grisées + cadenas), jamais simplement "modifiables mais déconseillées".

Les difficultés/modes SHALL être présentés comme des surcouches du graphe (sélecteur de vue). L'UI ne SHALL offrir aucune action de type "dupliquer le graphe pour cette difficulté".

HOLD SHALL NOT figurer dans le même sélecteur que difficulté/mode : c'est un mode système configuré dans la configuration globale.

#### Scenario: Clé verrouillée non éditable
- **GIVEN** une clé i18n marquée `locked` dans le glossaire
- **WHEN** l'auteur ouvre le calque i18n
- **THEN** la clé est grisée avec un cadenas et aucune édition n'est possible

### Requirement: Garanties P0 traduites en interface

Toute action de l'UI SHALL passer par une opération MCP nommée et journalisée : aucune édition directe d'état contournant l'historique n'est permise.

Aucun champ d'UI SHALL n'exister sans équivalent persisté dans le JSON : si une valeur s'affiche, elle existe dans le JSON.

Le mode de lecture en conditions réelles SHALL vérifier lui-même le statut `draft`, indépendamment du contrôle à l'export.

La règle de blocage à l'export (validation ∧ statuts) SHALL être calculée par une règle centrale unique, jamais dupliquée en deux endroits de l'UI.

Les écrans Importer et Exporter ne SHALL initier aucune requête réseau.

#### Scenario: Action UI traçable dans l'historique
- **GIVEN** un auteur modifiant la couleur primaire du branding
- **WHEN** il ouvre l'historique undo/redo
- **THEN** l'entrée correspondante nomme l'opération MCP (`setBranding`), pas un diff JSON opaque

### Requirement: Vue carte/plan dans le Composer

Le Composer SHALL offrir un toggle entre la vue graphe et la vue carte/plan, visible en permanence dans la barre d'outils. Le toggle SHALL être opérationnel uniquement lorsque le jeu a une configuration de carte (`global.map` pour outdoor) ou de plans (`global.indoorPlans` pour indoor). Sans ces配置, le toggle SHALL être masqué ou désactivé.

La vue carte/plan SHALL supporter les mêmes interactions de sélection et d'édition que la vue graphe : sélection de nœud, undo/redo, édition via l'inspecteur. La sélection de nœud SHALL être synchronisée entre les deux vues (sélectionner un nœud dans la carte le sélectionne aussi dans le graphe).

#### Scenario: Toggle visible avec configuration carte
- **GIVEN** un jeu avec `global.map` configuré
- **WHEN** l'auteur ouvre le Composer
- **THEN** le toggle Carte/Graphe est visible et activé

#### Scenario: Toggle masqué sans configuration
- **GIVEN** un jeu sans `global.map` ni `global.indoorPlans`
- **WHEN** l'auteur ouvre le Composer
- **THEN** le toggle Carte/Graphe est masqué

#### Scenario: Sélection synchronisée carte → graphe
- **GIVEN** le Composer en vue carte avec un nœud sélectionné
- **WHEN** l'auteur bascule vers la vue graphe
- **THEN** le même nœud reste sélectionné dans la vue graphe

### Requirement: Section position dans l'inspecteur

L'inspecteur de nœud SHALL afficher une section `position` pour les nœuds ayant des coordonnées géographiques :
- **Outdoor** : champs `lat` et `lng` (liés à la condition GEOFENCE)
- **Indoor** : champs `planId`, `x`, `y` (liés à `node.position`)

La section position SHALL être placée après la section `activation` dans l'inspecteur. Les champs SHALL être éditables manuellement (saisie directe) ET mis à jour par interaction carte/plan (click/drag).

#### Scenario: Section position outdoor
- **GIVEN** un nœud avec condition GEOFENCE (lat: 48.01, lng: 2.01)
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** une section "Position" affiche les champs lat et lng avec les valeurs actuelles

#### Scenario: Section position indoor
- **GIVEN** un nœud avec position (planId: "plan-rdc", x: 5.0, y: 3.0)
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** une section "Position" affiche les champs planId, x et y avec les valeurs actuelles

#### Scenario: Modification manuelle met à jour la carte
- **GIVEN** un nœud avec GEOFENCE (lat: 48.01, lng: 2.01) en vue carte
- **WHEN** l'auteur modifie lat à 48.02 dans l'inspecteur
- **THEN** le marqueur se déplace sur la carte vers la nouvelle position

### Requirement: Suppression de noeud

Le Studio SHALL fournir un bouton de suppression dans l'Inspecteur et la NodeList pour chaque noeud. La suppression SHALL retirer le noeud du JSON et toutes les aretes (conditions `NODE_COMPLETED`, `POOL_DRAWN`, effects `REVEAL_NODE`/`UNLOCK_NODE`) qui le referencent en tant que source ou cible.

Si le noeud est reference par d'autres noeuds (conditions, effects, progression), une confirmation SHALL lister les noeuds impactes avant toute suppression.

Un noeud ne peut pas etre supprime s'il est le seul noeud `isEnding:true` du jeu (le validateur rejetterait le jeu).

#### Scenario: Suppression simple
- **GIVEN** un jeu avec 3 noeuds dont un noeud `etape-2` sans reference depuis d'autres noeuds
- **WHEN** l'auteur clique sur supprimer `etape-2` et confirme
- **THEN** le noeud est retire du JSON, les 2 autres noeuds restent inchanges, le canvas se met a jour

#### Scenario: Suppression avec references
- **GIVEN** un jeu avec 3 noeuds dont `etape-1` reference par une condition `NODE_COMPLETED` du noeud `etape-2`
- **WHEN** l'auteur demande la suppression de `etape-1`
- **THEN** une confirmation affiche "Ce noeud est reference par etape-2 (condition NODE_COMPLETED). Supprimer ?" avant toute action

#### Scenario: Suppression du dernier isEnding
- **GIVEN** un jeu avec 2 noeuds dont un seul `isEnding: true` (noeud `fin`)
- **WHEN** l'auteur demande la suppression de `fin`
- **THEN** la suppression est refusee avec le message "Impossible de supprimer le seul noeud de fin du jeu"

### Requirement: Renommage de noeud

Le Studio SHALL fournir un champ ID editable dans l'Inspecteur pour chaque noeud. Le renommage SHALL mettre a jour toutes les references au noeud dans le jeu : conditions `NODE_COMPLETED`, `POOL_DRAWN`, `anchorNodeId` de TIMER, effects `REVEAL_NODE`/`UNLOCK_NODE`, `sourceNode` de discovery, et tout autre champ referencant le nodeId.

Le validateur SHALL rejeter un ID duplique (unicite preservee). L'ID ne peut pas etre vide.

#### Scenario: Renommage avec propagation
- **GIVEN** un noeud `etape-1` reference par une condition `NODE_COMPLETED` dans `etape-2`
- **WHEN** l'auteur renomme `etape-1` en `chateau-louis-xiv`
- **THEN** la condition dans `etape-2` pointe desormais vers `chateau-louis-xiv`, le JSON est coherent

#### Scenario: Renommage vers ID existant
- **GIVEN** un noeud `etape-1` et un noeud `etape-2`
- **WHEN** l'auteur tente de renommer `etape-1` en `etape-2`
- **THEN** le renommage est refuse avec le message "Cet ID est deja utilise"

### Requirement: Duplication de noeud

Le Studio SHALL fournir un bouton de duplication dans l'Inspecteur et la NodeList. La duplication SHALL creer une copie du noeud avec un ID genere (suffixe `-copy` ou increment numerique), en conservant toutes ses proprietes (module, activation, latch, discovery, effects, inventoryRef).

Le noeud duplique SHALL etre place a cote du noeud source sur le canvas (position legèrement decalée). Seules les aretes entrantes/sortantes du noeud source ne sont PAS dupliquees (le noeud copie est isolé par defaut).

#### Scenario: Duplication d'un noeud
- **GIVEN** un noeud `chateau-1` avec un module QUIZ et 2 conditions
- **WHEN** l'auteur clique sur dupliquer
- **THEN** un nouveau noeud `chateau-1-copy` est cree avec le meme module et les memes conditions, positionne a cote sur le canvas

### Requirement: Noeud START par defaut dans un jeu nouveau

Un jeu cree via `jeuVide()` (nouveau jeu vierge) SHALL contenir par defaut un noeud `start` de type `INFO` avec `isEnding: false` et une activation vide. Ce noeud sert de point de depart pour l'auteur et garantit que le canvas n'est jamais vide a l'ouverture.

Le noeud `start` ne peut pas etre supprime tant qu'il est le seul noeud du jeu (meme logique que `isEnding` : un jeu sans noeud est inutilisable).

#### Scenario: Nouveau jeu avec noeud start
- **GIVEN** un auteur qui cree un nouveau jeu
- **WHEN** le jeu est initialise
- **THEN** le canvas contient un noeud `start` (type INFO) positionne au centre, et l'auteur peut commencer a le configurer

#### Scenario: Jeu importe sans noeud start
- **GIVEN** un fichier JSON importe sans aucun noeud
- **WHEN** l'import est charge dans le Studio
- **THEN** un noeud `start` est ajoute automatiquement (comportement identique a `jeuVide()`)

### Requirement: Detection de references orphelines

Le validateur applicatif (couche 2) SHALL detecter les references a des nodeId inexistants dans le jeu : conditions `NODE_COMPLETED`, `POOL_DRAWN`, `anchorNodeId` de TIMER, effects `REVEAL_NODE`/`UNLOCK_NODE`, `sourceNode` de discovery, `candidates` de RANDOM_POOL, et tout autre champ referencant un nodeId absent de `game.nodes`.

Chaque reference orpheline SHALL produire une erreur C2 dans la categorie "references", avec le nodeId source et le champ fautif identifies.

#### Scenario: Reference orpheline apres suppression
- **GIVEN** un jeu ou le noeud `etape-2` a ete supprime mais `etape-1` contient encore une condition `NODE_COMPLETED` vers `etape-2`
- **WHEN** le validateur tourne
- **THEN** le jeu est rejete avec l'erreur C2 : "Reference orpheline : etape-1.condition[0] pointe vers etape-2 (inexistant)"
