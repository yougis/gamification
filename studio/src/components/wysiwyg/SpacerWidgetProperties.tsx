// Proprietes d'un espaceur : hauteur en px (curseur + saisie).
// Defauts visibles + retour unitaire (change studio-media-templates, D2).
import type { SpacerWidget } from "../../game/types";
import { defaultWidget } from "./AddWidgetMenu";
import { RetourDefaut } from "./FieldDefaults";

const DEFAUT_PX = (defaultWidget("spacer") as SpacerWidget).height ?? 16;

export function SpacerWidgetProperties({ widget, onChange }: { widget: SpacerWidget; onChange: (w: SpacerWidget) => void }) {
  const px = typeof widget.height === "number" ? widget.height : 16;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Hauteur ({px}px) <span className="text-fog">(défaut : {String(DEFAUT_PX)}px)</span>
          <RetourDefaut visible={px !== DEFAUT_PX || typeof widget.height === "string"} titre="hauteur" onReset={() => onChange({ ...widget, height: DEFAUT_PX })} />
        </span>
        <input
          type="range"
          min={0}
          max={200}
          step={4}
          value={px}
          onChange={(e) => onChange({ ...widget, height: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Valeur exacte (px ou rem)
        <input
          type="text"
          className="champ"
          value={String(widget.height ?? "")}
          placeholder="16"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange({ ...widget, height: undefined });
            const num = Number(raw);
            onChange({ ...widget, height: raw !== "" && !Number.isNaN(num) && String(num) === raw ? num : raw });
          }}
        />
      </label>
    </div>
  );
}
