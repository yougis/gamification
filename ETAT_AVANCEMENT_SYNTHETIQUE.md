# GeoPlay — Spec synthétique d'état d'avancement (2026-10-01)

> 1 fichier, lecture 3 min : où en est la plateforme "fabrique de jeux offline" (pas un jeu).

## 1. Socle opposable — FAIT

- **Principe** : Jeu = graphe orienté `nodes[]` + `activation {requires[], operator AND|OR}` + registre extensible. Même schéma Draft-07 côté Studio et runtime. Offline-first strict (fichiers app + SQLite, manifest `{path,version,size,sha256}` vérifié par fichier, partiel = non lançable).
- **Socle 000→500 archivé** + **90 changes archivés** au 2026-10-01, **29 specs actives** dans `openspec/specs/`.
- **Référence non-régression** : `game-5poi.json` (START → POOL 1/5 → A|B|C|D|E → FIN `isEnding`) + jeu vitrine `sherlock-holmes` (8 nœuds habillés WYSIWYG, images pack-only, validation C1+C2 verte).
- **Cycle moteur figé** : `LOCKED → UNLOCKED → COMPLETED` (+ `latch`, `allowCycle/onReentry/maxReentries`, pools `ON_GAME_START/ON_POOL_ACTIVATION` persistés par `sessionId`, terminaison par `isEnding`). Pas d'état `ACTIVE`/file (supprimé).
- **Validation double couche** : C1 Draft-07 (AJV, `additionalProperties:false`) + C2 applicative (cycles, atteignabilité sous hypothèse favorable, topo pools, `drawCount<=len`, AND-sur-exclusif direct, HOLD, refs orphelines). Niveaux `erreur/avertissement/info`, corrections en 3 tas (auto / 1-clic / jamais).

## 2. Studio Web — MATURE (Vite + React)

- **Composer 3 colonnes** : liste (box étapes + arbre widgets + entrée Accueil) / centre (Graphe-Carte-Screen, jamais repliable) / détail (Inspecteur 9 familles à tabs icônes). Undo/redo via opérations MCP nommées uniquement.
- **Screen-builder WYSIWYG** : `node.screen` + `global.screen` (template + héritage global→écran→widget), 7 widgets en 3 strates (1 contenu passif / 2 lié passif `map` / 3 moteur `module`), templates, viewports phone/tablette, `PhoneCanvas` unique aussi pour HOME.
- **Plugins modules** : QUIZ / CODE_INPUT / INFO (références), PUZZLE (tuiles `tileRows×tileCols` 2-6, slide/drag), DIFFERENCE_GAME (rect+polygone en %, traceur grand format écran Modules), AR_MARKER (fallback 2D obligatoire), BOUSSOLE (interne, jamais d'event orchestre). `INFO` enregistré au registre (`info.json`), `global.minigameDefaults` surchargeable.
- **Carte/plan** : toggle Graphe/Carte, MapLibre pack-only + fallback uni pastillé, indoor `indoorPlans` + calibration 2-clics, drag/click, bbox auto, avertissement chevauchement.
- **Transverses** : catalogue distant (`GET /games`, code 4 chiffres non-sécu, CORS, import validé C1+C2), inventaire (objets + `recipes` + events `ITEM_*` + import catalogue), Relire (`draft|reviewed|published`), Valider (blocs C1/C2/avertissements, erreurs structurées `{code,noeud,champ}` + bouton Voir + Corriger), Exporter porte unique + `compat natif` + JSON brut debug, autosave `geoplay-draft-v1`, thème sombre/clair, HOME-seul (`nodes:[]` valide si HOME).

## 3. Player natif — EN COURS DE BASCULE KMP

- **Cible** : `shared` KMP `commonMain` (moteur, orchestrateur, SQLite, `ScreenRenderer`, `HomeDashboard`, `MapWidget`) hébergé via `ComposeView` sur Android + iOS. `wasmJs` = simulateur Studio uniquement, jamais distribué.
- **Fait (sept-oct 2026)** : import vérifié (QR/lien/fichier/catalogue), catalogue local par `gameId` (unicité, remplacement, suppression, reset triche), parité Android-Compose (quiz-focus, carte POI), immersion (ouverture directe éligible, enchaînement auto, HOME dashboard avec rebours `TIMER/WINDOW/dureeTotale`), inventaire persistant + toolbox overlay.
- **Simulateur Compose-Web sans PWA** (remplace iframe `/emulate`) : appel direct renderer `commonMain`, jeu en mémoire, budget fermé (naviguer, cliquer, quiz sans score, code sans validation, mock GPS/boussole clavier/souris), strates pointeurs (conteneurs traversants, seuls contrôles opaques, chute vers fond, overlay masquable avec badge SIMULÉ), jamais session/score/event/inventaire/offline.

## 4. Chantiers ouverts (11 changes non archivés) — le révélateur

| Change | Signal |
|---|---|
| `carte-joueur-navigable`, `carte-plein-ecran-hauteur`, `clic-carte-valide`, `carte-fond-flottant` | Finition carte joueur/simulateur (pan depuis tuile, plein-écran HOME, traversée pointeurs) |
| `pack-tuiles-effectif`, `pack-zip-diff-tuiles`, `smart-tile-caching` | Pack tuiles réel : bbox `fixed/viewport/radius/none`, diff zip, cache intelligent |
| `indoor-plan-schema` | Généralisation indoor (`position.planId/x/y`, `scale`) |
| `screen-subpages`, `pastille-validation-source`, `publication-empreinte-nom`, `preview-pwa-iframe` | Nettoyage : sous-pages screen, source unique pastille, empreinte publication, suppression iframe PWA |

`git status` au 01/10 : 5 changes `overlay / player-compose / local-catalog / simu-carte / simu-strates` supprimés de l'arbre (en cours d'archivage) — signe du basculement simu+PWA→Compose.

## 5. Différés assumés (hors socle)

`600-sync-scoring-master` (P2P+resync), `610-branding-system-modes`, `620-i18n-difficulty` (partiel : overrides + glossaire verrouillé faits), `630-window-conditional` (WINDOW socle fait, `onMiss/récurrence` non), `640-a11y-battery-sos`, `710-hold-kiosk-mode` (spec faite, runtime partiel).

## 6. Verdict en 1 phrase

**Studio auteur quasi-complet et jouable offline de bout en bout ; player en pleine migration KMP/Compose avec HOME et catalogue local stabilisés ; reste à clore : pack tuiles effectif + finition carte/simulateur, puis archiver les 11 changes ouverts.**

*Sources : `ROADMAP.md`, `PRODUCT.md`, `openspec/config.yaml`, `openspec/specs/*/spec.md` (29), `openspec/changes/archive/` (90), `studio/src`, `player/shared`, `git log` 2bea51e.*
