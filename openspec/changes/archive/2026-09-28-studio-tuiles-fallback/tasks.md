## 1. Fallback robuste MapView

- [x] 1.1 Compter les erreurs tuiles et basculer sur fond uni + pastille « tuiles indisponibles » au seuil, marqueurs/cercles montés indépendamment du `load`, et vérifier : tuiles coupées → fond uni + pastille + POI cliquables
- [x] 1.2 Écouter `webglcontextlost` vers le même fallback, calmer la rafale (`maxParallelImageRequests: 2`, retry court), message dev sur échecs proxy en boucle, et vérifier : `tsc --noEmit`, sans GPU → fond uni, trafic tuiles conforme à la politique OSM
