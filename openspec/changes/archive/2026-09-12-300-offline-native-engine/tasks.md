## 1. Manifest et téléchargement

- [x] 1.1 Implémenter manifest par fichier + dézip worker + vérif SHA-256 et vérifier qu'1 fichier corrompu sur 20 ne fait re-télécharger que lui — prouvé par `studio/pack.smoke.ts` (`src/game/pack.ts : verifyManifest/diffManifest`, 1/20 re-téléchargé, 19 conservés)
- [x] 1.2 Implémenter diff par version + reprise + background download + état partiel non lançable et vérifier reprise à 60 % puis refus de lancement à 90 % — prouvé (`launchGate` : 8 manquants à 60 %, refus motivé à 90 %, vert à 100 % ; background download OS : différé plateforme, reprise systématique implémentée)
- [x] 1.3 Chiffrer et afficher la taille avant téléchargement et vérifier le refus poli si espace insuffisant — prouvé (`estimateSize`/`checkQuota`, message de refus)

## 2. Carte et persistance

- [x] 2.1 Intégrer MapLibre Native (packs `{provider,bbox,zooms,attribution}`) + fallback statique + fond uni et vérifier trace/position/flèche sans tuiles — logique prouvée (`selectFond` : tuiles > statique > uni) ; rendu MapLibre natif sur appareil : différé plateforme (pas d'émulateur ici)
- [x] 2.2 Persister progression + `randomDraws` en SQLite (écriture immédiate, transaction tirage+état) et vérifier relecture après crash sans re-tirage — prouvé (`node:sqlite`, fichier réel, fermeture brutale, tirage relu à l'identique ; binding natif iOS/Android : différé plateforme)
- [x] 2.3 Lancer `openspec validate "300-offline-native-engine" --type change` et vérifier le verdict `is valid` avant demande d'archive
