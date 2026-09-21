// Panneau de proprietes contextuel du WYSIWYG : affiche les proprietes selon
// la selection (rien -> panneau noeud injecte, zone -> ZoneProperties,
// widget -> proprietes specifiques, module -> config module injectee).
// Trois sections de style (change studio-screen-editor, design D3) :
// global (`global.screen.styles`), ecran (`node.screen.styles`) et contenu
// selectionne (`widgets[].styles`), avec badges d'origine via `resolveStyles`.
// Le panneau ne touche jamais au JSON : toute modification passe par callbacks.
import type { GameNode, ScreenBackground, Widget, WidgetStyles, ZoneContent, ZoneId } from "../../game/types";
import { resolveStyles } from "../../game/screen-utils";
import type { ModuleScreenPlugin } from "../../game/module-screen-plugin";
import { ZoneProperties } from "./ZoneProperties";
import { TextWidgetProperties } from "./TextWidgetProperties";
import { ImageWidgetProperties } from "./ImageWidgetProperties";
import { ButtonWidgetProperties } from "./ButtonWidgetProperties";
import { ProgressBarProperties } from "./ProgressBarProperties";
import { SpacerWidgetProperties } from "./SpacerWidgetProperties";
import { ScreenProperties } from "./ScreenProperties";
import { StyleToolbar } from "./StyleToolbar";

// Champs de style couverts par les customs d'un plugin module.
function champsCustoms(customs: ModuleScreenPlugin["customizableStyles"]): (keyof WidgetStyles)[] {
  const out: (keyof WidgetStyles)[] = [];
  if (customs.backgroundColor) out.push("backgroundColor");
  if (customs.textColor) out.push("textColor");
  if (customs.fontSize) out.push("fontSize");
  if (customs.fontFamily) out.push("fontFamily");
  if (customs.fontWeight) out.push("fontWeight");
  if (customs.borderRadius) out.push("borderRadius");
  return out;
}

