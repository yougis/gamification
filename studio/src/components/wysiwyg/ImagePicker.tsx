// Selecteur d'image unifie (change studio-media-templates, design D1) :
// parcours du poste client ET depot par glisser-deposer, avec previsualisation
// et refus explicite des non-images. Composant controle : `value` est le
// chemin d'asset (ou URL), `onPickFile` (fourni par App) enregistre le fichier
// au manifest et retourne son chemin, `onChange` recoit ce chemin. La saisie
// manuelle d'un chemin reste possible (assets deja empaquetes, URL).
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { Accordeon, useAccordeon } from "../Accordeon";
import { estImageAcceptable } from "./image-files";

export function ImagePicker({
  value,
  onChange,
  onPickFile,
  disabled,
  label = "Image",
}: {
  value?: string;
  onChange: (path: string) => void;
  onPickFile: (file: File) => Promise<string>;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  // Saisie manuelle = P2 (change studio-control-priority) : contournement
  // expert (chemins bruts, URL), replié avec rappel du chemin courant.
  const [avanceOuvert, basculerAvance] = useAccordeon("imagepicker-avance", false);

  // Libere les object URL a chaque remplacement / demontage.
  useEffect(() => () => {
    if (apercu) URL.revokeObjectURL(apercu);
  }, [apercu]);

  const traiter = async (f: File | undefined) => {
    if (!f || disabled || occupe) return;
    setErreur(null);
    if (!estImageAcceptable(f)) {
      setErreur(`Fichier refusé : « ${f.name} » n'est pas une image.`);
      return;
    }
    setOccupe(true);
    try {
      const url = URL.createObjectURL(f);
      setApercu((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      const chemin = await onPickFile(f);
      onChange(chemin);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  };

  const srcVignette = apercu ?? (value ? value : null);
  return (
    <div className="flex flex-col gap-1.5" aria-label={label}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label} : déposer un fichier ou activer pour parcourir`}
        onClick={() => {
          if (!disabled && !occupe) inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !occupe) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setSurvol(false);
          void traiter(e.dataTransfer.files?.[0]);
        }}
        className={`flex items-center gap-2 rounded border border-dashed px-3 py-2.5 ${
          survol ? "border-neon bg-neon/10" : "border-line"
        } ${disabled ? "opacity-40" : "cursor-pointer hover:border-snow"}`}
      >
        {srcVignette ? (
          <img
            src={srcVignette}
            alt=""
            className="h-11 w-11 shrink-0 rounded object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Icon name="ajouter" size={18} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-snow">
            {occupe ? "Enregistrement…" : srcVignette ? "Changer d'image" : "Parcourir ou déposer une image"}
          </span>
          <span className="block truncate font-mono text-[10px] text-fog" title={value ?? ""}>
            {value ?? "Aucune image"}
          </span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          aria-label={`${label} : choisir un fichier`}
          onChange={(e) => {
            void traiter(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {erreur ? (
        <p className="text-[11px] text-fail" role="alert">
          {erreur}
        </p>
      ) : null}
      <Accordeon
        id="imagepicker-avance"
        titre="Avancé"
        badge={
          value ? (
            <span className="puce" title={value}>
              chemin
            </span>
          ) : undefined
        }
        ouvert={avanceOuvert}
        onToggle={basculerAvance}
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-fog">Ou saisir un chemin (asset déjà empaqueté, URL)</span>
          <input
            type="text"
            className="champ font-mono"
            value={value ?? ""}
            disabled={disabled}
            placeholder="assets/mon-image.png"
            aria-label={`${label} : chemin manuel`}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </Accordeon>
    </div>
  );
}
