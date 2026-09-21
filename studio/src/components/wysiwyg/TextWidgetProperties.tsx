// Proprietes d'un widget texte : contenu, style, taille, couleur, alignement.
// Defauts visibles + retour unitaire (change studio-media-templates, D2) :
// les valeurs de `defaultWidget("text")` sont rappelees et chaque champ
// divergeant propose un retour au defaut.
import type { TextWidget } from "../../game/types";
import { defaultWidget } from "./AddWidgetMenu";
import { RetourDefaut } from "./FieldDefaults";

const DEFAUT = defaultWidget("text") as TextWidget;

export function TextWidgetProperties({ widget, onChange }: { widget: TextWidget; onChange: (w: TextWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Texte <span className="text-fog">(défaut : « {DEFAUT.text} »)</span>
          <RetourDefaut visible={widget.text !== DEFAUT.text} titre="texte" onReset={() => onChange({ ...widget, text: DEFAUT.text })} />
        </span>
        <textarea
          className="champ min-h-16"
          value={widget.text}
          onChange={(e) => onChange({ ...widget, text: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Style <span className="text-fog">(défaut : Corps)</span>
          <RetourDefaut visible={(widget.style ?? "body") !== "body"} titre="style" onReset={() => onChange({ ...widget, style: "body" })} />
        </span>
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
          <span className="flex items-center gap-1">
            Taille (px) <span className="text-fog">(hérité)</span>
            <RetourDefaut visible={widget.fontSize !== undefined} titre="taille" onReset={() => onChange({ ...widget, fontSize: undefined })} />
          </span>
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
          <span className="flex items-center gap-1">
            Couleur <span className="text-fog">(hérité)</span>
            <RetourDefaut visible={widget.color !== undefined} titre="couleur" onReset={() => onChange({ ...widget, color: undefined })} />
          </span>
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
        <span className="flex items-center gap-1">
          Alignement <span className="text-fog">(défaut : Gauche)</span>
          <RetourDefaut visible={(widget.align ?? "left") !== "left"} titre="alignement" onReset={() => onChange({ ...widget, align: "left" })} />
        </span>
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
