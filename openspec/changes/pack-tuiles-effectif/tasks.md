## 1. Phase A — câblage de l'actif dans l'aperçu

- [x] 1.1 Brancher `fondEffectifWidget()` dans `MapWidgetRenderer` et vérifier la pastille « pack actif » s'affiche dans le canvas Screen comme dans l'aperçu Home
- [x] 1.2 Afficher la mention « fond uni — aucun pack actif » sans pack désigné et vérifier marqueurs et position restent visibles
- [x] 1.3 Étendre le smoke tuiles (pastille/repli dans les deux PhoneCanvas) et vérifier `npx tsx tile-caching.smoke.ts` passe

## 2. Phase B — tuiles visibles en prévisualisation auteur

- [x] 2.1 Charger les tuiles dans `MapWidgetRenderer` via la source d'aperçu du Studio quand un pack actif existe et vérifier les tuiles s'affichent avec le badge « aperçu en ligne »
- [x] 2.2 Replier sur le schéma uni sans réseau ou sans actif et vérifier aucun appel réseau n'est tenté hors-ligne
- [x] 2.3 Vérifier le JSON du jeu ne contient aucune URL après aperçu (pack-only strict) via la validation Draft-07 sur un jeu témoin

## 3. Phase C — téléchargement réel et pack joueur

- [x] 3.1 Télécharger les octets (bbox × zooms, throttlé, attribution) à la génération avec progression % et vérifier les SHA-256 un par un
- [x] 3.2 Stocker les octets côté serveur (`<gameId>/tilepacks/<pack>/tuiles/...`) et vérifier re-téléchargement + suppression purgeant métas et octets
- [x] 3.3 Embarquer les tuiles du pack actif à l'export (une entrée manifest par tuile) et vérifier le pack joueur affiche la carte offline après import
- [x] 3.4 Faire respecter le périmètre bbox + le seuil de confirmation avant génération et vérifier une bbox abusive est refusée ou confirmée explicitement
- [x] 3.5 Étendre les tests serveur (`catalog/server.test.js`, cas octets + purge) et vérifier `node --test catalog/server.test.js` passe 100 %
