// Proprietes d'un widget image : source, dimensions, ajustement, texte alternatif.
// La source passe par ImagePicker (parcours + depot, asset + manifest).
// Defauts visibles + retour unitaire (change studio-media-templates, D2).
import type { ImageWidget } from "../../game/types";
import { defaultWidget } from "./AddWidgetMenu";
import { RetourDefaut } from "./FieldDefaults";
import { ImagePicker } from "./ImagePicker";

const DEFAUT = defaultWidget("image") as ImageWidget;

export function ImageWidgetProperties({ widget, onPickFile, onChange }: { widget: ImageWidget; onPickFile?: (file: File) => Promise<string>; onChange: (w: ImageWidget) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Source <span className="text-fog">(défaut : {DEFAUT.src})</span>
          <RetourDefaut visible={widget.src !== DEFAUT.src} titre="source" onReset={() => onChange({ ...widget, src: DEFAUT.src })} />
        </span>
        <ImagePicker
          label="Source de l'image"
          value={widget.src}
          onPickFile={onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); })}
          onChange={(src) => onChange({ ...widget, src })}
        />
      </div>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="flex items-center gap-1">
            Largeur <span className="text-fog">(auto)</span>
            <RetourDefaut visible={widget.width !== undefined} titre="largeur" onReset={() => onChange({ ...widget, width: undefined })} />
          </span>
          <input
            type="text"
            className="champ"
            value={widget.width ?? ""}
            placeholder="auto"
            onChange={(e) => onChange({ ...widget, width: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="flex items-center gap-1">
            Hauteur <span className="text-fog">(auto)</span>
            <RetourDefaut visible={widget.height !== undefined} titre="hauteur" onReset={() => onChange({ ...widget, height: undefined })} />
          </span>
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
        <span className="flex items-center gap-1">
          Ajustement <span className="text-fog">(défaut : Remplir)</span>
          <RetourDefaut visible={(widget.fit ?? "cover") !== "cover"} titre="ajustement" onReset={() => onChange({ ...widget, fit: "cover" })} />
        </span>
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
        <span className="flex items-center gap-1">
          Texte alternatif <span className="text-fog">(vide)</span>
          <RetourDefaut visible={(widget.alt ?? "") !== ""} titre="texte alternatif" onReset={() => onChange({ ...widget, alt: undefined })} />
        </span>
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
