# Design — solde-carte-pack-indoor-subpages

Pas d'architecture nouvelle : ce change est un solde. Stratégie : ne rien ré-implémenter, seulement recoller specs↔code et vérifier.

## 1. Indoor (`game-schema`)

- Problème : le delta `indoor-plan-schema/specs/game-schema/spec.md` est périmé (MODIFIED sans les 5 scénarios durée/HOME + `inventoryAccess`) → `openspec validate` ERROR, archive bloquée. Le code est déjà en place (`types.ts IndoorPlan/NodePosition`, `game-schema.json`, `validate.ts` exclusion+planId+scale, `MapView` indoor, `setNodePosition`/`computeBbox*`).
- Solution retenue : le delta de CE change recopie l'exigence socle complète + indoor (fichier `specs/game-schema/spec.md`). À l'archive des deux changes, le résultat fusionné est identique.
- Point ouvert : `addIndoorPlan/removeIndoorPlan` (tâches 4.1-4.2 de l'ancien change) n'existent pas en tant qu'ops nommées — la MapView édite `global.indoorPlans` inline. Trancher en tâche 1 : soit ajouter les 2 ops (undo propre), soit acter l'inline comme suffisant et clore. Pas de 3e voie.

## 2. Pack zip/diff (`offline-pack`, `player-install` — vérification seule)

- Déjà codé : `tiles.json` généré et manifesté (`mcp.ts`), export `.zip` streaming avec contrôle taille (`App.tsx genererZip` + `game/zip.ts`), diff par manifests + bascule atomique + cohérence manifest↔index (`PackManager.kt`).
- Aucun delta spec dans ce change (comportements déjà spécifiés et valides). Tâche unique : `openspec validate --all` + tests (`catalog/server.test.js`, `jvmTest`, smokes Studio, `assembleDebug`) verts.

## 3. Sous-pages (PWA → KMP)

- Règle `paginateContent` + miroir Kotlin + `SubPageNav` + fit `contain` déjà codés et testés (Sherlock oracle 70/70). Seul le 4.1 « PWA déployée » est caduc.
- Ce change modifie `player-screen-render` : la preuve de parité se fait sur renderer partagé + `PlayerTerminal` (portrait+paysage, swipe+boutons), sans iframe/PWA. Suppression explicite de la cible PWA dans le requirement (contradiction levée à la source).

## 4. Retraits actés (pas de code)

- `preview-pwa-iframe` : archiver en rejet documenté (supplanté par `2026-09-30-simulateur-compose-sans-pwa` + specs `compose-web-simulator`/`studio-authoring`). Vérifié : aucune référence `/emulate`/iframe ne subsiste dans `studio/vite.config.ts`, `App.tsx`, `catalog/server.js`.
- Les 9 autres changes à tâches 100 % : archive directe, leurs deltas valides fusionnent sans retouche.
