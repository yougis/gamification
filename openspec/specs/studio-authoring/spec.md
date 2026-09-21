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

La navigation latérale SHALL être repliable en une colonne d'icônes sur grand écran, avec accès direct aux actions de création (Étape, Lieu, Tirage, Fin) dans l'état replié.

#### Scenario: Navigation sans perte d'état
- **GIVEN** un auteur ayant composé 3 nœuds dans Composer
- **WHEN** il navigue vers Valider puis revient vers Composer
- **THEN** les 3 nœuds, la sélection et l'historique undo/redo sont inchangés

#### Scenario: Menu replié avec actions de création
- **GIVEN** le Studio en mode grand écran avec le menu latéral replié
- **WHEN** l'auteur regarde la barre latérale
- **THEN** les boutons de création (Étape, Lieu, Tirage, Fin) sont visibles en tant qu'icônes cliquables, même sans nœud sélectionné

### Requirement: Canvas graphe détaillé

Le canvas SHALL offrir : nœuds déplaçables de dimensions uniformes sur grille libre, zoom/pan standard, arêtes au rendu par défaut reliant le bas de la source vers le haut de la cible, sélection multiple, alignement/distribution basique, recherche de nœud par nom ou type.

Le canvas SHALL utiliser le rendu par défaut de ReactFlow sans surcharge de style par statut ou par type : pas de fonds, rails, ombres ni bordures custom sur les nœuds ; pas de couleurs, pointillés, marqueurs ni pilules sur les arêtes. Chaque arête SHALL porter son libellé de condition en texte simple (prop standard).

Le statut `draft` SHALL rester visible dans la liste des étapes, l'écran Relire et le blocage d'export — jamais sur le nœud du canvas lui-même.

La sélection (simple et multiple) SHALL être stable : sélectionner un nœud ne SHALL jamais déclencher de boucle de re-rendu (`Maximum update depth exceeded`). Un événement de sélection identique à la sélection courante SHALL ne produire aucun changement d'état observable.

Seul un déplacement réel SHALL modifier les positions persistées des nœuds. Une sélection sans déplacement SHALL laisser les positions strictement inchangées.

Le recadrage automatique SHALL intervenir uniquement au montage du canvas, à l'arrivée du premier nœud, ou sur action explicite `Recentrer`. Il SHALL ne jamais se déclencher en réponse à un zoom/pan manuel ni à une sélection.

Le canvas SHALL n'être présenté comme vide que si le jeu ne contient aucun nœud. Un canvas non monté (graphe replié, autre onglet actif) SHALL ne jamais être présenté comme un graphe vide.

La sélection SHALL être unique et partagée entre le canvas et la liste des étapes : l'ensemble des nœuds sélectionnés est identique des deux côtés à tout instant. Sélectionner dans la liste SHALL surligner le nœud du canvas ; sélectionner sur le canvas SHALL marquer l'élément de la liste.

