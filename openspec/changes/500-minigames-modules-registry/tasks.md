## 1. Contrats et sous-schémas

- [ ] 1.1 Écrire les 5 sous-schémas versionnés + `needs*` + fallbacks et vérifier montage `$ref` 100 sans retouche racine/graphe
- [ ] 1.2 Spécifier QUIZ (temps interne + auto-validation flaguée) et BOUSSOLE (`toleranceDeg`, stabilisation, `onTimeout`, fallback) et vérifier aucune condition `HEADING`/`TIMER` au graphe
- [ ] 1.3 Spécifier 7-erreurs (polygones % + dilatation, relecture overlay) et PUZZLE (tactile + clavier + reprise SQLite) et vérifier les scénarios gant/reprise

## 2. AR et preuve d'extension

- [ ] 2.1 Spécifier AR_MARKER (ARKit/ARCore, lissage, fallback 2D obligatoire, budgets 3D) et vérifier étape complétable sans caméra
- [ ] 2.2 Ajouter un 6e type factice au registre et vérifier Jeu existant inchangé + nouveau rendu sans toucher Nœuds/Liens
- [ ] 2.3 Lancer `openspec validate "500-minigames-modules-registry" --type change` et vérifier le verdict `is valid` avant demande d'archive
