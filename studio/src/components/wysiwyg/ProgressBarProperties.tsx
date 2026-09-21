// Proprietes d'une barre de progression : type (etapes/score), libelle, couleur.
import type { ProgressBarWidget } from "../../game/types";

export function ProgressBarProperties({ widget, onChange }: { widget: ProgressBarWidget; onChange: (w: ProgressBarWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        Type
        <select
          className="champ"
          value={widget.progressType ?? "steps"}
          onChange={(e) => onChange({ ...widget, progressType: e.target.value as ProgressBarWidget["progressType"] })}
        >
          <option value="steps">Étapes</option>
          <option value="score">Score</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={widget.showLabel ?? false}
          onChange={(e) => onChange({ ...widget, showLabel: e.target.checked })}
        />
        Afficher le libellé
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Couleur
        <input
          type="text"
          className="champ"
          value={widget.color ?? ""}
          placeholder="couleur d'accent"
          onChange={(e) => onChange({ ...widget, color: e.target.value || undefined })}
        />
      </label>
    </div>
  );
}
