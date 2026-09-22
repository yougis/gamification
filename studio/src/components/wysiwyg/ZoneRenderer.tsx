// Rend une zone (header/content/footer/overlay) : ses widgets en pile, grille
// ou libre. Clic sur le fond -> selection de la zone ; clic sur un widget ->
// selection du widget. Etat vide : cadre pointille incitatif.
// Layout `free` : coordonnees relatives (flux + retour a la ligne) pour
// survivre aux 4 viewports sans debordement (change studio-screen-editor).
// Depot DnD sur le fond de zone = ajout en fin ; depot sur un widget =
// insertion avant lui (props traversees depuis PhoneCanvas).
import { useState } from "react";
import type { ReactNode } from "react";
import type { Widget, ZoneContent, ZoneId } from "../../game/types";
import { WidgetRenderer, lireDragSource } from "./WidgetRenderer";

const LAYOUT_CLASSE: Record<string, string> = {
  stack: "flex flex-col gap-2",
  grid: "grid grid-cols-2 gap-2",
  free: "flex flex-row flex-wrap gap-2",
};

export function ZoneRenderer({
  zone,
  zoneId,
  moduleType,
  moduleData,
  selected,
  selectedWidgetIndex,
  onSelectZone,
  onSelectWidget,
  onCommitText,
  onMoveWidgetAcross,
  renderModule,
}: {
  zone: ZoneContent;
  zoneId: ZoneId;
  moduleType?: string;
  moduleData?: Record<string, unknown>;
  selected?: boolean;
  selectedWidgetIndex?: number | null;
  onSelectZone?: (zoneId: ZoneId) => void;
  onSelectWidget?: (zoneId: ZoneId, index: number) => void;
  onCommitText?: (zoneId: ZoneId, index: number, text: string) => void;
  // Deplacement (intra ou inter-zones) en une seule operation MCP.
  onMoveWidgetAcross?: (fromZone: ZoneId, fromIndex: number, toZone: ZoneId, toIndex: number | "end") => void;
  // Slot module remplaçable (change studio-player-preview), transmis au
  // WidgetRenderer. Absent = aperçu éditeur.
  renderModule?: (widget: Widget) => ReactNode;
}) {
  const widgets = zone.widgets ?? [];
  const [survol, setSurvol] = useState(false);
  const dndActif = onMoveWidgetAcross != null;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Zone ${zoneId}`}
      onClick={(e) => {
        // Le clic ne doit pas bouillonner vers le fond du canvas (qui vide
        // la selection) : miroir du pattern de WidgetRenderer.
        e.stopPropagation();
        onSelectZone?.(zoneId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSelectZone?.(zoneId);
        }
      }}
      onDragOver={dndActif ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setSurvol(true); } : undefined}
      onDragLeave={dndActif ? () => setSurvol(false) : undefined}
      onDrop={
        dndActif
          ? (e) => {
              e.preventDefault();
              setSurvol(false);
              const src = lireDragSource(e);
              if (!src) return;
              // Depot en fin de zone ; sans effet si deja dernier de sa zone.
              if (src.zone === zoneId && src.index === widgets.length - 1) return;
              onMoveWidgetAcross?.(src.zone, src.index, zoneId, "end");
            }
          : undefined
      }
      className={`rounded p-2 ${selected ? "outline-2 outline-neon outline" : "outline-1 outline-dashed outline-transparent hover:outline-line"} ${survol ? "outline-2 outline-dashed outline-neon" : ""}`}
    >
      {widgets.length === 0 ? (
        <div className="rounded border border-dashed border-line px-3 py-4 text-center text-xs text-fog">
          Zone {zoneId} vide — ajoutez un widget
        </div>
      ) : (
        <div className={LAYOUT_CLASSE[zone.layout ?? "stack"]}>
          {widgets.map((w: Widget, i: number) => (
            <WidgetRenderer
              key={i}
              widget={w}
              index={i}
              zoneId={zoneId}
              moduleType={moduleType}
              moduleData={moduleData}
              selected={selectedWidgetIndex === i}
              deplacable={dndActif && w.type === "text"}
              onSelect={(index) => onSelectWidget?.(zoneId, index)}
              onCommitText={onCommitText}
              renderModule={renderModule}
              onDropBefore={
                dndActif
                  ? (fromZone, fromIndex, toZone, toIndex) => onMoveWidgetAcross?.(fromZone, fromIndex, toZone, toIndex)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
