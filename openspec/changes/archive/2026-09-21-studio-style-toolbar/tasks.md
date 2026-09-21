## 1. Barre d'outils de style (design D1-D3)

- [x] 1.1 Créer le module barre d'outils (même API que `StyleFields` : niveau, local, resolved, origins, champs, onChange) avec groupes typographie (police/taille/gras toggle), couleur (texte/fond : picker + hex synchronisés), alignement (segmenté 3 boutons), surcharge (retrait) ; vérifier : tous les champs actuels éditables via la barre, `tsc --noEmit` passe
- [x] 1.2 Badges d'origine compacts par contrôle (pastille + infobulle d'origine, placeholder hérité lecture seule jusqu'à surcharge), groupes vides masqués quand `champs` filtre (ex. module sans alignement) ; vérifier : héritage Georgia badgé Global, surcharge gras badgée Widget, `tsc --noEmit` passe
- [x] 1.3 Brancher la barre dans `PropertiesPanel` (3 sections + customs module, remplacement de `StyleFields` à API identique), cibles tactiles ≥ 44px ; vérifier : Global/Écran/Contenu affichent la barre, customs filtrés respectés, `tsc --noEmit` passe

## 2. Vérification finale

- [x] 2.1 Rejouer les scénarios du delta (barre groupée avec héritage, gras en un clic) ; vérifier chaque scénario et consigner le résultat
- [x] 2.2 Non-régression : héritage 3 niveaux (`screen.smoke.ts` ALL OK), customs QUIZ/puzzle, `npx tsc --noEmit` + `npx vite build` dans `studio/` ; vérifier et consigner
