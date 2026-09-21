// Emplacement du module dans le canvas WYSIWYG : apercu du screenPlugin
// si le type de module en declare un, placeholder generique sinon.
import { Icon } from "../../icons";
import { getPreview } from "../../../game/module-screen-plugin";
import type { CSSProperties } from "react";
import type { ModuleWidget } from "../../../game/types";

export function ModuleWidgetRenderer({ widget, moduleType, moduleData }: { widget: ModuleWidget; moduleType?: string; moduleData?: Record<string, unknown> }) {
  const style: CSSProperties = {};
  if (widget.styles?.backgroundColor) style.backgroundColor = widget.styles.backgroundColor;
  if (widget.styles?.textColor) style.color = widget.styles.textColor;
  if (widget.styles?.fontSize) style.fontSize = widget.styles.fontSize;
  if (widget.styles?.fontFamily) style.fontFamily = widget.styles.fontFamily;
  if (widget.styles?.fontWeight) style.fontWeight = widget.styles.fontWeight;
  if (widget.styles?.borderRadius) style.borderRadius = widget.styles.borderRadius;
  const Preview = moduleType ? getPreview(moduleType) : null;
  if (Preview) return <Preview data={moduleData ?? {}} />;
  return (
    <div className="flex flex-col items-center gap-1 rounded border border-dashed border-line bg-surface-2/50 px-3 py-4" style={style}>
      <Icon name="package" size={20} />
      <span className="text-xs font-semibold text-snow">{moduleType ?? "Module"}</span>
      <span className="text-[10px] text-fog">Aperçu du module</span>
    </div>
  );
}
