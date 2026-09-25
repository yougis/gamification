// Selecteur de fichier media pack — video ou audio (change module-info-story).
// Meme circuit manifest que les images : parcours + depot, SHA-256 via
// `onPickFile`, gabarit (taille) affiche avant validation, refus explicite
// des non-medias. Les URL reseau saisies a la main seront refusees a
// l'export (spec : medias 100 % pack offline).
import { useRef, useState } from "react";
import { Icon } from "../icons";
import { Accordeon, useAccordeon } from "../Accordeon";
import { estMediaAcceptable, extensionsMedia, type MediaKind } from "./image-files";

const ACCEPTE: Record<MediaKind, string> = {
  video: "video/*,.mp4,.webm,.ogv,.ogg,.mov,.m4v",
  audio: "audio/*,.mp3,.ogg,.oga,.wav,.m4a,.opus,.flac",
};

const LIBELLE: Record<MediaKind, string> = {
  video: "Vidéo",
  audio: "Audio",
};

function tailleLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function MediaPicker({
  kind,
  value,
  onChange,
  onPickFile,
  disabled,
  label,
}: {
  kind: MediaKind;
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
  const [gabarit, setGabarit] = useState<string | null>(null);
  const [avanceOuvert, basculerAvance] = useAccordeon(`mediapicker-avance-${kind}`, false);
  const titre = label ?? LIBELLE[kind];

  const traiter = async (f: File | undefined) => {
    if (!f || disabled || occupe) return;
    setErreur(null);
    if (!estMediaAcceptable(kind, f)) {
      setErreur(`Fichier refusé : « ${f.name} » n'est pas un ${LIBELLE[kind].toLowerCase()} (${extensionsMedia(kind)}).`);
      return;
    }
    setOccupe(true);
    try {
      const chemin = await onPickFile(f);
      setGabarit(`${f.name} — ${tailleLisible(f.size)}`);
      onChange(chemin);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" aria-label={titre}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${titre} : déposer un fichier ou activer pour parcourir`}
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
        <Icon name={kind === "video" ? "etape" : "essai"} size={18} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-snow">
            {occupe ? "Enregistrement…" : value ? `Changer de ${LIBELLE[kind].toLowerCase()}` : `Parcourir ou déposer un ${LIBELLE[kind].toLowerCase()}`}
          </span>
          <span className="block truncate font-mono text-[10px] text-fog" title={value ?? ""}>
            {value ?? `Aucun ${LIBELLE[kind].toLowerCase()} (${extensionsMedia(kind)})`}
          </span>
          {gabarit ? (
            <span className="block truncate font-mono text-[10px] text-fog" title={gabarit}>
              {gabarit}
            </span>
          ) : null}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTE[kind]}
          className="hidden"
          disabled={disabled}
          aria-label={`${titre} : choisir un fichier`}
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
        id={`mediapicker-avance-${kind}`}
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
          <span className="text-fog">Ou saisir un chemin (asset déjà empaqueté — les URL réseau seront refusées à l'export)</span>
          <input
            type="text"
            className="champ font-mono"
            value={value ?? ""}
            disabled={disabled}
            placeholder="assets/mon-film.mp4"
            aria-label={`${titre} : chemin manuel`}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </Accordeon>
    </div>
  );
}
