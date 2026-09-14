## 1. Enveloppe et import

- [x] 1.1 Trancher l'enveloppe (Capacitor réutilisant le cœur TS vs Kotlin pur avec cœur partagé testé) et vérifier les besoins capteurs (BLE fin, arrière-plan, AR) couverts par le choix
- [x] 1.2 Implémenter l'import QR/lien/fichier + vérification manifest SHA-256 + gating partiel et vérifier le scénario borne + le refus pack corrompu
- [x] 1.3 Câbler progression/scores SQLite (réutiliser la logique `pack.ts` prouvée) + mode animateur flagué et vérifier reprise après kill sans re-tirage

## 2. Preuve de bout en bout

- [x] 2.1 Embarquer `game-5poi.json` comme pack de référence et vérifier une partie complète (tirage → branche → FIN) sur appareil
- [x] 2.2 Valider l'installation sideload sur tablette sans compte Google (import fichier, jeu offline) et consigner permissions demandées/justifiées
- [x] 2.3 Lancer `openspec validate "player-android-pack-install" --type change` et vérifier le verdict `is valid` avant demande d'archive
