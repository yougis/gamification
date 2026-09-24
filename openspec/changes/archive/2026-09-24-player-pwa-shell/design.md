## Context

État observé : le moteur existe en double (TS `studio/src/game/evaluate.ts` éprouvé par le preview, Kotlin `shared/.../GameEngine.kt` en migration 9/29), l'UI commune Compose (thème, graphe, QUIZ, nav) existe côté `shared`, aucun shell web n'existe (Studio = React+Vite sans plugin PWA, player sans cible wasmJs). Le registre déclare déjà `needsGPS/needsCompass/needsCamera/needsMap/needsLock`. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- PWA adossée au moteur `shared` (pas de 3e implémentation), offline-first à parité manifest avec le natif.
- Export unique multi-canal + verdicts de compatibilité par cible.
- Flotte iPad sans compte Apple ni provisioning.

**Non-Goals:**
- GPS de fond, push et verrouillage OS en PWA (limites plateforme actées, pas contournées).
- Refonte du Studio en PWA (le Studio reste une webapp classique).
- Store natif (change ultérieur dédié, déjà prévu).

## Decisions

### D1 — Cible wasmJs dans `shared`, pas de moteur TS web

**Décision** : la PWA consomme `GameEngine.kt` + écrans Compose via une cible `wasmJs`, avec `actuals` web (Geolocation premier plan, DeviceOrientation avec demande de permission iOS, fichier/URL, stockage local). Le moteur TS du Studio reste l'outil de preview/auteur, jamais un runtime joueur.

**Alternative écartée** : coquille React sur `evaluate.ts` — créerait une 3e vérité métier et contredirait `kmp-native-boundary` (le web est une plateforme d'`actuals`, pas un fork).

### D2 — Offline à parité manifest

**Décision** : service worker + Cache API pour l'app shell et les assets, persistance (progression/tirages/events/inventaire) en stockage local avec écriture immédiate et `persist()`, revérification SHA-256 du manifest au lancement, pack non lançable si partiel — exactement le contrat natif, même libellés d'état.

**Alternative écartée** : SQLite-wasm complet d'emblée — surdimensionné avant preuve d'usage ; le stockage clé-valeur couvre le schéma actuel, migration documentée si le volume l'exige.

### D3 — Compatibilité = lecture du graphe, pas de nouveau champ

**Décision** : l'évaluateur croise conditions (`GEOFENCE` fond, `PROXIMITY_MASTER`→BLE), `needs*` du registre, `holdMode` et tuiles contre la matrice versionnée des canaux ; verdicts `compatible/dégradé/refusé` avec motifs nommés, à l'export (blocage si refusé) comme au lancement (revérification locale).

**Alternative écartée** : champ `canaux` dans le JSON du jeu — ferait diverger les exports et casserait « même jeu, deux canaux ».

### D4 — Flotte par Web Clip, kiosque par procédure

**Décision** : distribution flotte via Web Clip MDM (ou « Ajouter à l'écran d'accueil »), verrouillage via Guided Access manuel + fiche animateur quand `holdMode != "none"`. Aucune prétention de verrouillage OS côté web.

**Alternative écartée** : verrouillage logiciel maison (plein écran + interception touches) — contournable, fausse sécurité, contraire à l'honnêteté du spec kiosque.

## Risks / Trade-offs

- [Purge stockage iOS sous pression] → mitigation : `persist()` + consigne d'ouverture en ligne avant terrain + revérification manifest au lancement (échec explicite, pas de partie corrompue).
- [wasmJs/Compose : maturité debug] → mitigation : périmètre PWA = écrans existants (graphe, QUIZ) d'abord, modules exotiques ensuite ; natif reste le canal de référence.
- [Dérive TS/Kotlin] → mitigation : le contrat opposable reste les specs + `game-5poi` rejoué des deux côtés ; la PWA ne duplique aucune règle.
- [Matrice qui vieillit] → mitigation : matrice versionnée relue comme donnée, testée (PWA ne déclare jamais fond GPS ni lock).
