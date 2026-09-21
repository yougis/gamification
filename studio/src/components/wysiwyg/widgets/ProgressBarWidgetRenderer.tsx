// Apercu statique d'une barre de progression dans le canvas WYSIWYG (non interactif).
// Remplissage a mi-parcours : simple echantillon visuel, jamais une vraie progression.
import type { ProgressBarWidget } from "../../../game/types";

export function ProgressBarWidgetRenderer({ widget }: { widget: ProgressBarWidget }) {
  return (
    <div className="flex flex-col gap-1">
      {widget.showLabel ? (
        <span className="text-xs text-fog">{widget.progressType === "score" ? "Score" : "Étape"} 1/5</span>
      ) : null}
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full w-1/2 rounded-full" style={widget.color ? { backgroundColor: widget.color } : undefined} />
      </div>
    </div>
  );
}
