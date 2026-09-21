// Proprietes d'un widget bouton : libelle, action, icone, variante.
import type { ButtonWidget } from "../../game/types";

export function ButtonWidgetProperties({ widget, onChange }: { widget: ButtonWidget; onChange: (w: ButtonWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        Libellé
        <input
          type="text"
          className="champ"
          value={widget.label}
          onChange={(e) => onChange({ ...widget, label: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Action
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
          Icône
          <input
            type="text"
            className="champ"
            value={widget.icon ?? ""}
            placeholder="nom d'icône"
            onChange={(e) => onChange({ ...widget, icon: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Variante
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
