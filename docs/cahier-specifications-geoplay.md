# Cahier de spécifications — GeoPlay Framework (v0 socle 000)

## 1. Objet et destinataires

Ce document spécifie la **plateforme GeoPlay** : un framework natif iOS + Android
de jeux géolocalisés 100 % offline, piloté par un **Studio d'auteur**.
Destinataires : client (collectivité, office de tourisme, musée, opérateur
événementiel), équipe produit, équipe technique.

Principe premier : GeoPlay n'est pas "un jeu" mais une **usine à jeux**.
Tout est générique et réutilisable par n'importe quel créateur.

## 2. Produits livrés

| Produit | Contenu | Utilisateur |
|---|---|---|
| **Studio** | Composition visuelle du graphe, branding, données modules, validation, export JSON + pack offline | Créateur, animateur |
| **App joueur iOS / Android** | Runtime natif : orchestrateur, modules, carte offline, boussole, AR, progression SQLite | Joueur |
| **Pack de Jeu** | JSON + manifest SHA-256 + assets (cartes, images, modèles 3D) | Téléchargé avant terrain, 0 réseau ensuite |

## 3. Parcours types

**Créateur** : compose le graphe → renseigne les modules → fait relire
(`draft` → `reviewed` → `published`) → exporte le pack → le diffuse (QR, lien, borne).
**Animateur** : installe le pack, teste en mode triche (`forceDraw`, bypass geofence),
encadre le groupe, force un tirage si besoin (flag triche tracé).
**Joueur** : télécharge le pack (réseau) → joue 100 % offline → termine sur un
nœud `isEnding` → scores journalisés pour resynchronisation ultérieure.

## 4. Modèle fonctionnel (socle v0)

### 4.1 Graphe, pas liste

Un Jeu = **graphe orienté de Nœuds** + branding + données globales.
Un Nœud = une instance d'un Module (ex. "Falaise d'Aval — Quiz").
Chaque Nœud porte un objet unique `activation {requires[], operator}`.

```
START --> POOL(1/5) --> A|B|C|D|E --> FIN (isEnding)
```

### 4.2 États et présentation

`LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED`.
`UNLOCKED` = éligible, `ACTIVE` = présenté. **Une seule modale `ACTIVE`**,
file d'attente : `GEOFENCE`/`TIMER` en auto, `NODE_COMPLETED`/`POOL_DRAWN`
multiples en choix (menu/carte), jamais empilés.

### 4.3 Latch (exigence terrain)

`activation.latch` par nœud : `true` = reste `UNLOCKED` une fois débloqué ;
`false` = retour `LOCKED` si la condition révocable retombe (sortie de geofence,
avec hystérésis + dwell). Seuls `GEOFENCE` (et futur `WINDOW`) sont révocables.
**`ACTIVE` latche toujours** : une modale ouverte ne se ferme jamais en sortie de zone.

### 4.4 Conditions socle

- `GEOFENCE` : `lat`, `lng`, `radiusMeters` (+ override par Nœud), prédicat
  `enter|exit|dwell|through`, `dwellMs`, hystérésis de sortie, gating `maxAccuracyM`.
  Qualification par accuracy + dwell, sans exigence de constellation.
- `NODE_COMPLETED {nodeId}` : vrai après `COMPLETED`, définitif.
- `TIMER` : délai minimum avant éligibilité, ancre obligatoire
  (`GAME_START` ou `NODE_COMPLETION` + `anchorNodeId`). Jamais d'échéance au graphe ;
  le temps de réponse d'une épreuve vit dans le module (`timeLimitSeconds`).
- `POOL_DRAWN {poolNodeId}` : éligible si tiré par le pool.
- `operator` `AND|OR` **obligatoire si ≥ 2 conditions, interdit si ≤ 1**.
- Réservés enum non outillés : `CONDITIONAL` (gamebook), `WINDOW` (fenêtre horaire).
  Moteur v0 les ignore gracieusement.

### 4.5 Cycles et rejeu (anti-farming)

`allowCycle` (arête, défaut `false`) ≠ `onReentry` (nœud, défaut `ignore`).
`replay` exige `maxReentries` (rejeux après la 1re complétion) et `scoreOnReplay`
(défaut `false` : seule la 1re complétion score). Validateur : ignore les arêtes
`allowCycle:true`, rejette tout cycle résiduel.

### 4.6 Tirage aléatoire

`RANDOM_POOL` = nœud structurel `LOCKED -> (tirage) -> COMPLETED`, jamais `ACTIVE`.
`{candidates[], drawCount, drawTiming ON_POOL_ACTIVATION|ON_GAME_START}`, sans remise.
`drawCount<=len` + unicité inter-pools (validateur applicatif), ordre topo des pools
`ON_GAME_START`, persistance immédiate `randomDraws[sessionId][poolNodeId]`
(Reprendre = même session, Nouvelle partie = nouveau tirage).
Tirage forçable (`forceDraw`) en triche/preview, flag triche sur les events.

### 4.7 Terminaison

