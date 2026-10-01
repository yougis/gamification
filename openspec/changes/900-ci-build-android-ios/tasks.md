## 1. Pipeline Android

- [ ] 1.1 Compiler `shared` + app Android et publier l'APK/AAB en artefact, puis telecharger l'artefact depuis une PR de test et l'installer sur un appareil.
- [ ] 1.2 Executer tests moteur + validation C1/C2 TS et KMP des jeux de reference dans le job, puis constater le job rouge sur un jeu volontairement casse.

## 2. Pipeline iOS

- [ ] 2.1 Compiler `shared` (iosArm64) + app iOS sur runner macOS et publier l'artefact signe dev, puis verifier l'installation sur simulateur.
- [ ] 2.2 Mettre en cache Gradle/CocoaPods/KMP et mesurer une duree < 20 min sur PR standard.
