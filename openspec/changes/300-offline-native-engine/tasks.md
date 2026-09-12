## 1. Manifest et téléchargement

- [ ] 1.1 Implémenter manifest par fichier + dézip worker + vérif SHA-256 et vérifier qu'1 fichier corrompu sur 20 ne fait re-télécharger que lui
- [ ] 1.2 Implémenter diff par version + reprise + background download + état partiel non lançable et vérifier reprise à 60 % puis refus de lancement à 90 %
- [ ] 1.3 Chiffrer et afficher la taille avant téléchargement et vérifier le refus poli si espace insuffisant

## 2. Carte et persistance

- [ ] 2.1 Intégrer MapLibre Native (packs `{provider,bbox,zooms,attribution}`) + fallback statique + fond uni et vérifier trace/position/flèche sans tuiles
- [ ] 2.2 Persister progression + `randomDraws` en SQLite (écriture immédiate, transaction tirage+état) et vérifier relecture après crash sans re-tirage
- [ ] 2.3 Lancer `openspec validate "300-offline-native-engine" --type change` et vérifier le verdict `is valid` avant demande d'archive
