## ADDED Requirements

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
