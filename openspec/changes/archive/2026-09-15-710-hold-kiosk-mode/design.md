## Context

Le framework GeoPlay est construit autour d'un graphe de Noeuds
(`LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED`) avec un orchestrateur
et un runtime natif iOS/Android. Le mode `triche/test` et `preview
Studio` existent deja comme modes systeme. Le besoin actuel : un
mode kiosque verrouillant le terminal en flotte fournie, avec sortie
reservee a l'animateur.

Contraintes :
- Offline-first strict : pas de depot de PIN sur serveur distant
- Pas d'exception reseau dans le parcours joueur
- La machine a etats existante ne bouge pas
- Le verrouillage est cote OS, pas cote app

## Goals / Non-Goals

**Goals :**
- Le joueur ne peut pas quitter l'app une fois la session lancee
- Seul l'animateur peut sortir du mode HOLD
- Tous les modes (HOLD ou non) journalisent entrees/sorties
- Le verrouillage est cote OS (Guided Access / Screen Pinning /
  Lock Task Mode)
- Compatible offline-first (PIN stocke localement, configuration
  lue depuis le JSON)

**Non-Goals :**
- Intercepter le bouton Home ou les gestures systeme (impossible
  sans root/MDM)
- Implementer un MDM complet ou COSU (hors socle, a la charge de
  l'equipe ops)
- Modifier les conditions du graphe ou les types de modules
- Implémenter un système de notification d'urgence (a la charge
  du device OS)

## Decisions

### 1. HOLD est un meta-état, pas une condition graphe

**Choix** : `global.holdMode` est un champ du schema racine, pas une
condition de type `GEOFENCE` ou `NODE_COMPLETED`.

**Pourquoi** : HOLD ne change pas le graphe de dépendance entre les
Noeuds. Il enveloppe la session entiere. Si c'était une condition,
il faudrait modifier chaque activation pour `requires: [holdActive]`
ce qui casserait le schema existant et rendrait les jeux non-
compatibles.

**Alternative consideree** : Ajouter un `activation.requires` pour HOLD.
**Rejetee** car trop intrusive et incompatible avec les jeux existsants.

### 2. Verrouillage cote OS, pas cote app

**Choix** : Utiliser Guided Access (iOS) et Screen Pinning /
Lock Task Mode (Android) directement depuis le runtime natif.

**Pourquoi** : Sur iOS/Android stock, aucune app ne peut intercepte
le bouton Home. Le verrouillage cote OS est la seule approche fiable.

**Alternative consideree** : Intercepter les evenements back/home via
un service foreground. **Rejetee** car non fiable et non supportee
par les APIs officielles.

### 3. Sortie animateur uniquement, PAS joueur

**Choix** : Le `holdExit` est un canal admin uniquement. Le joueur
ne peut pas sortir du mode HOLD.

**Pourquoi** : Le but anti-dispersion/triche est annule si le joueur
peut sortir. Le canal admin garantit que seul l'animateur autorise
la fin de session.

**Alternative consideree** : Un geste joueur complexe (sequence de 5
taps sur le logo). **Rejetee** car trop fragile et facilement
decouvrable par un joueur.

### 4. Journalisation systématique pour TOUS les modes

**Choix** : Tout mode de jeu journalise entrees/sorties, pas seulement
HOLD.

**Pourquoi** : L'animateur a besoin d'un audit trail complet pour
tous les jeux, y compris ceux sans verrouillage physique. Le
journal SQLite est le meme infrastructure que les events existants.

**Alternative consideree** : Journalisation optionnelle par jeu.
**Rejetee** car l'audit trail est un besoin transverse.

### 5. PIN stocke localement, jamais en clair dans le JSON

**Choix** : Le PIN est stocke/chiffre localement en SQLite (AES-256)
ou fourni par l'animateur a chaque session (ephemere). Le JSON
source ne contient PAS le PIN en clair.

**Pourquoi** : Le JSON du jeu est partage/exportable. Un PIN en clair
dans le JSON serait accessible a quiconque a le pack. Le chiffrage
local protege le canal d'admin.

**Alternative consideree** : PIN dans le JSON (chiffre par le Studio).
**Rejetee** car le JSON est un fichier texte, la decryption est
triviale.

### 6. Pas de modification de la machine a etats

**Choix** : La machine `LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED`
reste exactement la meme. HOLD est une enveloppe meta-état.

**Pourquoi** : Chaque changement de la machine a etats casserait la
compatibilite avec tous les jeux existsants et les validateurs.
HOLD n'a rien a faire avec les transitions de Noeuds.

**Alternative consideree** : Ajouter `HOLD_LOCKED` comme etat.
**Rejetee** car trop complexe et inutile.

## Risks / Trade-offs

- **[Risque] Guided Access peut etre contourne par un animateur**
  avec un code secret iOS (triple-click side button). **→**
  Documente comme limite connue. Le mode kiosque est une
  dissuasion physique, pas un coffre-fort. L'animateur a le code.

- **[Risque] Lock Task Mode Android peut ne pas fonctionner sur
  tous les appareils OEM** (certains Huawei/Xiaomi ont des
  restrictions). **→** Supporte comme `screenPinning` ou
  `lockTask` selon la capacite du device. Le validateur ne
  verifie pas la capacite device — c'est la responsabilite de
  l'equipe ops avant déploiement.

- **[Trade-off] Le PIN ephemere n'est pas persiste entre sessions**
  si fourni a chaque fois. **→** Acceptable car le format
  `adminPin` avec PIN stocke localement est l'alternative
  recommandee pour les sessions multiples.

- **[Risque] L'OS peut tuer l'app en background pendant HOLD**
  si la memoire est critique. **→** Le runtime rejoint en
  `onPause` + rejoint en `onResume`. Le verrouillage kiosque
  peut se relacher si l'OS tue l'app. Le journal permet de
  detecter cette situation.

## Migration Plan

1. **Schema** : Ajout de `global.holdMode` et `global.holdExit`
   au schema Draft-07. Les jeux existants (sans ces champs) restent
   valides (champs optionnels, defaut `"none"`).

2. **Runtime** : Le runtime detecte `holdMode != "none"` au
   lancement de la session et active le verrouillage OS. Les
   jeux sans HOLD (`"none"` ou absent) ne changent pas de
   comportement.

3. **Studio** : Le MCP ajoute `setHoldMode` / `setHoldExit` /
   `getHoldConfig`. Le Studio existant peut ignorer ces champs
   s'il ne les configure pas.

4. **Validation** : Le validateur applicatif ajoute les regles
   `holdMode`/`holdExit`. Les jeux existants passent (les champs
   sont optionnels).

**Rollback** : Aucun — les champs sont optionnels. Si un jeu n'a
pas `holdMode`, le runtime se comporte comme avant. Si un
validateur trop vieux ne reconnait pas les champs, il rejette le
jeu car `additionalProperties:false` est maintenu.

## Open Questions

- Le PIN doit-il avoir une duree de validite (ex. expire apres
  1h) ou etre permanent pour la session ? **Temporaire pour
  la session** est retenu dans le design ci-dessus.
- Est-ce que `holdExit.adminPanel` doit avoir un timeout auto
  (ex. 5min d'inactivite = re-lock) ? **Non** dans le v1, a
  definir si besoin dans le futur.
- Le `holdExit.method: "adminQR"` implique-t-il que le QR
  genere un ephemeral token ? **Oui**, le QR affiche un token
  a usage unique genere par le runtime, pas le PIN lui-meme.