## 1. Documentation racine

- [x] 1.1 Creer `README.md` a la racine avec sections createur/integrateur/dev et verifier le rendu Markdown
- [x] 1.2 Ajouter les commandes de verification rapides pour studio (`cd studio && npm install && npm run dev`) et player (`cd player && ./gradlew assembleDebug`)
- [x] 1.3 Verifier que le README est accessible et tous les liens internes fonctionnent

## 2. Guide createur de jeux

- [x] 2.1 Documenter la procedure Studio : `npm run dev` dans `studio/`, MCP setup, composition d'un Jeu de reference
- [x] 2.2 Ajouter les etapes de validation (export JSON, `openspec validate`) pour le workflow createur
- [x] 2.3 Verifier le parcours complet createur (composer -> valider -> exporter)

## 3. Guide integrateur d'outils

- [x] 3.1 Documenter le deployment du runtime natif (sideload APK, permissions, modes systeme HOLD/triche/preview)
- [x] 3.2 Ajouter la configuration infrastructure (QR codes, manifest SHA-256, SQLite)
- [x] 3.3 Verifier les commandes de validation de pack (`openspec validate --type change`)

## 4. Guide developpeur

- [x] 4.1 Documenter l'installation env de dev : Node.js, Gradle, Android SDK, dependencies
- [x] 4.2 Ajouter les commandes de build et test pour studio et player
- [x] 4.3 Verifier `npm run lint`, `npm run test:runtime`, `./gradlew test`

## 5. Mise a jour ROADMAP

- [x] 5.1 Ajouter la reference a `add-quickstart-readme` dans la table des changements de ROADMAP.md
- [x] 5.2 Verifier la coherence du lien avec le reste de la roadmap
