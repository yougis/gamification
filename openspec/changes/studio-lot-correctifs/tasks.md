## 1. Thème et viewports (specs studio-theme-toggle, studio-screen-builder)

- [x] 1.1 Inventorier les textes d'écran non tokenisés (canvas, terminal, renderers) et basculer chacun sur les tokens existants ou l'héritage, couleurs auteur verbatim conservées ; vérifier : bascule sombre↔clair lisible sur un écran témoin (titres, boutons, modules, états vides)
- [x] 1.2 Figer par un garde-fou (test : aucune couleur codée en dur dans les renderers d'écran) et vérifier `tsc` + smokes existants
- [x] 1.3 Remplacer les 4 libellés de `BarreViewports` par des boutons icônes compacts (`title` + `aria-label` = libellé + dimensions, état actif et pastille inchangés) ; vérifier : clic tablette paysage → 1024×768, clavier/lecteur d'écran annoncent chaque format

## 2. Aperçu puzzle du canvas (spec module-screen-plugins)

- [x] 2.1 Diagnostiquer la non-visibilité de l'image dans le canvas (mêmes données que le panneau qui fonctionne : résolution d'URL d'asset) puis aligner le canvas sur le mécanisme du panneau, sans nouveau composant ; vérifier : PUZZLE 3×3 configuré → 9 tuiles mélangées visibles dans le canvas, sans image → état vide incitatif

## 3. Inspecteur (spec studio-authoring)

- [x] 3.1 « Ajouter un objet référencé » append une entrée vide éditable (`[""]`, sélecteur, suppression par ligne) ; vérifier : clic → ligne visible → choix « Clé » → `inventoryRef: ["cle"]`, second clic → seconde ligne sans effacer la première
- [x] 3.2 Bouton « Ajouter un effet » permanent (visible à N effets, append en fin, édition/suppression par effet inchangées) ; vérifier : GIVE_ITEM puis REVEAL_NODE coexistent et s'exportent

## 4. Catalogue robuste (spec game-catalog)

- [x] 4.1 Service : en-têtes CORS + `204` sur `OPTIONS` sur toutes les routes ; vérifier : pré-vol navigateur passe, `node --test catalog/server.test.js` 6/6
- [x] 4.2 Studio : normaliser l'URL saisie (espaces, slash final, suffixe `/publish` final retiré) et message d'échec actionnable (cause + remède) ; vérifier : `http://localhost:3000` et `http://localhost:3000/publish` publient, service éteint → message explicite

## 5. Prévisualisation (spec studio-authoring)

- [x] 5.1 Entrée MODE JEUX : sans nœud actif, ouvrir la tête de file (`file[0]`, journalée comme toute ouverture) ; file vide = salle d'attente inchangée ; vérifier : lancement → écran du premier nœud, complétion → suivant via l'avance auto existante
- [x] 5.2 Renommer « Essai du parcours (triche tracée) » en « Essai du parcours », comportement inchangé ; vérifier : libellé seul changé, badge SIMULÉ toujours présent

## 6. Non-régression

- [ ] 6.1 Revalider Sherlock et la fixture couches 1+2 (0 erreur), `tsc`, smokes Studio, tests players ; vérifier et consigner
