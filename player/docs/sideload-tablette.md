# Sideload borne associative — Player GeoPlay (POC, sans compte Google)

## 1. Installer l'APK (tâche 2.2)
1. Copier `player/app/build/outputs/apk/debug/app-debug.apk` (6,5 Mo, `versionCode` 1 = app, jamais pack) sur clé USB.
2. Sur tablette : Paramètres → Sécurité → **Sources inconnues** → autoriser le gestionnaire de fichiers.
3. Installer l'APK, ouvrir **GeoPlay Player**. Aucun compte Google, aucun réseau requis après import.

## 2. Importer le pack par fichier (scénario borne, offline)
1. Accueil → **Importer** → **Choisir un fichier** → sélectionner le `.zip` du pack Studio (ou `game.json` seul pour la démo).
2. Le Player vérifie le `manifest.json` **fichier par fichier (SHA-256)** :
   - pack vérifié → « Pack verifie : jeu demarrable offline » → navigation vers la partie ;
   - pack partiel/corrompu → **refus explicite** « Pack refuse (X %) : Fichier manquant/corrompu : <path> », rien n'est installé (gating).
3. QR borne : le QR encode `geoplay://import?url=<https vers .zip>` ou l'URL directe ; le scanner système remplit le champ URL et relance le même moteur d'import. Sans scanner installé, coller l'URL manuellement (même vérification).
4. Démo embarquée : sans pack installé, la partie charge `assets/reference-5poi.json` (tirage → branche → FIN, preuve `GameEngineTest` 3/3).

## 3. Permissions demandées et justifiées (dans le flux)
| Permission | Moment | Justification affichée | Secours si refus |
|---|---|---|---|
| Localisation précise (`ACCESS_FINE_LOCATION`) | Ouverture de la partie (`GameFragment`) | « La position sert à débloquer les étapes proches (geofence). » | Carte + distance texte, étapes graphe restant jouables ; message « précision insuffisante » si `maxAccuracyM` dépassé |
| Localisation arrière-plan | Jamais au POC (aucun service déclaré ni démarré) | — | — |
| Bluetooth (`SCAN`/`CONNECT`, `BLE`) | Étape `PROXIMITY_MASTER` uniquement (à la demande) | « Le MASTER temporaire (téléphone animateur / Arduino) prouve la présence sans GPS. » | QR / code tournant / validation animateur (module, jamais condition de position) |
| Caméra | Scanner QR / module `AR_MARKER` uniquement | « Scanner le QR du pack / viser le marqueur. » | Saisie manuelle URL + fallback 2D obligatoire (`AR_MARKER`) |
| Stockage / fichiers | Import fichier (sélecteur système) | Fichiers app + SQLite, pack dézippé en cache puis vérifié | Import URL / QR |
| Internet / réseau | Import URL uniquement | Téléchargement du pack, reprise et diff par version | Import fichier offline ; jeu **0 réseau** ensuite |
| Notifications / premier plan | Non utilisées au POC | — | — |

`versionCode` suit l'app, `version` suit le manifest du pack : une mise à jour de contenu n'exige jamais une mise à jour d'app (ni l'inverse).

## 4. Vérification POC (tâche 2.2, sans tablette physique)
- `assembleDebug` + `testDebugUnitTest` verts sur le poste (dont `GameEngineTest` : tirage → branche → FIN).
- Aucune dépendance Google : pas de Play Services / Firebase dans `build.gradle.kts`, méta-donnée `geo.API_KEY` et activités fantômes (`GameActivity`, `ImportActivity`, `LocationTrackingService`) retirées du manifest ; le deep-link `geoplay://import` est géré par `MainActivity`.
- Aucun compte requis : import par sélecteur système (`ACTION_OPEN_DOCUMENT`), packs et progression en fichiers app + SQLite ; réseau utilisé uniquement pour l'import URL, jeu **0 réseau** ensuite.
