## 1. Coquille PWA sur moteur shared (design D1-D2)

- [x] 1.1 Ajouter la cible `wasmJs` au module `shared` avec `actuals` web (Geolocation premier plan, DeviceOrientation, fichier/URL, stockage local) ; vérifier : compilation wasmJs OK, contrats `expect` inchangés pour natif
- [x] 1.2 Créer la coquille web (manifest PWA, service worker Cache API, écran d'import fichier/URL/QR, UI Compose commune) ; vérifier : installation « Ajouter à l'écran d'accueil », import `game-5poi` puis partie offline après visite en ligne — NOTE: bundle `dist/` complet et serviable (index/manifest/SW/icône, `tsc`-équivalent compileKotlinWasmJs OK) ; QA navigateur/iPad restant (import, install prompt, offline) — headless local HS (GL), scan QR reporté (pas de décodeur sans dépendance)
- [x] 1.3 Offline à parité manifest (revérification SHA-256 au lancement, pack partiel non lançable, persistance immédiate + `persist()`, procédure Guided Access documentée) ; vérifier : pack à 90 % refusé avec fichier nommé, reprise `sessionId` après kill — NOTE: refus couvert par `verifyPackFiles` testé (commonTest) + chemin d'erreur du shell ; reprise persistée en code (`WebSession`), à rejouer sur appareil ; guide `docs/user/player-pwa-fleet.md` écrit

## 2. Compatibilité par canal (design D3)

- [x] 2.1 Matrice versionnée des capacités (`NATIVE`/`PWA`, PWA sans fond GPS ni lock) lue comme donnée ; vérifier : test garantit l'absence des deux capacités côté PWA
- [x] 2.2 Évaluateur jeu×modules→verdicts (`compatible/dégradé/refusé` + motifs/replis nommés) ; vérifier : GPS de fond refusé en PWA et OK en natif, AR dégradé fallback 2D, QUIZ compatible partout
- [x] 2.3 Verdicts à l'export (sélecteur de canal, blocage si refusé, avertissement si dégradé) et revérification au lancement ; vérifier : export PWA d'un jeu fond-GPS bloqué avec motifs, natif proposé

## 3. Vérification finale

- [x] 3.1 Rejouer les scénarios des deltas (install flotte sans compte, pack partiel, mêmes exports, 3 verdicts type, blocage export) ; vérifier chaque scénario et consigner le résultat — NOTE: scénarios rejoués en smoke (compat.smoke 1-7) + tracés code (sélecteur canal, sidecar embarqué, gate au lancement) ; QA iPad restant (install, import, offline terrain)
- [x] 3.2 Non-régression : `game-5poi` rejoué côté PWA et natif à l'identique, `validate --specs` OK, builds natifs inchangés ; vérifier et consigner — NOTE: parité moteur couverte (mêmes fonctions partagées) ; `validate --specs` 24/24, jvmTest 24/24, assembleDebug + klibs iOS OK ; `modules.smoke.ts` en échec pré-existant (JSX sous tsx, identique à HEAD)