export function PropertiesPanel({
  node,
  selectedZone,
  zone,
  selectedWidgetIndex,
  widget,
  screenSelected,
  screenBackground,
  globalStyles,
  screenStyles,
  customizableStyles,
  nodePanel,
  modulePanel,
  templatePicker,
  onPatchZone,
  onSelectWidget,
  onAddWidget,
  onRemoveWidget,
  onMoveWidget,
  onPatchWidget,
  onPatchBackground,
  onPatchGlobalStyles,
  onPatchScreenStyles,
}: {
  node: GameNode;
  selectedZone: ZoneId | null;
  zone: ZoneContent | null;
  selectedWidgetIndex: number | null;
  widget: Widget | null;
  screenSelected?: boolean;
  screenBackground?: ScreenBackground;
  globalStyles?: WidgetStyles;
  screenStyles?: WidgetStyles;
  customizableStyles?: ModuleScreenPlugin["customizableStyles"];
  nodePanel?: React.ReactNode;
  modulePanel?: React.ReactNode;
  // Selecteur de template au niveau du noeud (change
  // studio-screen-selection-zones) : affiche quand rien n'est selectionne.
  templatePicker?: React.ReactNode;
  onPatchZone: (zoneId: ZoneId, patch: Partial<ZoneContent>) => void;
  onSelectWidget?: (zoneId: ZoneId, index: number) => void;
  onAddWidget: (zoneId: ZoneId, widget: Widget) => void;
  onRemoveWidget: (zoneId: ZoneId, index: number) => void;
  onMoveWidget?: (zoneId: ZoneId, index: number, dir: -1 | 1) => void;
  onPatchWidget: (zoneId: ZoneId, index: number, widget: Widget) => void;
  onPatchBackground?: (bg: ScreenBackground) => void;
  onPatchGlobalStyles?: (styles: WidgetStyles) => void;
  onPatchScreenStyles?: (styles: WidgetStyles) => void;
}) {
  const { styles: stylesResolus, origins } = resolveStyles(globalStyles, screenStyles, widget?.styles);
  const sectionEcran = onPatchScreenStyles ? (
    <section aria-label="Style de l'écran" className="flex flex-col gap-2 border-t border-rule pt-2">
      <h5 className="font-bold text-xs">Style — Écran</h5>
      <StyleToolbar
        niveau="ecran"
        local={screenStyles ?? {}}
        resolved={resolveStyles(globalStyles, screenStyles).styles}
        origins={resolveStyles(globalStyles, screenStyles).origins}
        champs={["fontFamily", "fontSize", "fontWeight", "color", "align"]}
        onChange={onPatchScreenStyles}
      />
    </section>
  ) : null;
  // Widget selectionne -> proprietes specifiques (+ config module si module).
  if (selectedZone && widget && selectedWidgetIndex != null) {
    if (widget.type === "module") {
      const champs = champsCustoms(customizableStyles ?? {});
      return (
        <div className="flex flex-col gap-3 p-2" aria-label="Propriétés du module">
          <h4 className="font-bold text-sm">Module — {node.module.type}</h4>
          {modulePanel ?? <p className="text-xs text-fog">Configuration du module (section 5).</p>}
          {champs.length > 0 && onPatchWidget ? (
            <section aria-label="Style du contenu" className="flex flex-col gap-2 border-t border-rule pt-2">
              <h5 className="font-bold text-xs">Style — Contenu</h5>
              <StyleToolbar
                niveau="widget"
                local={widget.styles ?? {}}
                resolved={stylesResolus}
                origins={origins}
                champs={champs}
                onChange={(styles) => onPatchWidget(selectedZone, selectedWidgetIndex, { ...widget, styles })}
              />
            </section>
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 p-2" aria-label={`Propriétés du widget ${widget.type}`}>
        <h4 className="font-bold text-sm">Widget — {widget.type}</h4>
        {widget.type === "text" ? (
          <TextWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
        ) : null}
        {widget.type === "image" ? (
          <ImageWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
        ) : null}
        {widget.type === "button" ? (
          <ButtonWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
        ) : null}
        {widget.type === "progress" ? (
          <ProgressBarProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
        ) : null}
        {widget.type === "spacer" ? (
          <SpacerWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
        ) : null}
        <section aria-label="Style du contenu" className="flex flex-col gap-2 border-t border-rule pt-2">
          <h5 className="font-bold text-xs">Style — Contenu</h5>
          <StyleToolbar
            niveau="widget"
            local={widget.styles ?? {}}
            resolved={stylesResolus}
            origins={origins}
            onChange={(styles) => onPatchWidget(selectedZone, selectedWidgetIndex, { ...widget, styles })}
          />
        </section>
      </div>
    );
  }
  // Zone selectionnee -> ZoneProperties + style d'ecran.
  if (selectedZone && zone) {
    return (
      <div className="flex flex-col gap-3 p-2" aria-label="Propriétés de la zone">
        <ZoneProperties
          zone={zone}
          zoneId={selectedZone}
          selectedWidgetIndex={selectedWidgetIndex}
          onPatchZone={onPatchZone}
          onSelectWidget={onSelectWidget}
          onAddWidget={onAddWidget}
          onRemoveWidget={onRemoveWidget}
          onMoveWidget={onMoveWidget}
        />
        {sectionEcran}
      </div>
    );
  }
  // Ecran selectionne (clic sur le fond du canvas) -> fond + style d'ecran.
  if (screenSelected && onPatchBackground) {
    return (
      <div className="flex flex-col gap-3">
        <ScreenProperties background={screenBackground} onChange={onPatchBackground} />
        {sectionEcran}
      </div>
    );
  }
  // Rien de selectionne -> panneau noeud + template + style global.
  return (
    <div className="flex flex-col gap-3 p-2" aria-label="Propriétés du nœud">
      {nodePanel ?? <p className="text-xs text-fog">Propriétés du nœud (section 3.8).</p>}
      {templatePicker}
      {onPatchGlobalStyles ? (
        <section aria-label="Style global" className="flex flex-col gap-2 border-t border-rule pt-2">
          <h5 className="font-bold text-xs">Style — Global</h5>
          <p className="text-[11px] text-fog">Défauts pour tout le jeu, surchargeables par écran puis par widget.</p>
          <StyleToolbar
            niveau="global"
            local={globalStyles ?? {}}
            resolved={globalStyles ?? {}}
            origins={{}}
            champs={["fontFamily", "fontSize", "fontWeight", "color", "align"]}
            onChange={onPatchGlobalStyles}
          />
        </section>
      ) : null}
    </div>
  );
}
