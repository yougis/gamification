## 1. Remove Essai tab and move Apercu to Prévisualiser

- [ ] 1.1 Remove `"essai"` from the `Onglet` type and all references to `onglet === "essai"` in App.tsx. Verify: `npx tsc --noEmit` passes, no remaining references to `"essai"` as an onglet value.
- [ ] 1.2 Remove the `essai` variable (line 959-976) and its rendering in the desktop layout (lines 1434-1457). Verify: the right panel no longer shows Essai content.
- [ ] 1.3 Remove `essai` from the mobile bottom nav (lines 1487-1510) and from the `Onglet` rendering in mobile (line 1481). Verify: mobile composer shows only Graphe/Liste/Detail tabs.
- [ ] 1.4 Remove `mep.repliees.essai` from `LAYOUT_DEFAUT`, state parsing, and `SectionPliable` type. Verify: layout state parses correctly without `essai`.
- [ ] 1.5 Move `Apercu` rendering from the deleted `essai` variable into the `previsualiser` screen's `ecranCourant` block (line 1090). Thread all required props (`sim`, `setSim`, `file`, `activeId`, `ouvrir`, `terminer`, `draws`, `forced`, `setForced`, `log`, `testAll`, `testerBranches`, `sessionId`, `setSessionId`, `nouvelleSession`, `reculerSim`, `nbTermines`, `holdSim`, `onHoldLock`, `onHoldExit`). Verify: Prévisualiser screen shows the live Apercu simulator.

## 2. Icon sidebar for Inspecteur

- [ ] 2.1 Add `activeFamille` state (`string | null`, default `FAMILLES[0].id`) in the App component, reset to `FAMILLES[0].id` when `etape` changes. Verify: state is declared and updates on node selection.
- [ ] 2.2 Create a `FamilleIcons` constant mapping each FAMILLES entry to an icon name: `[{id: "epreuve", icon: "etape"}, {id: "declenchement", icon: "engrenage"}, {id: "comportement", icon: "play"}, {id: "tirage", icon: "tirage"}, {id: "validation", icon: "statut"}, {id: "decouverte", icon: "oeil"}, {id: "effets", icon: "engrenage"}, {id: "inventaire", icon: "package"}, {id: "position", icon: "lieu"}]`. Verify: constant is defined and exportable.
- [ ] 2.3 Refactor the `Inspecteur` component to accept `activeFamille` and `onSelectFamille` props. Replace the `<Famille>` loop with: (a) a 40px-wide icon strip rendered via `FamilleIcons.map(...)`, each icon clickable to call `onSelectFamille(id)`; (b) the active `<Famille>` content rendered next to the icon strip. Verify: clicking an icon shows only that Famille's content.
- [ ] 2.4 When no node is selected (`etape` is null), the right panel shows the icon strip (grayed out) and a placeholder message "Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier". Verify: placeholder appears when no node is selected.
- [ ] 2.5 Remove the `Famille` wrapper component (line 1544-1554) if no longer used, or keep it as a rendering helper for the active section. Verify: `npx tsc --noEmit` passes.

## 3. POI creation toolbar in steps list

- [ ] 3.1 Add a creation toolbar above the `NodeList` in the `liste` variable (line 947) when `onglet === "liste"`. The toolbar contains 4 buttons: Étape, Lieu, Tirage, Fin, reusing `ajouterEtape()` and the same icons as the palette. Verify: toolbar is visible above the node list.
- [ ] 3.2 The toolbar buttons call the same `ajouterEtape("etape"|"lieu"|"tirage"|"fin")` function. After creation, the new node is selected and the view switches to the Detail onglet (existing behavior from `ajouterEtape`). Verify: clicking "Lieu GPS" creates a node, selects it, and shows the inspector.
- [ ] 3.3 Apply the same toolbar to the `listeSimple` variable used in mobile (line 955). Verify: mobile list view shows creation buttons.

## 4. Layout state and cleanup

- [ ] 4.1 Verify `npx tsc --noEmit` passes after all changes. Fix any type errors related to removed `essai` references.
- [ ] 4.2 Test desktop layout: Graph + List + Detail with icon sidebar. Verify: splitter works, panel collapses/expands correctly, icons respond to clicks.
- [ ] 4.3 Test mobile layout: onglets Graphe/Liste/Detail only (no Essai). Verify: bottom nav shows 3 tabs, each renders correctly.
- [ ] 4.4 Test Prévisualiser screen with Apercu: bypass controls, forceDraw, hold simulation all work. Verify: no console errors, simulation runs correctly.
- [ ] 4.5 Test localStorage persistence: save layout, reload, verify `essai` is ignored and other preferences restore correctly. Verify: no errors on load with old layout data.
