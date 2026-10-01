## 1. PWA (?game, ?cheat, ?session)

- [x] 1.1 `?game=<url>` auto-charge via le pipeline URL existant et verifier avec l'URL d'un pack publié
- [x] 1.2 `?cheat=1` pré-ouvre le panneau triche avec flags et verifier chaque event porte le flag
- [x] 1.3 `?session=<id>` isole le stockage et verifier deux sessions ne se mélangent pas

## 2. Studio (/emulate + iframe)

- [x] 2.1 Plugin Vite `/emulate` (game.json, manifest reconstruit, compat, assets session) et verifier manifest SHA-256 vert
- [x] 2.2 Onglet iframe dans Prévisualiser (viewports partagés, cible configurable, états d'erreur) et verifier fixture 2pts jouée (carte, volet Ouvrir, quiz)
- [x] 2.3 Sortie propre (Échap/bouton, JSON et essai intacts) et verifier sans régression du terminal existant

## 3. Validation croisée

- [ ] 3.1 Parcours bout en bout émulé (carte navigable, marqueur cliquable, Ouvrir, quiz, triche) et verifier sans écrire dans le JSON source
- [x] 3.2 `openspec validate` vert et suites existantes (shared jvmTest, smokes Studio) sans régression