Au moins un Nœud `isEnding:true`. Fin = un `isEnding` passe `COMPLETED`.
Validateur : atteignabilité structurelle **sous hypothèse d'environnement favorable**,
`RANDOM_POOL` et `OR` comme alternatifs, **chaque** candidat vers une fin.
Détection AND-sur-branches-exclusives limitée au cas direct (limite documentée).

## 5. Registre de modules (extensible)

| Type socle | Données | Besoins |
|---|---|---|
| `QUIZ` | questions, options, index correct, explication, points, `timeLimitSeconds` | aucun capteur |
| `DIFFERENCE_GAME` (7-erreurs) | source + dérivée + **polygones %** (Alpha→polygones au build) + `touchDilatation` | aucun |
| `PUZZLE` | image, découpage, config | aucun |
| `AR_MARKER` | marqueur, modèle 3D, fallback 2D obligatoire | caméra |
| `BOUSSOLE` | `toleranceDeg`, stabilisation, fallback non-capteur | boussole (service) |

Règles : sous-schéma versionné par type ; ajout = entrée registre, jamais retouche
Nœuds/Liens ; type inconnu = nœud non jouable avec message, jamais de crash ;
**rien en dur** (seuils, URLs, bbox/zooms depuis le JSON).
Boussole = **service moteur non-validant** (flèche POI + distance texte + haptique),
réutilisable en module (validation interne, jamais par l'orchestrateur).
Trace GPX = base auteur + polyline décorative optionnelle.

## 6. Studio d'auteur (MCP + humain)

Même schéma des deux côtés, validation AJV bilatérale. Provenance obligatoire
(`providerId`, licence, `sourceUrl`) par étape/asset. Workflow
`draft → reviewed (+reviewedBy) → published` ; `draft` injouable sauf animateur.
Difficultés (`enfant|famille|expert`) et modes (`normal|animateur|soiree|hardcore`)
en **overrides**, jamais par duplication du graphe. i18n par clés + glossaire
acronymes verrouillé (`auto|reviewed|locked`). Graphe de référence neutre comme fixture.

## 7. Pack offline natif

Manifest `{path, version, size, sha256}` **par fichier**, archive pré-tuilée
dézippée en worker, vérif SHA-256, diff par version, reprise + background download.
**Partiel = non lançable** (état explicite). Fond imagerie configurable
`{provider, bbox, minZoom, maxZoom, attribution}` + fallback statique ; taille
chiffrée **avant** téléchargement. Stockage : fichiers app + SQLite.

## 8. Validation double couche

**Draft-07** est une norme de validation de documents JSON qui impose une structure strictement typée (types, champs requis, enum, `if/then` conditionnel) via le format JSON Schema. C'est la base de la validation formelle des fichiers de jeu GeoPlay.

1. **Norme JSON** (forme locale : types, requis, `operator`, `isEnding`, `activation`).
2. **Applicative** (cycles, atteignabilité, topo pools, `drawCount`, unicité,
   AND-exclusif direct). Un JSON valide en couche 1 peut rester invalide.
   La garantie est structurelle, jamais une preuve d'exécution terrain.

## 9. Modes système et scoring

Socle : **triche/test** (bypass `GEOFENCE`, auto-validation, `forceDraw`) et
**preview Studio** (même bypass, entrée Studio), flag triche sur chaque event.
Scoring multi-session et sync P2P/serveur : différés (lien socle = events +
`scoreOnReplay` + flag). Branding = objet de données (global + surcharge/Nœud).
Rejouabilité, a11y, batterie/SOS, `WINDOW onMiss`, gamebook : roadmap.

## 10. Exigences non fonctionnelles

- **Offline strict** : 0 réseau après téléchargement ; toute exception se justifie.
- **Terrain** : hystérésis anti-jitter, cibles tactiles doigt/gants, jeu jouable
  sans boussole ni caméra (fallbacks), contraste + haptique (jamais couleur seule).
- **Confidentialité** : position traitée sur appareil ;/Minimisation ; pas de
  trajectoire transmise sans consentement (détail en lots suivants).
- **Robustesse** : pack corrompu = 1 seul fichier re-téléchargé ; type inconnu =
  dégradé, pas de crash.

## 11. Roadmap et lots

`000` socle (ce cahier) → `100` schéma de validation JSON → `200` Studio → `300` moteur
offline → `400` viewer/orchestrateur → `500` modules. Différés `600` sync scoring,
`610` branding/modes, `620` i18n/difficultés, `630` WINDOW/gamebook, `640` a11y/batterie.

## 12. Démo de référence : « Lupin et l'Aiguille » (Étretat, famille, ~1 h)

> Univers Arsène Lupin (Maurice Leblanc, domaine public), sans affiliation.
> Lieux publics, **coordonnées d'exemple** à recaler par repérage.

**Synopsis** : Lupin a dispersé 5 indices autour d'Étretat ; le hasard désigne le
premier ; chaque indice résolu rapproche de l'Aiguille ; la révélation finale en AR
clôt le jeu. Démontre POOL, GEOFENCE + latch, file ACTIVE, 5 modules, `forceDraw`.

```
START --> POOL-INDICES (1/5) --> AVAL | AMONT | JARDINS | MARCHE | CHAPELLE
  (POOL_DRAWN + GEOFENCE, latch:true)      (1 module chacun)
A|B|C|D|E COMPLETED (OR) --> FIN "L'Aiguille" (GEOFENCE + AR_MARKER, isEnding)
```

| Nœud | Lieu (exemple) | Module | Activation | Règle démontrée |
|---|---|---|---|---|
| START | Belvédère (49.7075, 0.2050) | écran d'intro | `GAME_START` | — |
| POOL-INDICES | structurel | `RANDOM_POOL` 1/5 | `ON_POOL_ACTIVATION` | tirage persisté |
| AVAL | Falaise d'Aval (49.7055, 0.1985) | `QUIZ` "La lettre d'Aval" | `POOL_DRAWN` + `GEOFENCE r=30 dwell=8s latch:true` | latch hors zone |
| AMONT | Sentier d'Amont (49.7090, 0.2090) | `BOUSSOLE` "Cap sur l'Aiguille" | `POOL_DRAWN` + `GEOFENCE r=25` | service non-validant |
| JARDINS | Jardins (49.7095, 0.2080) | `PUZZLE` "Le vitrail brisé" | `POOL_DRAWN` + `GEOFENCE r=20 dwell=5s` | file ACTIVE |
| MARCHE | Vieux marché (49.7070, 0.2045) | `DIFFERENCE_GAME` "Deux cartes postales" | `POOL_DRAWN` + `GEOFENCE r=20` | polygones + dilatation |
| CHAPELLE | Chapelle (49.7110, 0.2090) | `QUIZ` expert + `timeLimitSeconds` | `POOL_DRAWN` + `GEOFENCE r=25` | temps interne module |
| FIN | Point de vue Aiguille (49.7060, 0.2000) | `AR_MARKER` + fallback 2D, `isEnding` | `OR` des 5 + `GEOFENCE r=30` | terminaison |

**Extrait JSON (abrégé, illustratif)** :

```json
{
  "gameId": "lupin-aiguille-etretat",
  "nodes": [
    {"id": "start", "module": {"type": "INFO"}, "activation": {"requires": [
      {"type": "TIMER", "anchor": "GAME_START", "delayMs": 0}]}},
    {"id": "pool-indices", "randomPool": {"candidates": ["aval", "amont", "jardins", "marche", "chapelle"],
      "drawCount": 1, "drawTiming": "ON_POOL_ACTIVATION"}},
    {"id": "aval", "module": {"type": "QUIZ", "data": {"questions": ["..."]}},
      "activation": {"requires": [{"type": "POOL_DRAWN", "poolNodeId": "pool-indices"},
        {"type": "GEOFENCE", "lat": 49.7055, "lng": 0.1985, "radiusMeters": 30,
         "predicate": "dwell", "dwellMs": 8000}], "operator": "AND", "latch": true}},
    {"id": "fin-aiguille", "isEnding": true, "module": {"type": "AR_MARKER"},
      "activation": {"requires": [{"type": "NODE_COMPLETED", "nodeId": "aval"},
        {"type": "NODE_COMPLETED", "nodeId": "amont"}], "operator": "OR"}}
  ]
}
```

*(Exemple simplifié : en réel, `fin-aiguille` attend OR sur les 5 branches.)*

**Déroulé animateur** : pack pré-chargé en borne ; test `forceDraw:["marche"]` ;
jour J : tirage réel, groupes dispersés, file ACTIVE sans empilement, quiz survivant
aux sorties de zone ; clôture AR collective à l'Aiguille (fallback 2D si vent/soleil).

**Acceptation démo** : pack offline intégralement vérifié SHA-256 ; les 5 branches
atteignent FIN au validateur ; `forceDraw` couvre les 5 ; 1 modale max constatée ;
`draft` absent du pack joueur.

## 13. Critères d'acceptation globaux

- Graphe 1/5→FIN valide couches 1+2 ; AND-exclusif direct rejeté en test.
- Relance même `sessionId` = aucun re-tirage ; nouvelle partie = nouveau tirage.
- Quiz ouvert + sortie de zone = modale conservée ; `latch:false` testé au validateur.
- SHA-256 faux sur 1/20 fichiers = seul ce fichier re-téléchargé, jeu non lançable avant.
- Type inconnu = dégradé message, jeu continué. Triche = flag sur chaque event.

## 14. Glossaire

Voir le **glossaire complet** pour débutants : [`docs/glossary.md`](../glossary.md)

Définitions rapides : Framework, Studio, Jeu, Module, Nœud, activation, `latch`, `allowCycle`/`onReentry`, `isEnding`, `RANDOM_POOL`/`POOL_DRAWN`, `forceDraw`, manifest, fixture, GEOFENCE, TIMEOUT, PROXIMITY_MASTER, HOLD, triche, sessionId.
