## Why

The Composer screen has grown organically with three stacked panels (Graphe + Liste + Detail/Essai) on the right side. The "Essai" tab duplicates the Configuration screen (ModePanel, ExperienceStylePanel, BrandingPanel, I18nPanel all appear in both). The 9 "Famille" sections in the Detail panel scroll vertically as a long form, wasting horizontal space on wide screens. The left menu's creation palette (ajouter) is only accessible from the graph view, not from the steps list. This makes the Composer feel cramped and inconsistent.

## What Changes

- **Remove the "Essai" onglet** from the Composer. The only unique component (Apercu/live simulator) moves to the "Prévisualiser" screen. All duplicated panels (ModePanel, ExperienceStylePanel, BrandingPanel, I18nPanel, ReviewOverlay) are already available in their respective screens.
- **Replace the Detail panel's inline scrolling with an icon sidebar**. The 9 Famille sections become clickable icons in a narrow strip. Clicking an icon opens that section's content in a flyout panel. When no node is selected, the sidebar shows a placeholder message.
- **Make the left menu fully collapsible** on desktop. The collapsed state shows icon-only buttons for navigation and creation (Étape, Lieu, Tirage, Fin). The expanded state keeps the current nav + project info.
- **Add POI creation actions to the steps list view**. The "Liste" onglet gets a toolbar with creation buttons (Étape, Lieu, Tirage, Fin) above the NodeList, matching the palette from the graph view.

## Capabilities

### New Capabilities

_(none — this is a UI restructuring of existing behavior)_

### Modified Capabilities

- `studio-authoring`: The Composer layout changes from a 3-panel stacked layout to a collapsible sidebar layout. The onglet system changes (essai removed, detail becomes icon sidebar). The steps list gains creation actions.

## Impact

- **App.tsx**: Major restructuring of the Composer layout (lines 1351-1510 for desktop, 1467-1540 for mobile). The `Onglet` type changes (`"essai"` removed). The `essai` variable is removed. The `detail` variable is refactored into an icon sidebar component. The `liste` variable gains a toolbar.
- **Components**: A new `IconSidebar` component (or equivalent) replaces the scrolling Famille list. The `Apercu` component moves to the Prévisualiser screen.
- **State**: `mep.repliees.essai` is removed. New state for the active icon sidebar section (which Famille is open).
- **No schema changes**: The game JSON, Draft-07 schema, and MCP operations are unaffected.
- **No new dependencies**: Only React state and existing CSS classes.
