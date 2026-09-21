## Context

The Composer screen (`App.tsx` ~lines 1351-1510) renders a 3-column desktop layout:
- Left: collapsible menu (nav + palette)
- Center: Graphe/MapLibre toggle + NodeList (splitter-resizable)
- Right: Detail (Inspecteur with 9 scrolling Familles) + Essai (ManifestForm, ModePanel, ExperienceStylePanel, BrandingPanel, I18nPanel, ReviewOverlay, Apercu)

State is managed via `mep` (layout preferences, persisted to localStorage) with `repliees: { graphe, liste, detail, essai }` and `droite`/`liste` widths. The `Onglet` type is `"graphe" | "liste" | "detail" | "essai"`.

The `essai` variable (line 959) duplicates panels already in the Configuration screen (line 1186). The only unique component is `Apercu` (live game simulator).

The `detail` variable (line 928) renders the `Inspecteur` component which contains 9 `<Famille>` sections stacked vertically in a scrollable `<aside>`.

## Goals / Non-Goals

**Goals:**
- Remove the redundant Essai tab, moving Apercu to the Prévisualiser screen
- Replace the scrolling Famille list with an icon-based sidebar that shows one section at a time
- Make the steps list ("Liste" onglet) a first-class creation surface with its own toolbar
- Keep all existing functionality intact (undo/redo, MCP operations, validation, i18n overlays)
- No schema, MCP, or game JSON changes

**Non-Goals:**
- Redesigning the Prévisualiser screen (Apercu just moves there, no new features)
- Changing the left menu behavior (already collapsible)
- Modifying the Inspecteur's internal form fields (only the container changes)
- Changing the Famille section ordering or content

## Decisions

### 1. Remove Essai onglet, move Apercu to Prévisualiser

**Decision:** Delete the `essai` variable and its rendering in both desktop and mobile layouts. Move the `Apercu` component into the `previsualiser` screen's `ecranCourant` block.

**Why:** The Essai tab is 80% duplicate of Configuration. The Apercu simulator logically belongs in Prévisualiser, which already exists as a screen but currently shows a static mockup. This consolidates simulation into one place.

**Alternatives considered:**
- Keep Essai as a floating modal: rejected — adds complexity, no clear trigger
- Merge Apercu into Configuration: rejected — Configuration is for settings, not simulation

### 2. Icon sidebar for Inspecteur sections

**Decision:** Replace the 9 `<Famille>` sections with a new layout:
- Narrow icon strip (40px wide) showing 9 icons vertically
- Content panel (fills remaining width) showing the active Famille
- State: `activeFamille: string | null` (which section is open)
- When no node selected: icon strip shows, content panel shows placeholder

**Why:** On wide screens, the current vertical scroll wastes horizontal space and makes it hard to jump between sections. An icon sidebar gives quick access to any section without scrolling.

**Alternatives considered:**
- Tabs (horizontal): rejected — 9 tabs don't fit, would need scrollable tabs
- Accordion (keep current `<details>`): rejected — this is already the current behavior, no improvement
- Dropdown selector: rejected — adds clicks, less visual

**Icon mapping (using existing Icon component):**
```
1. Épreuve      → "etape"
2. Déclenchement → "condition" (or generic "engrenage")
3. Comportement  → "latch" (or "play")
4. Tirage        → "tirage"
5. Validation    → "statut"
6. Découverte    → "oeil"
7. Effets        → "engrenage"
8. Inventaire    → "package"
9. Position      → "lieu"
```

### 3. POI creation toolbar in steps list

**Decision:** Add a horizontal toolbar above the `NodeList` in the "Liste" onglet with 4 creation buttons (Étape, Lieu, Tirage, Fin), reusing the same `ajouterEtape` function and icons from the palette.

**Why:** Currently, creation is only possible from the graph palette (which may be collapsed) or the collapsed left menu (which requires expanding). The list view is a natural place for creation since users see all their steps.

**Layout:** Fixed toolbar at the top of the list, not scrollable with the list content.

### 4. Apercu integration in Prévisualiser

**Decision:** Replace the static mockup in `previsualiser` with the live `Apercu` component, passing all required props (`sim`, `setSim`, `file`, `activeId`, `ouvrir`, `terminer`, etc.).

**Why:** The Prévisualiser screen already has the right structure (h2 title + replay button). The Apercu component is self-contained and just needs its props threaded through.

### 5. State cleanup

**Decision:**
- Remove `essai` from `Onglet` type: `"graphe" | "liste" | "detail"`
- Remove `mep.repliees.essai` from layout state
- Add `activeFamille: string | null` state for the icon sidebar
- Keep `mep.repliees.detail` for collapsing the entire right panel

## Risks / Trade-offs

- **Mobile layout:** The icon sidebar works well on desktop but may be too cramped on mobile. Mitigation: on mobile, keep the current scrolling behavior (the `onglet === "detail"` mobile path doesn't change).
- **Apercu props threading:** The Apercu component needs ~15 props. Threading them through to Prévisualiser requires adding state (`sim`, `draws`, `forced`, etc.) at the App level or lifting them. Mitigation: the state already exists at App level, just pass it through.
- **localStorage migration:** Existing users have `repliees.essai` in their persisted layout. Mitigation: ignore unknown keys during parse (existing behavior), `essai` simply disappears.
- **Icon availability:** Some Famille sections don't have perfect icon matches. Mitigation: use closest available icons, the label appears on hover.
