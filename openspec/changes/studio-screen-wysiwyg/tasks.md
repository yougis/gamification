## 1. Schema & Types

- [x] 1.1 Add ScreenDefinition, ZoneContent, Widget types to `studio/src/game/types.ts` — define TypeScript interfaces matching the Draft-07 schema (TextWidget, ImageWidget, ButtonWidget, ProgressBarWidget, ModuleWidget, SpacerWidget, ZoneContent, ScreenDefinition). Verify with `tsc --noEmit`.
- [ ] 1.2 Update `studio/src/game/schema/game-schema.json` — add `node.screen` (optional ScreenDefinition), `global.screen` (optional ScreenDefinition), ZoneContent definition, Widget discriminated union (6 types), additionalProperties:false at each level. Verify AJV validation passes with a test game containing screens.
- [ ] 1.3 Add `resolveScreen()` utility in `studio/src/game/screen-utils.ts` — merge global.screen and node.screen with zone-level replacement (global zones + node zones override). Handle defaults (no screen → content-only fallback). Unit test: node inherits global, node overrides background, merge of different zones.

## 2. WYSIWYG Canvas

- [ ] 2.1 Create `PhoneCanvas` component in `studio/src/components/wysiwyg/PhoneCanvas.tsx` — phone-size frame (375x667), CSS transform scale, renders ScreenDefinition with zone layout (header top, content scrollable center, footer bottom). Props: `screen: ScreenDefinition, selectedZoneId?, onSelectZone?`. Verify: renders a phone frame with zones.
- [ ] 2.2 Create `ZoneRenderer` component in `studio/src/components/wysiwyg/ZoneRenderer.tsx` — renders a single zone with its widgets in stack/grid layout. Handles widget selection (click → onSelectWidget). Shows empty state when zone has no widgets. Props: `zone: ZoneContent, zoneId, selectedWidgetId?, onSelectWidget?`.
- [ ] 2.3 Create `WidgetRenderer` component in `studio/src/components/wysiwyg/WidgetRenderer.tsx` — renders individual widgets based on type (TextWidget, ImageWidget, ButtonWidget, ProgressBarWidget, ModuleWidget, SpacerWidget). Each widget type has its own sub-renderer. ModuleWidget shows the plugin's editorPreview if available, generic placeholder otherwise.
- [ ] 2.4 Create `TextWidgetRenderer`, `ImageWidgetRenderer`, `ButtonWidgetRenderer`, `ProgressBarWidgetRenderer`, `ModuleWidgetRenderer`, `SpacerWidgetRenderer` in `studio/src/components/wysiwyg/widgets/` — individual widget renderers. Each renders a preview of the widget in the canvas (static, non-interactive). ModuleWidgetRenderer looks up the ModuleScreenPlugin by module.type.
- [ ] 2.5 Create `AddWidgetMenu` component in `studio/src/components/wysiwyg/AddWidgetMenu.tsx` — dropdown button to add widgets to a zone. Lists available widget types (text, image, button, progress, spacer). Module widget is auto-added if the node has a module. Props: `onAddWidget: (type) => void`.
- [ ] 2.6 Integrate PhoneCanvas into Composer — when a node is selected, show PhoneCanvas in the central panel alongside the graph. Add toggle button "Graphe / Screen" in the Composer toolbar. Toggle switches between ReactFlow graph and PhoneCanvas. Verify: selecting a node shows its screen, toggle switches views.

## 3. Context-Sensitive Properties Panel

- [ ] 3.1 Create `PropertiesPanel` component in `studio/src/components/wysiwyg/PropertiesPanel.tsx` — context panel that changes based on selection state. No selection → node properties (module type, template picker, global background). Zone selected → zone layout, widgets list, add widget button. Widget selected → widget-specific properties. Module widget → module config + widget properties.
- [ ] 3.2 Create `ZoneProperties` component — zone layout selector (stack/grid/free), background override, visibility conditions. Shows list of widgets in the zone with drag-reorder handles.
- [ ] 3.3 Create `TextWidgetProperties` — text content input (supports i18n keys), style selector (heading/subtitle/body/caption), font size, color picker, alignment.
- [ ] 3.4 Create `ImageWidgetProperties` — src input (asset reference or URL), width/height, fit mode (cover/contain/fill), alt text.
- [ ] 3.5 Create `ButtonWidgetProperties` — label input, action selector (navigate, reveal, custom), icon picker, variant (primary/secondary/ghost).
- [ ] 3.6 Create `ProgressBarProperties` — type selector (steps/score), show label toggle, color override.
- [ ] 3.7 Create `SpacerWidgetProperties` — height slider/input (px or rem).
- [ ] 3.8 Migrate existing Inspector sections to PropertiesPanel — the 9 families (module, activation, latch/rejeu, discovery, effects, inventoryRef, position) render inside PropertiesPanel when no zone/widget is selected. Reuse existing Inspector components from `App.tsx`. Verify: same fields, same validation, same behavior.

