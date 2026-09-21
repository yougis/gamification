// Proprietes d'une barre de progression : type (etapes/score), libelle, couleur.
// Defauts visibles + retour unitaire (change studio-media-templates, D2).
import type { ProgressBarWidget } from "../../game/types";
import { defaultWidget } from "./AddWidgetMenu";
import { RetourDefaut } from "./FieldDefaults";

const DEFAUT = defaultWidget("progress") as ProgressBarWidget;

export function ProgressBarProperties({ widget, onChange }: { widget: ProgressBarWidget; onChange: (w: ProgressBarWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Type <span className="text-fog">(défaut : Étapes)</span>
          <RetourDefaut visible={(widget.progressType ?? "steps") !== "steps"} titre="type" onReset={() => onChange({ ...widget, progressType: "steps" })} />
        </span>
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
        <span className="flex items-center gap-1">
          Afficher le libellé <span className="text-fog">(défaut : oui)</span>
          <RetourDefaut visible={(widget.showLabel ?? true) !== (DEFAUT.showLabel ?? true)} titre="libellé" onReset={() => onChange({ ...widget, showLabel: DEFAUT.showLabel })} />
        </span>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Couleur <span className="text-fog">(accent)</span>
          <RetourDefaut visible={widget.color !== undefined} titre="couleur" onReset={() => onChange({ ...widget, color: undefined })} />
        </span>
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