Un clic simple sur un bloc du canvas ou une ligne de la liste SHALL remplacer la sélection par ce seul nœud. Un clic combiné à la touche Maj SHALL ajouter le nœud à la sélection courante (ou le retirer s'il y est déjà) sans toucher aux autres. Un clic sur le fond vide du canvas SHALL vider toute sélection.

Le Studio SHALL offrir une action « Tout sélectionner / Tout désélectionner » (barre du graphe et en-tête de la liste, même action) : elle SHALL sélectionner tous les nœuds du jeu, ou vider la sélection si tous sont déjà sélectionnés. Son libellé SHALL refléter l'état courant.

Le panneau détail SHALL suivre le nœud primaire (dernier nœud cliqué) ; une sélection multiple SHALL ne jamais ouvrir plusieurs panneaux.

#### Scenario: Boîtes aux dimensions uniformes
- **GIVEN** un jeu avec 5 nœuds aux identifiants de longueurs variées
- **WHEN** le canvas s'affiche
- **THEN** toutes les boîtes ont la même largeur et les libellés restent lisibles sans tronquer l'identifiant

#### Scenario: Liens verticaux bas vers haut
- **GIVEN** un nœud A placé au-dessus d'un nœud B avec une arête A→B
- **WHEN** le canvas s'affiche
- **THEN** le lien sort par le bas de A et entre par le haut de B avec le libellé de condition en texte simple

#### Scenario: Nœud draft reconnaissable sans valider
- **GIVEN** un jeu avec 1 nœud `draft` parmi 5 nœuds
- **WHEN** l'auteur regarde le canvas sans lancer aucune validation
- **THEN** aucune distinction visuelle n'apparaît sur le canvas et la liste des étapes indique le statut `draft` du nœud

#### Scenario: Sélection stable sans boucle
- **GIVEN** un jeu avec 3 nœuds affichés sur le canvas
- **WHEN** l'auteur clique sur un nœud
- **THEN** le nœud devient sélectionné, aucune erreur `Maximum update depth exceeded` n'est levée, et l'interaction suivante reste immédiate

#### Scenario: Sélection identique sans effet
- **GIVEN** un nœud déjà sélectionné sur le canvas
- **WHEN** le même état de sélection est ré-émis
- **THEN** aucun changement d'état observable ne se produit (pas de re-rendu en cascade)

#### Scenario: Seul le déplacement persiste
- **GIVEN** un jeu avec 2 nœuds positionnés
- **WHEN** l'auteur déplace un nœud puis le dépose
- **THEN** la nouvelle position est persistée
- **WHEN** l'auteur sélectionne un nœud sans le déplacer
- **THEN** les positions persistées restent strictement inchangées

#### Scenario: Zoom manuel non contrarié
- **GIVEN** un jeu avec des étapes cadrées sur le canvas
- **WHEN** l'auteur zoome manuellement
- **THEN** aucun recadrage automatique ne ramène la caméra et le niveau de zoom choisi est conservé

#### Scenario: Vide réel distingué du non monté
- **GIVEN** un jeu sans aucun nœud
- **WHEN** l'auteur ouvre le Composer
- **THEN** le canvas indique un graphe vide avec l'aide à la création
- **GIVEN** un jeu avec des nœuds mais le graphe replié ou un autre onglet actif
- **THEN** aucun message de graphe vide n'est présenté pour le canvas

#### Scenario: Clic simple remplace la sélection
- **GIVEN** un jeu avec 3 nœuds dont 2 sélectionnés (Maj+clic)
- **WHEN** l'auteur clique simplement sur le 3e nœud
- **THEN** seul le 3e nœud est sélectionné, dans le canvas comme dans la liste

#### Scenario: Maj+clic ajoute à la sélection
- **GIVEN** un jeu avec 3 nœuds dont 1 sélectionné
- **WHEN** l'auteur Maj+clique sur un 2e nœud
- **THEN** les 2 nœuds sont sélectionnés des deux côtés et le panneau détail suit le 2e nœud
- **WHEN** l'auteur Maj+clique à nouveau sur le 2e nœud
- **THEN** seul le 1er reste sélectionné

#### Scenario: Tout sélectionner puis tout désélectionner
- **GIVEN** un jeu avec 5 nœuds et aucune sélection
- **WHEN** l'auteur active « Tout sélectionner »
- **THEN** les 5 nœuds sont sélectionnés dans le canvas et la liste, et l'action affiche « Tout désélectionner »
- **WHEN** l'auteur active « Tout désélectionner »
- **THEN** plus aucun nœud n'est sélectionné des deux côtés

#### Scenario: Sélection liste reflétée sur le canvas
- **GIVEN** un jeu avec 3 nœuds et aucune sélection
- **WHEN** l'auteur clique sur le 2e élément de la liste des étapes
- **THEN** le 2e nœud est surligné sur le canvas et le panneau détail l'affiche

### Requirement: Inspecteur de nœud

Le panneau d'inspection SHALL présenter des sections fixes dans cet ordre : `module` (type + version) → `activation` → `latch`/rejeu → `discovery` → `effects` → `inventoryRef` → `position`, générées depuis le registre de modules sans aucun champ codé en dur dans l'UI.

Le panneau d'inspection SHALL utiliser un système de sidebar à icônes : une colonne d'icônes identifiant chaque section, avec un contenu qui s'affiche lorsqu'une icône est sélectionnée. Si aucun nœud n'est sélectionné, la sidebar affiche un placeholder indiquant de sélectionner un nœud.

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

#### Scenario: Sidebar à icônes avec placeholder
- **GIVEN** le Composer ouvert sans nœud sélectionné
- **WHEN** l'auteur regarde le panneau d'inspection à droite
- **THEN** une colonne d'icônes est visible, le contenu affiche "Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier"

#### Scenario: Sélection d'une section via icône
- **GIVEN** un nœud sélectionné dans l'inspecteur
- **WHEN** l'auteur clique sur l'icône "Effets" (section 7)
- **THEN** le contenu de la section Effets s'affiche dans le panneau, les autres sections sont masquées

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

### Requirement: Éditeur WYSIWYG screen builder

Le Studio SHALL offrir un éditeur WYSIWYG qui remplace l'Inspector fixe par un panneau de propriétés contextuel. L'éditeur SHALL comporter :
- Un canvas de prévisualisation phone-size (environ 375x667px) dans le panneau central du Composer, affichant les zones (header, content, footer) avec leurs widgets rendus
- Un panneau de propriétés contextuel dans le panneau droit, affichant les propriétés selon la sélection (rien → propriétés nœud, zone → propriétés zone, widget → propriétés widget, module widget → config module + propriétés widget)
- Un sélecteur de template (TemplatePicker) pour choisir parmi des templates de mise en page prédéfinis

Le panneau de propriétés contextuel SHALL conserver les 9 familles de l'Inspector existant (module, activation, latch/rejeu, discovery, effects, inventoryRef, etc.) dans le même ordre, mais dans un panneau contextuel plutôt que fixe. Les warnings `needsLock` et `experienceNeeds` SHALL être affichés dans le panneau contextuel.

Le canvas SHALL être synchronisé avec la sélection du nœud dans le graphe : sélectionner un nœud affiche son screen, modifier le screen met à jour le JSON.

#### Scenario: Bascule de l'Inspector vers le WYSIWYG

- **GIVEN** un auteur habitué à l'Inspector fixe
- **WHEN** le Studio affiche le nouveau Composer
- **THEN** les mêmes sections (module, activation, discovery, effects, etc.) sont disponibles dans le panneau contextuel du WYSIWYG, dans le même ordre

#### Scenario: Sélection de nœud affiche son screen

- **GIVEN** un jeu avec 3 nœuds ayant des screens différents
- **WHEN** l'auteur sélectionne le nœud 2 dans le graphe
- **THEN** le canvas affiche le screen du nœud 2 et le panneau de propriétés affiche ses propriétés

#### Scenario: Modification de widget persistée

- **GIVEN** un nœud avec un widget texte dans la zone header
- **WHEN** l'auteur modifie le texte du widget dans le panneau de propriétés
- **THEN** le texte est mis à jour dans le canvas et dans le JSON du nœud

### Requirement: Navigation graphe/screen dans le Composer

Le Composer SHALL offrir un toggle ou une navigation entre la vue graphe (canvas de nœuds et arêtes) et la vue screen (WYSIWYG du nœud sélectionné). La sélection de nœud SHALL être synchronisée entre les deux vues.

Un raccourci clavier ou bouton SHALL permet basculer rapidement entre la vue graphe et la vue screen du nœud sélectionné.

#### Scenario: Toggle vers la vue screen

- **GIVEN** le Composer en vue graphe avec un nœud sélectionné
- **WHEN** l'auteur clique sur le bouton "Screen" ou utilise le raccourci
- **THEN** le panneau central affiche le WYSIWYG screen du nœud sélectionné

#### Scenario: Retour à la vue graphe

- **GIVEN** le Composer en vue screen
- **WHEN** l'auteur clique sur le bouton "Graphe"
- **THEN** le panneau central revient à la vue graphe avec le même nœud sélectionné

### Requirement: Barre d'outils de création dans la liste

L'écran Composer, lorsque l'onglet "Liste" est actif, SHALL afficher une barre d'outils de création au-dessus de la liste des nœuds. Cette barre SHALL proposer les mêmes actions que la palette du graphe : Étape de jeu, Lieu GPS, Tirage au sort, Fin du jeu.

La barre de création SHALL être visible en permanence lorsque l'onglet Liste est actif, indépendamment de la sélection de nœud.

#### Scenario: Création depuis la liste
- **GIVEN** l'auteur dans l'onglet "Liste" du Composer
- **WHEN** il clique sur "Lieu GPS" dans la barre d'outils
- **THEN** un nouveau nœud de type INFO avec condition GEOFENCE est créé, sélectionné, et la vue bascule vers l'inspecteur

#### Scenario: Barre visible sans sélection
- **GIVEN** l'onglet "Liste" actif sans nœud sélectionné
- **WHEN** l'auteur regarde la barre d'outils
- **THEN** les 4 boutons de création sont visibles et cliquables

### Requirement: Suppression de l'onglet Essai du Composer

Le Composer SHALL ne plus proposer l'onglet "Essai". Le composant Apercu (simulateur de jeu) SHALL être déplacé dans l'écran Prévisualiser, qui devient l'écran unique de simulation pas-à-pas.

L'écran Prévisualiser SHALL intégrer le simulateur Apercu avec les mêmes fonctionnalités qu'auparavant : bypass capteurs, `forceDraw`, injection `sessionId`, flag triche, `forceHoldLock`/`forceHoldExit`.

#### Scenario: Apercu dans Prévisualiser
- **GIVEN** l'auteur navigue vers l'écran Prévisualiser
- **WHEN** il charge un jeu
- **THEN** le simulateur Apercu s'affiche avec les mêmes contrôles qu'auparavant dans l'onglet Essai du Composer

#### Scenario: Composer sans onglet Essai
- **GIVEN** le Composer ouvert
- **WHEN** l'auteur regarde les onglets disponibles
- **THEN** seuls les onglets "Graphe", "Liste" et "Détail" sont affichés (pas "Essai")
