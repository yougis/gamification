## 1. Service catalogue (design D1-D2)

- [x] 1.1 Squelette du service (santé, stockage FS + index code↔jeu↔versions) ; vérifier : le service démarre et répond sur sa route de santé
- [x] 1.2 `POST /publish` (refus si pack invalide couches 1+2, attribution/tirage du code à 4 chiffres, version courante) ; vérifier : publier deux jeux donne deux codes distincts, republier garde le code et ajoute une version
- [x] 1.3 `GET /games/:code` (pack courant byte-identique à l'export) + historique des versions + `GET /games` (liste code/nom/version/date) + anti-rafale de base ; vérifier : code inconnu → 404 propre, pack altéré détectable côté player, liste complète et stable

## 2. Studio et players (design D3-D4)

- [x] 2.1 Action « Publier » dans le Studio (via `exportPackFull`, affichage du code, republication) ; vérifier : publier → code affiché, republier → même code, export fichier inchangé
- [x] 2.2 Saisie du code dans le player natif + PWA (QR/lien pré-remplissent, téléchargement puis vérification manifest existante, réutilisation si déjà vérifié) ; vérifier : `4217` → jeu offline, `0000` → « code inconnu », corrompu → refus avec fichier nommé
- [x] 2.3 Écran Importer = browser catalogue (liste `GET /games`, recherche par nom/code, filtre côté Studio, import via pipeline existant) ; panneau d'historique retiré de l'écran (données locales conservées, import fichier en voie secondaire) ; vérifier : recherche « vieux » → seul jeu attendu, import → éditeur après validation, aucun panneau historique affiché

## 3. Vérification finale

- [x] 3.1 Rejouer les scénarios du delta (publication, republication, unicité, code public assumé, offline, inconnu, altéré, recherche catalogue, import depuis la liste, historique absent) ; vérifier chaque scénario et consigner le résultat
- [x] 3.2 Non-régression : export fichier byte-identique, `validate --specs` OK, jeux existants jouables sans le service ; vérifier et consigner

## Constats de vérification (2026-09-25, session apply)
- 2.2 : Android (`PackManager.importPackFromCatalog` + saisie code/URL + deep-link/QR + « code inconnu » + refus nommé + réutilisation) et PWA (`loadCodePack` + pré-remplissage `?code=&service=`) relus complets ; iOS implémenté dans la session (`ContentView` saisie code + URLSession + `verifyPackJson` shared + réutilisation + scheme `geoplay://`, `Info.plist` à jour) — relecture seule, pas de Xcode sur ce poste, compilation macOS restante ; scan QR caméra iOS non couvert (AVFoundation, à trancher : reporté au change player-kmp-migration sauf avis contraire).
- 3.1 : service `node --test catalog/server.test.js` 6/6 ; `studio/catalog.smoke.ts` ALL OK ; `shared` JVM `PackImportCommonTest` 7/7 (dont 2 nouveaux `verifyPackJson`) ; Android `CatalogImportTest` 3/3 ; recherche/import/historique-absent vérifiés dans l'écran Importer.
- 3.2 : `validate --specs` 26/26 ; `studio/pack.smoke.ts` PACK SMOKE OK ; `tsc --noEmit` studio 0 erreur ; voies fichier/URL existantes intouchées.
