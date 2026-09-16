## 1. Thème CSS clair

- [x] 1.1 Ajouter la classe `.theme-light` dans `theme.css` avec les variables CSS redéfinies (fonds clairs, textes sombres) ; conserver les accents inchangés ; vérifier `tsc --noEmit` + `vite build`
- [x] 1.2 Vérifier que `.theme-victorian` reste fonctionnel sans conflit avec `.theme-light` (ordre CSS : victorian gagne si les deux sont actifs)

## 2. Bouton de bascule thème dans la barre globale

- [x] 2.1 Ajouter l'état `theme` (`useState<"dark"|"light">`) + effet de persistance `localStorage` dans `App.tsx` ; lire `localStorage` au mount, appliquer `.theme-light` sur `<html>` au toggle ; vérifier `tsc --noEmit` + `vite build`
- [x] 2.2 Ajouter le bouton de bascule dans le header (barre globale) avec icône soleil/lune, aria-label, et taille ≥ 44px ; vérifier `tsc --noEmit` + `vite build`

## 3. Nom du jeu éditable dans la barre globale

- [x] 3.1 Ajouter un champ `<input>` dans le header entre le nom de l'écran et les stats, affichant `game.branding.name` ; câbler `edit` + `setBranding` sur `onChange` ;|max-width 200px, troncature ; caché si `relecture` ; vérifier `tsc --noEmit` + `vite build`
- [x] 3.2 Vérifier que le panneau Configuration globale reflète la modification en temps réel (même state `game.branding.name`) ; vérifier `tsc --noEmit` + `vite build`

## 4. Build error mcp.ts

- [x] 4.1 Vérifier que le build error `type` sur `RequestInit` dans `mcp.ts` est résolu (tsc passe déjà, documenter l'état)
