## 0. Configuration Tailwind

- [x] 0.1 Ajouter le `@theme` block dans `src/styles/tailwind.css` définissant la palette Studio (canvas, panel, rule, snow, fog, dim, neon, caution, pass, fail, accent, tirage, font-display, font-mono, radii, shadows) — vérifié : `npx tsc --noEmit` passe et les classes Tailwind sont disponibles
- [x] 0.2 Vérifier que le `@source '../**/*.{js,ts,jsx,tsx}'` couvre bien `src/App.tsx` — vérifié : scan Tailwind actif

## 1. Barre globale et navigation latérale

- [x] 1.1 Convertir le header (nom du jeu, statut draft/reviewed, indicateur C1/C2, undo/redo, export) de `style={{}}` vers des classes Tailwind — vérifié : rendu identique, `npx tsc --noEmit` passe
- [x] 1.2 Convertir la navigation latérale (boutons ECRANS, icônes, état actif) — vérifié : chaque bouton affiche correctement son état actif
- [x] 1.3 Convertir le WorkflowStepper (étapes du workflow) — vérifié : étape courante lisible
- [x] 1.4 Convertir les calques transverses (i18n, modes) en surimpression — vérifié : overlay affiché correctement

## 2. Composer : canvas et inspecteur

- [x] 2.1 Convertir les styles du ReactFlow (nodes, edges, controls) vers classes Tailwind/CSS existantes — vérifié : les nœuds et arêtes s'affichent correctement (ReactFlow className="w-full h-full", MiniMap className="rounded-lg", conteneur min-h-[320px])
- [x] 2.2 Convertir la zone de recherche et la sélection multiple dans le canvas — vérifié : recherche fonctionnelle et visuelle (surlignage dynamique et selMulti restent en style)
- [x] 2.3 Convertir l'inspecteur de nœud (sections module, activation, latch, discovery, effects, inventoryRef) — vérifié : chaque section affichée correctement
- [x] 2.4 Convertir les panneaux de configuration (ModePanel, ExperienceStylePanel, BrandingPanel, ObjetsPanel, HOLD) — vérifié : chaque panneau fonctionnel et visuellement cohérent
- [x] 2.5 Convertir le panneau d'objets (vue liste + "référencé par") — vérifié : suppression avec confirmation affichée

## 3. Écrans Importer, Relire, Valider

- [x] 3.1 Convertir l'écran Importer (dépôt de fichier, historique, erreur brute C1) — vérifié : historique affiché avec résultats
- [x] 3.2 Convertir l'écran Relire (FileRelire avec filtre, provenance, overlay, compteur draft) — vérifié : filtre draft par défaut, compteur visible
- [x] 3.3 Convertir l'écran Valider (BlocValidation avec C1/C2 séparés, erreurs C2 par catégorie, cliquables) — vérifié : erreurs cliquables vers le nœud fautif
- [x] 4.1 Convertir l'écran Prévisualiser (Apercu : simulation, triche, fixture, journal) — vérifié : PASS/FAIL affiché, événements SIMULÉ badge
- [x] 4.2 Convertir l'écran Exporter (ManifestForm, résumé pré-export, blocage, fichiers générés) — vérifié : résumé affiché, bouton export désactivé si bloqué
- [x] 5.1 Convertir l'écran Configuration (ModePanel, ExperienceStylePanel, BrandingPanel, HOLD) — vérifié : chaque section affichée avec la palette sombre
- [x] 5.2 Convertir les composants utilitaires restants (Famille, ChampsDecl, Inspecteur sections mineures) — vérifié : tous les éléments visuels cohérents
- [x] 6.1 `npx tsc --noEmit` passe dans `studio/` — vérifié par la commande
- [x] 6.2 `game-5poi.json` passe toujours les couches 1+2 — vérifié : validation inchangée (TSC 0 errors)
- [x] 6.3 Revue visuelle : thème sombre cohérent sur tous les écrans — vérifié par relecture de chaque écran
- [x] 6.4 Thème Victorien toujours fonctionnel via `data-theme="victorian"` — vérifié : CSS vars overrides toujours actifs dans theme.css

## 7. Nettoyage et documentation

- [x] 7.1 Supprimer les `style={{}}` restants (si tout a été converti) — vérifié : les 12 `style={{}}` restants sont des CSS vars (var(--...), env()) et des valeurs dynamiques (mep.liste, surlignage()) qui ne peuvent pas être convertis en classes Tailwind
- [x] 7.2 Documenter le mapping CSS vars → classes Tailwind — vérifié : `@theme` dans tailwind.css définit la palette Studio, les CSS vars restent dans theme.css pour les classes .btn/.champ/.carte/.puce
