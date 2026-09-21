// Proprietes d'un widget image : source, dimensions, ajustement, texte alternatif.
import type { ImageWidget } from "../../game/types";

export function ImageWidgetProperties({ widget, onChange }: { widget: ImageWidget; onChange: (w: ImageWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        Source (asset ou URL)
        <input
          type="text"
          className="champ"
          value={widget.src}
          onChange={(e) => onChange({ ...widget, src: e.target.value })}
        />
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Largeur
          <input
            type="text"
            className="champ"
            value={widget.width ?? ""}
            placeholder="auto"
            onChange={(e) => onChange({ ...widget, width: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Hauteur
          <input
            type="text"
            className="champ"
            value={widget.height ?? ""}
            placeholder="auto"
            onChange={(e) => onChange({ ...widget, height: e.target.value || undefined })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        Ajustement
        <select
          className="champ"
          value={widget.fit ?? "cover"}
          onChange={(e) => onChange({ ...widget, fit: e.target.value as ImageWidget["fit"] })}
        >
          <option value="cover">Remplir</option>
          <option value="contain">Contenir</option>
          <option value="fill">Étirer</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Texte alternatif
        <input
          type="text"
          className="champ"
          value={widget.alt ?? ""}
          onChange={(e) => onChange({ ...widget, alt: e.target.value || undefined })}
        />
      </label>
    </div>
  );
}
