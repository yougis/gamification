// Proprietes d'une zone : layout (stack/grid/free), liste des widgets
// (selection + suppression), bouton d'ajout. Le reordonnancement arrive en 6.4.
import { Icon } from "../icons";
import type { Widget, ZoneContent, ZoneId } from "../../game/types";
import { AddWidgetMenu, defaultWidget, type AddableWidgetType } from "./AddWidgetMenu";

const NOM_ZONE: Record<ZoneId, string> = {
  header: "En-tête",
  content: "Contenu",
  footer: "Pied de page",
  overlay: "Surimpression",
};

export function ZoneProperties({
  zone,
  zoneId,
  selectedWidgetIndex,
  onPatchZone,
  onSelectWidget,
  onAddWidget,
  onRemoveWidget,
  onMoveWidget,
  onRemoveZone,
}: {
  zone: ZoneContent;
  zoneId: ZoneId;
  selectedWidgetIndex?: number | null;
  onPatchZone: (zoneId: ZoneId, patch: Partial<ZoneContent>) => void;
  onSelectWidget?: (zoneId: ZoneId, index: number) => void;
  onAddWidget: (zoneId: ZoneId, widget: Widget) => void;
  onRemoveWidget: (zoneId: ZoneId, index: number) => void;
  onMoveWidget?: (zoneId: ZoneId, index: number, dir: -1 | 1) => void;
  // Suppression de la zone (change studio-apercu-arbre-paysage) : absent =
  // non supprimable (ex. zone content, base de l'écran).
  onRemoveZone?: (zoneId: ZoneId) => void;
}) {
  const widgets = zone.widgets ?? [];
  return (
    <div className="flex flex-col gap-3">
      <h4 className="font-bold text-sm">Zone — {NOM_ZONE[zoneId]}</h4>
      <label className="flex flex-col gap-1 text-xs">
        Disposition
        <select
          className="champ"
          value={zone.layout ?? "stack"}
          onChange={(e) => onPatchZone(zoneId, { layout: e.target.value as ZoneContent["layout"] })}
        >
          <option value="stack">Pile (vertical)</option>
          <option value="grid">Grille (colonnes)</option>
          <option value="free">Libre</option>
        </select>
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-fog">Widgets ({widgets.length})</span>
        {widgets.length === 0 ? (
          <p className="text-xs text-fog">Aucun widget dans cette zone.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {widgets.map((w, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded border px-2 py-1 text-xs ${selectedWidgetIndex === i ? "border-neon" : "border-line"}`}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-snow"
                  onClick={() => onSelectWidget?.(zoneId, i)}
                  title="Sélectionner ce widget"
                >
                  {w.type}
                </button>
                {onMoveWidget ? (
                  <>
                    <button
                      type="button"
                      className="text-fog hover:text-snow disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => onMoveWidget(zoneId, i, -1)}
                      title="Monter"
                      aria-label={`Monter le widget ${w.type}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-fog hover:text-snow disabled:opacity-30"
                      disabled={i === widgets.length - 1}
                      onClick={() => onMoveWidget(zoneId, i, 1)}
                      title="Descendre"
                      aria-label={`Descendre le widget ${w.type}`}
                    >
                      ↓
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="text-fog hover:text-snow"
                  onClick={() => onRemoveWidget(zoneId, i)}
                  title="Supprimer ce widget"
                  aria-label={`Supprimer le widget ${w.type}`}
                >
                  <Icon name="fermer" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <AddWidgetMenu
        onAddWidget={(type: AddableWidgetType) => onAddWidget(zoneId, defaultWidget(type))}
      />
      {onRemoveZone && zoneId !== "content" ? (
        <button
          type="button"
          className="btn-danger min-h-8 px-2.5 text-[8px]"
          onClick={() => {
            if (
              widgets.length === 0 ||
              window.confirm(`Supprimer la zone « ${NOM_ZONE[zoneId]} » et ses ${widgets.length} widget(s) ?`)
            ) {
              onRemoveZone(zoneId);
            }
          }}
          title={`Supprimer la zone ${NOM_ZONE[zoneId]}`}
        >
          <Icon name="fermer" size={13} /> Supprimer la zone
        </button>
      ) : null}
    </div>
  );
}
