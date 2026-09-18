## Context

Le Studio GeoPlay today has a graph-based Composer (ReactFlow) with a fixed Inspector panel on the right. The Inspector displays node properties in 9 fixed sections (module, activation, latch, discovery, effects, etc.). There is no visual preview of what the player screen will look like — creators configure data blindly.

The goal is to replace the Inspector with a WYSIWYG screen builder: a phone-size canvas showing the actual screen layout, with a context-sensitive properties panel. The screen definition is stored per-node (`node.screen`) with global defaults (`global.screen`).

Key constraints:
- Studio is React + TypeScript + Vite, running in browser
- ReactFlow 12.11.6 handles the graph canvas (not changing this)
- Game JSON is validated via AJV against Draft-07 schema
- Module registry is extensible — each module type registers independently
- The Player is native Android (Kotlin) — web preview only for now
- Must not break existing games (backward compatible, screen is optional)

## Goals / Non-Goals

**Goals:**
- Replace the fixed Inspector with a WYSIWYG canvas + context panel
- Define `ScreenDefinition` data model (zones, widgets, background, transitions)
- Add `node.screen` and `global.screen` to the JSON schema
- Build phone-size preview canvas in the Composer
- Implement ModuleScreenPlugin contract (QUIZ first)
- Keep all existing Inspector functionality (9 families) accessible via the context panel
- Maintain backward compatibility — existing games work unchanged

**Non-Goals:**
- Native Player screen rendering (deferred to a later change)
- Free-form canvas positioning (zones are fixed-position: header top, footer bottom, content scrollable)
- Animation/transition engine (transitions are declarative in JSON, rendered natively later)
- Screen templates library beyond 5-6 basics
- Responsive preview (phone-only for now)
- Drag-and-drop from palette (initial version uses "add widget" button, not full drag from palette)
- Undo/redo for screen edits (inherits existing undo system, no new work needed)

## Decisions

### D1: ScreenDefinition data model

**Decision**: `node.screen` and `global.screen` are optional objects with `layout`, `background`, `zones`, and `transitions`. Zones contain widgets. Widgets are discriminated union on `type` (text, image, button, progress, module, spacer).

**Why this over alternatives**:
- *Template-only (no zones)*: Too rigid — creators can't control header/content/footer independently
- *Free-form positioning (x, y per widget)*: Too complex for v1, hard to make responsive, hard for native Player to render
- *Zone-based with fixed positions*: Best balance of flexibility and structure. Zones are always header (top), content (scrollable center), footer (bottom), overlay (modal). Within each zone, widgets stack or grid.

**Alternatives considered**:
1. Pure template system (pick a template, done) — rejected: no per-widget control
2. Free-form canvas with absolute positioning — rejected: too complex, not responsive
3. CSS grid/flexbox exposed directly — rejected: too technical for creators

### D2: Merge strategy (global → node)

**Decision**: Global screen is the template. Node screen overrides by replacement (not append). If node specifies `zones.header`, it completely replaces the global header. Top-level zones merge: `global.zones = {header, content}` + `node.zones = {footer}` = `{header, content, footer}`.

**Why**:
- Append semantics are confusing (which widget came from where?)
- Replacement is predictable — creator sees exactly what they configured
- Global provides defaults for nodes that don't need custom screens

**Implementation**: Simple object spread at the zone level:
```typescript
function resolveScreen(node: GameNode, globalScreen?: ScreenDefinition): ScreenDefinition {
  if (!node.screen && !globalScreen) return DEFAULT_SCREEN;
  if (!node.screen) return globalScreen!;
  if (!globalScreen) return node.screen;
  return {
    ...globalScreen,
    ...node.screen,
    zones: { ...globalScreen.zones, ...node.screen.zones },
  };
}
```

### D3: WYSIWYG replaces Inspector

**Decision**: The Inspector panel is replaced by a context-sensitive Properties Panel. The 9 families (module, activation, latch, discovery, effects, inventoryRef, etc.) are preserved but shown contextually:
- Nothing selected → node properties + template picker + global background
- Zone selected → zone layout + widgets list
- Widget selected → widget-specific properties
- Module widget → module config (existing forms) + widget properties

**Why**:
- The Inspector was always a scrollable list — context panel is the same UX but scoped
- No need for two separate panels — one context panel serves both screen editing and node configuration
- The existing 9 families are just React components — they render inside the context panel instead of a fixed panel

### D4: ModuleScreenPlugin contract

**Decision**: Each module type registers a `screenPlugin` in the module registry. The plugin provides: `defaultScreen`, `editorPreview` (React component), `propertiesPanel` (React component), `playerRenderer` (React component), `customizableStyles`.

**Why**:
- Extensible — new modules add their plugin without touching the WYSIWYG code
- Self-contained — each module owns its visual representation
- Separation of concerns — Studio concerns (editorPreview, propertiesPanel) vs Player concerns (playerRenderer)

**Plugin loading**: Plugins are registered at module registry load time. The WYSIWYG looks up the plugin by `module.type` when rendering. If no plugin exists, a generic placeholder is shown.

### D5: Phone canvas is a styled div, not an iframe

**Decision**: The phone-size preview is a `<div>` with fixed dimensions (375x667), CSS transform scale to fit, and overflow scroll. Not an iframe or web component.

**Why**:
- Iframes have cross-origin issues with shared state
- CSS transform scale is simpler and shares the same React context
- No isolation needed — the canvas is a preview, not a sandbox

### D6: Widget add via button, not drag-from-palette

**Decision**: Adding widgets uses an "Add widget" button with a dropdown menu (text, image, button, progress, spacer). Not a drag-from-palette interaction.

**Why for v1**:
- Drag-from-palette requires a separate palette component, drop zones, and complex position calculation
- Button + dropdown is simpler, more accessible, and sufficient for the initial version
- Can upgrade to drag-from-palette in a later change

### D7: Screen JSON stored directly on node

**Decision**: Screen definition is stored as `node.screen` (not in a separate file or registry). It's part of the node's JSON and exported with the game.

**Why**:
- Follows existing pattern — everything about a node lives on the node
- No separate lookup needed
- Export is trivial — screen is already in the JSON
- Validation is straightforward — AJV validates `node.screen` like any other property

## Risks / Trade-offs

**[R1] Canvas rendering performance** → The phone canvas re-renders on every widget change. With many widgets, this could lag. Mitigation: Use `React.memo` on widget renderers, debounce rapid changes.

**[R2] Inspector migration disruption** → Users familiar with the fixed Inspector layout may find the context panel disorienting. Mitigation: Keep the same section order, same field names, same visual style. The context panel is the Inspector, just scoped.

**[R3] Module plugin development burden** → Every module needs a screenPlugin to look good in the WYSIWYG. Without it, it's a generic placeholder. Mitigation: Start with QUIZ (already has a form), add others incrementally. Placeholder is functional, not broken.

**[R4] Schema bloat** → Adding ScreenDefinition, ZoneContent, Widget types to the schema increases its size. Mitigation: All fields are optional, additionalProperties:false prevents uncontrolled growth, and the schema remains a single JSON file.

**[R5] Native Player gap** → The WYSIWYG produces screen JSON that the native Player can't render yet (it uses hardcoded layouts). Mitigation: This is expected. The Player will be updated in a later change. For now, the screen JSON is produced but not consumed by the Player.

## Migration Plan

No migration needed — this is purely additive:
1. `node.screen` and `global.screen` are optional in the schema
2. Existing games without screens continue to work
3. The Inspector is replaced in-place — no data migration
4. Module plugins are added incrementally — no breaking change

## Open Questions

None. All design decisions are resolved.
