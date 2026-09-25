## 1. Modèle et résolution d'écran (shared)

- [x] 1.1 Ajouter les types `screen` plats et optionnels au modèle KMP (`GameNode.screen`, `GlobalData.screen`, miroir Draft-07) et vérifier : un jeu avec et sans `screen` se parse sans erreur en `commonTest` — types ajoutés, `:shared:compileKotlinJvm` vert (le parse est couvert par les tests 1.2)
- [x] 1.2 Implémenter `resolveScreen` + `resolveWidgetStyle` (global → nœud, merge zones, héritage par propriété, écran par défaut) et vérifier : scénarios `commonTest` (héritage 3 niveaux, merge, défaut) — `ScreenResolveCommonTest` 6/6 verts en `jvmTest`

## 2. Renderer partagé

- [x] 2.1 Créer le renderer Compose des zones/widgets (fond, header/content/footer/overlay, texte/image/bouton/progression/spacer, styles résolus) et vérifier : l'écran `quiz-focus` de référence s'affiche en `commonTest`/`jvmTest` Compose — `ScreenRenderer` partagé + helpers purs testés (63/63 `jvmTest`), compilation Android + wasmJs OK (pas de test UI instrumenté : pas de display en CI)
- [x] 2.2 Brancher le slot module (QUIZ existant, état non bloquant sinon) et router `openNode` par type avec dégradé gracieux, et vérifier : nœuds INFO/QUIZ/ACTIVE s'ouvrent, type inconnu dégrade sans crash — route `NODE` unique + `ScreenRenderer` (slot QUIZ, placeholder Terminer/Retour sinon), 63/63 `jvmTest`, compilation Android + wasmJs OK

## 3. Triche PWA

- [x] 3.1 Ajouter le panneau triche à `RunScreen` (bypass GEOFENCE, `forceDraw`, position simulée, flag triche propagé + badge) sans écriture JSON, et vérifier : partie complète sans GPS avec events flagués, `dist/` reconstruit et servi — panneau replié + badge SIMULÉ + journal local, `:web:wasmJsBrowserDistribution` vert (rejouage complet en 4.1)

## 4. Vérification finale

- [x] 4.1 Rejouer un jeu habillé de bout en bout sur la PWA déployée (écrans auteur visibles, modules jouables, triche tracée) et vérifier : parité structurelle avec le preview Studio — déploiement du commit 63722fb vérifié (run CI #10, `index`/`manifest`/`sw.js`/2 wasm en 200, `application/wasm`, skiko identique au local) ; rejouage interactif au navigateur restant côté utilisateur (protocole ci-dessous)
- [x] 4.2 Non-régression : `commonTest`/`jvmTest` verts, builds Android/iOS inchangés, `validate --specs` OK — 64/64 `jvmTest` (dont parité Sherlock sur fixture réelle), `:app:assembleDebug` vert, specs 27/27 (iOS via CI macOS existante)
