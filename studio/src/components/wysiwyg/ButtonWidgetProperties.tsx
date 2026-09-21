// Proprietes d'un widget bouton : libelle, action, icone, variante.
// Defauts visibles + retour unitaire (change studio-media-templates, D2).
import type { ButtonWidget } from "../../game/types";
import { defaultWidget } from "./AddWidgetMenu";
import { RetourDefaut } from "./FieldDefaults";

const DEFAUT = defaultWidget("button") as ButtonWidget;

export function ButtonWidgetProperties({ widget, onChange }: { widget: ButtonWidget; onChange: (w: ButtonWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Libellé <span className="text-fog">(défaut : « {DEFAUT.label} »)</span>
          <RetourDefaut visible={widget.label !== DEFAUT.label} titre="libellé" onReset={() => onChange({ ...widget, label: DEFAUT.label })} />
        </span>
        <input
          type="text"
          className="champ"
          value={widget.label}
          onChange={(e) => onChange({ ...widget, label: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Action <span className="text-fog">(défaut : aucune)</span>
          <RetourDefaut visible={widget.action !== undefined} titre="action" onReset={() => onChange({ ...widget, action: undefined })} />
        </span>
        <select
          className="champ"
          value={widget.action ?? ""}
          onChange={(e) => onChange({ ...widget, action: e.target.value || undefined })}
        >
          <option value="">Aucune</option>
          <option value="navigate">Naviguer</option>
          <option value="reveal">Révéler</option>
          <option value="custom">Personnalisée</option>
        </select>
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="flex items-center gap-1">
            Icône <span className="text-fog">(aucune)</span>
            <RetourDefaut visible={widget.icon !== undefined} titre="icône" onReset={() => onChange({ ...widget, icon: undefined })} />
          </span>
          <input
            type="text"
            className="champ"
            value={widget.icon ?? ""}
            placeholder="nom d'icône"
            onChange={(e) => onChange({ ...widget, icon: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="flex items-center gap-1">
            Variante <span className="text-fog">(défaut : Primaire)</span>
            <RetourDefaut visible={(widget.variant ?? "primary") !== "primary"} titre="variante" onReset={() => onChange({ ...widget, variant: "primary" })} />
          </span>
          <select
            className="champ"
            value={widget.variant ?? "primary"}
            onChange={(e) => onChange({ ...widget, variant: e.target.value as ButtonWidget["variant"] })}
          >
            <option value="primary">Primaire</option>
            <option value="secondary">Secondaire</option>
            <option value="ghost">Fantôme</option>
          </select>
        </label>
      </div>
    </div>
  );
}
