// Proprietes d'un widget texte : contenu, style, taille, couleur, alignement.
import type { TextWidget } from "../../game/types";

export function TextWidgetProperties({ widget, onChange }: { widget: TextWidget; onChange: (w: TextWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        Texte
        <textarea
          className="champ min-h-16"
          value={widget.text}
          onChange={(e) => onChange({ ...widget, text: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Style
        <select
          className="champ"
          value={widget.style ?? "body"}
          onChange={(e) => onChange({ ...widget, style: e.target.value as TextWidget["style"] })}
        >
          <option value="heading">Titre</option>
          <option value="subtitle">Sous-titre</option>
          <option value="body">Corps</option>
          <option value="caption">Légende</option>
        </select>
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Taille (px)
          <input
            type="number"
            min={0}
            className="champ"
            value={widget.fontSize ?? ""}
            placeholder="défaut"
            onChange={(e) => onChange({ ...widget, fontSize: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Couleur
          <input
            type="text"
            className="champ"
            value={widget.color ?? ""}
            placeholder="#ffffff"
            onChange={(e) => onChange({ ...widget, color: e.target.value || undefined })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        Alignement
        <select
          className="champ"
          value={widget.align ?? "left"}
          onChange={(e) => onChange({ ...widget, align: e.target.value as TextWidget["align"] })}
        >
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
          <option value="right">Droite</option>
        </select>
      </label>
    </div>
  );
}