## 4. Template Picker

- [ ] 4.1 Create `TemplatePicker` component in `studio/src/components/wysiwyg/TemplatePicker.tsx` — dropdown or card grid of available templates (basic-story, quiz-focus, map-fullscreen, clue-focus, inventory-view). Shows preview thumbnail and name. Props: `currentLayout?, onSelectTemplate: (layoutId) => void`.
- [ ] 4.2 Define template data — create `studio/src/game/screen-templates.ts` with 5 template ScreenDefinitions (basic-story, quiz-focus, map-fullscreen, clue-focus, inventory-view). Each template defines default zones, layout, background, and placeholder widgets.
- [ ] 4.3 Confirmation dialog on template change — if the current screen has been customized (not empty), show confirmation "Les modifications actuelles seront perdues. Continuer ?" before applying template. Cancel preserves current screen.

## 5. Module Plugin System

- [ ] 5.1 Define `ModuleScreenPlugin` interface in `studio/src/game/module-screen-plugin.ts` — type, label, icon, zoneNeeds, defaultScreen, editorPreview (React.ComponentType), propertiesPanel (React.ComponentType), playerRenderer (React.ComponentType), customizableStyles. Add `screenPlugin?: ModuleScreenPlugin` to the module registry type.
- [ ] 5.2 Create `ModulePluginRegistry` — lookup table mapping module type → ModuleScreenPlugin. Populate from module registry. Fallback for unknown types returns null (placeholder). Methods: `getPlugin(type)`, `hasPlugin(type)`, `getPreview(type, data)`.
- [ ] 5.3 Implement QUIZ screenPlugin — defaultScreen (header with title + counter, content with ModuleWidget, footer with navigation), editorPreview (static question preview with sample options), propertiesPanel (migrate existing QUIZ form from Inspector), customizableStyles (backgroundColor, textColor, fontSize). Register in ModulePluginRegistry.
- [ ] 5.4 Verify QUIZ plugin end-to-end — create a node with QUIZ module, see editorPreview in canvas, configure questions via propertiesPanel, export validates. Verify with `tsc --noEmit`.

## 6. Integration & Polish

- [ ] 6.1 Wire screen to JSON export — ensure `node.screen` and `global.screen` are included in the exported JSON. Verify AJV validation passes on export. Test with a game containing screens on some nodes.
- [ ] 6.2 Backward compatibility — verify existing games without screens load correctly (default screen applied). Verify the game-5poi.json test fixture still validates. Test import of games created before this change.
- [ ] 6.3 Widget add/delete in canvas — "Add widget" button adds widget to selected zone. Delete button on each widget removes it. Verify: add text widget → appears in canvas and JSON, delete → removed from both.
- [ ] 6.4 Widget reorder in zone — drag widgets within a zone to reorder (or up/down buttons for v1). Verify order persists in JSON.
- [ ] 6.5 Background editing — select screen (click empty area in canvas) → properties panel shows background editor (type selector: color/image/gradient, value input, overlay slider). Verify: change background → canvas updates → JSON updates.
- [ ] 6.6 Global screen configuration — add global.screen to the global configuration panel. Template picker for global, background, default zones. Verify: global screen applied to all nodes without their own screen.
- [ ] 6.7 TypeScript verification — run `tsc --noEmit` and fix all errors. Verify 0 errors.
- [ ] 6.8 Manual smoke test — create a new game, add 3 nodes with different modules, configure screens via WYSIWYG, export JSON, verify screens are present and valid.
