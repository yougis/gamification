## 1. Fix sélection de zone (design D1)

- [x] 1.1 Stopper la propagation du clic dans `ZoneRenderer` (`e.stopPropagation()` avant `onSelectZone`, miroir de `WidgetRenderer`) ; vérifier : clic sur une zone → contour néon persistant, panneau zone avec « Ajouter un widget », clic fond → désélection, `tsc --noEmit` passe
- [x] 1.2 Non-régression clavier : Entrée/Espace sélectionne la zone sans effet de bord ; vérifier : navigation clavier complète (zone → widget → panneau), `tsc --noEmit` passe

## 2. Zones fantômes (design D2)

- [x] 2.1 Rendre les slots pointillés header/footer/overlay absents dans `PhoneCanvas` (« + En-tête », etc., jamais sérialisés), clic câblé sur `onCreateZone` ; vérifier : écran content-only affiche 3 fantômes, `tsc --noEmit` passe
- [x] 2.2 Câbler `onCreateZone` sur `patchScreenZone` (`{ widgets: [] }`, opération nommée annulable) + sélection de la zone créée ; vérifier : clic fantôme → zone vide créée dans le JSON, panneau zone affiché, undo retire la zone

## 3. Template par nœud (design D3)

- [x] 3.1 Exposer `TemplatePicker` dans le panneau WYSIWYG (aucune sélection widget/zone) avec confirmation `hasCustomizations`, appliqué via `setNodeScreen` ; vérifier : template « quiz-focus » → header/content/footer sur le nœud, confirmation si personnalisé, undo restaure, `tsc --noEmit` passe

## 4. Vérification finale

- [x] 4.1 Rejouer les scénarios du delta (clic sans auto-annulation, fantôme créé au clic, template nœud, ajout widget restauré) ; vérifier chaque scénario et consigner le résultat
- [x] 4.2 Non-régression : édition en place, DnD intra/inter-zones, styles 3 niveaux, `npx tsc --noEmit` + `npx vite build` dans `studio/` ; vérifier et consigner
