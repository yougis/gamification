// ScreenPlugin du module PUZZLE (change studio-screen-editor).
// Bloc puzzle image : image source (asset du pack), decoupe lignes x colonnes
// 2-6, apercu de la grille (pieces = lignes x colonnes), refus hors bornes.
// L'image est referencee par chemin d'asset : son enregistrement au manifest
// passe par le pipeline `registerAsset` existant (ecran Exporter).
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { MinigameParamsFields } from "./minigame-params";

export const DECOUPE_MIN = 2;
export const DECOUPE_MAX = 6;

interface PuzzleData {
  image?: string;
  tileRows?: number;
  tileCols?: number;
  rows?: number;
  cols?: number;
}

export function puzzleDecoupe(data: Record<string, unknown>): { lignes: number; colonnes: number } {
  const d = data as PuzzleData;
  const lignes = typeof d.tileRows === "number" ? d.tileRows : typeof d.rows === "number" ? d.rows : 3;
  const colonnes = typeof d.tileCols === "number" ? d.tileCols : typeof d.cols === "number" ? d.cols : 3;
  return { lignes, colonnes };
}

export function puzzleDecoupeValide(lignes: number, colonnes: number): boolean {
  return (
    Number.isInteger(lignes) &&
    Number.isInteger(colonnes) &&
    lignes >= DECOUPE_MIN &&
    lignes <= DECOUPE_MAX &&
    colonnes >= DECOUPE_MIN &&
    colonnes <= DECOUPE_MAX
  );
}

// Apercu statique : grille lignes x colonnes sur l'image source.
export function PuzzleEditorPreview({ data }: ModuleEditorPreviewProps) {
  const d = data as PuzzleData;
  if (!d.image) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Puzzle — aucune image</p>
        <p className="text-[10px] text-fog">Cliquez pour configurer l'image et la découpe</p>
      </div>
    );
  }
  const { lignes, colonnes } = puzzleDecoupe(data);
  const pieces = lignes * colonnes;
  return (
    <div className="flex flex-col gap-2 rounded bg-surface-2/50 px-3 py-3">
      <p className="text-[10px] text-fog">
        Puzzle {lignes}×{colonnes} — {pieces} pièces
      </p>
      <div
        className="grid gap-0.5 overflow-hidden rounded border border-line"
        style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}
        aria-label={`Aperçu grille ${lignes} par ${colonnes}`}
      >
        {Array.from({ length: pieces }, (_, i) => (
          <div key={i} className="flex aspect-square items-center justify-center bg-surface text-[10px] text-fog">
            {i + 1}
          </div>
        ))}
      </div>
      <p className="truncate text-[10px] text-fog" title={d.image}>
        Source : {d.image}
      </p>
    </div>
  );
}

// Panneau de proprietes : image source, decoupe 2-6 (refus hors bornes),
// apercu grille, essais/temps via les defauts globaux.
export function PuzzlePropertiesPanel({ data, onChange, readOnly, minigameDefaults }: ModulePropertiesPanelProps) {
  const d = data as PuzzleData;
  const lignes = typeof d.tileRows === "number" ? d.tileRows : 3;
  const colonnes = typeof d.tileCols === "number" ? d.tileCols : 3;
  const valide = puzzleDecoupeValide(lignes, colonnes);
  const setDecoupe = (cible: "tileRows" | "tileCols", raw: string) => {
    if (raw === "") {
      const next = { ...data };
      delete next[cible];
      onChange(next);
      return;
    }
    onChange({ ...data, [cible]: Number(raw) });
  };
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-2" aria-label="Configuration du puzzle">
        <label className="flex flex-col gap-1 text-xs">
          Image source (asset du pack)
          <input
            className="champ"
            value={d.image ?? ""}
            placeholder="puzzle-chateau.jpg"
            aria-label="Image source du puzzle"
            onChange={(e) => onChange({ ...data, image: e.target.value || undefined })}
          />
          <span className="text-[11px] text-fog">Le fichier doit être ajouté au manifest (écran Exporter).</span>
        </label>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            Lignes (2–6)
            <input
              type="number"
              min={DECOUPE_MIN}
              max={DECOUPE_MAX}
              step={1}
              className="champ"
              value={typeof d.tileRows === "number" ? d.tileRows : ""}
              placeholder="3"
              aria-label="Nombre de lignes de découpe"
              onChange={(e) => setDecoupe("tileRows", e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs">
            Colonnes (2–6)
            <input
              type="number"
              min={DECOUPE_MIN}
              max={DECOUPE_MAX}
              step={1}
              className="champ"
              value={typeof d.tileCols === "number" ? d.tileCols : ""}
              placeholder="3"
              aria-label="Nombre de colonnes de découpe"
              onChange={(e) => setDecoupe("tileCols", e.target.value)}
            />
          </label>
        </div>
        {!valide ? (
          <p className="text-[11px] text-fail" role="alert">
            Découpe hors bornes : lignes et colonnes entre {DECOUPE_MIN} et {DECOUPE_MAX} (ex. 1×1 refusé).
          </p>
        ) : (
          <p className="text-[11px] text-fog">
            {lignes * colonnes} pièces ({lignes}×{colonnes}).
          </p>
        )}
        <MinigameParamsFields data={data} defaults={minigameDefaults} onChange={onChange} readOnly={readOnly} />
      </div>
    </fieldset>
  );
}

// Rendu joueur : apercu de la grille et progression (moteur de jeu natif hors socle).
export function PuzzlePlayerRenderer({ data }: ModulePlayerRendererProps) {
  return <PuzzleEditorPreview data={data} />;
}

export const puzzleScreenPlugin: ModuleScreenPlugin = {
  type: "PUZZLE",
  label: "Puzzle image",
  icon: "etape",
  zoneNeeds: { content: true, header: false, footer: false },
  defaultScreen: {
    layout: "basic-story",
    background: { type: "color", value: "#1a1a2e" },
    zones: {
      content: { layout: "stack", widgets: [{ type: "module" }] },
    },
  },
  editorPreview: PuzzleEditorPreview,
  propertiesPanel: PuzzlePropertiesPanel,
  playerRenderer: PuzzlePlayerRenderer,
  customizableStyles: {},
};
