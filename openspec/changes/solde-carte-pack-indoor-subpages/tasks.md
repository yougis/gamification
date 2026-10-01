## 1. Indoor — recoller et trancher

- [ ] 1.1 Vérifier `game-schema.json`, `types.ts`, `validate.ts`, `MapView.tsx`, `setNodePosition`/`computeBbox*` couvrent le delta (sinon compléter à la marge, sans nouveau comportement)
- [ ] 1.2 Trancher `add/removeIndoorPlan` : ajouter les 2 ops MCP nommées annulables OU acter l'édition inline comme suffisante (noter la décision dans le changelog d'archive)
- [ ] 1.3 `openspec validate --change solde-carte-pack-indoor-subpages` vert (le MODIFIED recopié lève les 2 ERROR de l'ancien change)

## 2. Pack zip/diff — validation croisée finale (rien à coder)

- [ ] 2.1 `openspec validate --all` vert
- [ ] 2.2 `node --test catalog/server.test.js`, `:shared:jvmTest`, `:app:assembleDebug`, `tsc`, smokes Studio (`tile-caching`, `screen`, `map-widget`, `pack`) verts
- [ ] 2.3 Parcours manuel : export `.zip` (jeu + assets + tuiles + `tiles.json`) → import offline sur téléphone → mise à jour différentielle (1 image modifiée seule voyage, progression préservée, échec sans casse)

## 3. Sous-pages — parité KMP sans PWA

- [ ] 3.1 Rejouer Sherlock oracle : `paginateContent` TS ≡ miroir Kotlin, ≤1 média/page, portrait+paysage, swipe (±40px) + Suivant/Précédent/Terminer, `progress steps` = page i/N
- [ ] 3.2 Vérifier aucune référence PWA/iframe/`/emulate` dans le parcours (grep `vite.config.ts`, `App.tsx`, `catalog/server.js` vide)
