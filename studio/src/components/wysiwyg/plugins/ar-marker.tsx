// ScreenPlugin du module AR_MARKER (change studio-module-forms).
// Marqueur a viser + modele 3D + fallback 2D OBLIGATOIRE (soleil,
// permission, vieil appareil : l'etape reste completble sans camera).
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { Accordeon, useAccordeon } from "../../Accordeon";
import { ImagePicker } from "../ImagePicker";

interface ArMarkerData {
  marker?: string;
  model?: string;
  modelSizeMb?: number;
  fallback2D?: Record<string, unknown>;
}

// Apercu statique : marqueur + fallback cote a cote.
export function ArMarkerEditorPreview({ data }: ModuleEditorPreviewProps) {
  const d = data as ArMarkerData;
  if (!d.marker) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Réalité augmentée — sans marqueur</p>
        <p className="text-[10px] text-fog">Cliquez pour configurer le marqueur et le fallback 2D</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded bg-surface-2/50 px-3 py-3">
      <div className="grid grid-cols-2 gap-1">
        <div className="flex flex-col items-center gap-1">
          <img src={d.marker} alt="Marqueur à viser" className="max-h-24 w-full rounded border border-line object-contain" />
          <span className="text-[10px] text-fog">Marqueur</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {typeof d.fallback2D?.image === "string" ? (
            <img src={d.fallback2D.image} alt="Fallback 2D" className="max-h-24 w-full rounded border border-line object-contain" />
          ) : (
            <div className="flex max-h-24 min-h-16 w-full items-center justify-center rounded border border-dashed border-fail/40 text-[10px] text-fail">
              Fallback manquant
            </div>
          )}
          <span className="text-[10px] text-fog">Fallback 2D</span>
        </div>
      </div>
      <p className="truncate text-[10px] text-fog" title={d.model ?? ""}>
        {d.model ? `Modèle : ${d.model}${typeof d.modelSizeMb === "number" ? ` (${d.modelSizeMb} Mo)` : ""}` : "Sans modèle 3D (fallback seul)"}
      </p>
    </div>
  );
}

// Panneau de proprietes : marqueur, modele + taille, fallback 2D obligatoire.
export function ArMarkerPropertiesPanel({ data, onChange, readOnly, onPickFile }: ModulePropertiesPanelProps) {
  const d = data as ArMarkerData;
  const [ouvert, basculer] = useAccordeon("ar-marker-config", true);
  const fallbackImage = typeof d.fallback2D?.image === "string" ? d.fallback2D.image : "";
  const pick = onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); });
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-2" aria-label="Configuration de la réalité augmentée">
        <Accordeon
          id="ar-marker-config"
          titre="Marqueur et secours"
          badge={
            <>
              <span className="puce">{d.marker ? "marqueur OK" : "sans marqueur"}</span>
              {!d.fallback2D ? (
                <span className="puce puce-erreur" role="alert">
                  Fallback requis
                </span>
              ) : null}
            </>
          }
          ouvert={ouvert}
          onToggle={basculer}
        >
          <div className="flex flex-col gap-2">
            <ImagePicker
              label="Marqueur à viser (asset du pack, requis)"
              value={d.marker ?? ""}
              onPickFile={pick}
              onChange={(marker) => onChange({ ...data, marker: marker || undefined })}
            />
            <label className="flex flex-col gap-1 text-xs">
              Modèle 3D (chemin d'asset, optionnel)
              <input
                className="champ"
                value={d.model ?? ""}
                placeholder="assets/modele.glb"
                aria-label="Modèle 3D"
                onChange={(e) => onChange({ ...data, model: e.target.value || undefined })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Taille du modèle (Mo, optionnel)
              <input
                type="number"
                min={0}
                step={0.1}
                className="champ"
                value={typeof d.modelSizeMb === "number" ? d.modelSizeMb : ""}
                placeholder="25"
                aria-label="Taille du modèle en Mo"
                onChange={(e) =>
                  onChange({ ...data, modelSizeMb: e.target.value === "" ? undefined : Number(e.target.value) })
                }
              />
            </label>
            <ImagePicker
              label="Fallback 2D (asset du pack, OBLIGATOIRE)"
              value={fallbackImage}
              onPickFile={pick}
              onChange={(image) =>
                onChange({ ...data, fallback2D: image ? { ...(d.fallback2D ?? {}), image } : undefined })
              }
            />
            {!d.fallback2D ? (
              <p className="text-[11px] text-fail" role="alert">
                Fallback 2D obligatoire : sans lui l'étape est injouable sans caméra et sera rejetée à la validation.
              </p>
            ) : null}
          </div>
        </Accordeon>
      </div>
    </fieldset>
  );
}

// Rendu joueur : etat non bloquant (camera native hors socle Studio),
// la simulation continue via Terminer/Abandonner.
export function ArMarkerPlayerRenderer({ data }: ModulePlayerRendererProps) {
  return <ArMarkerEditorPreview data={data} />;
}

export const arMarkerScreenPlugin: ModuleScreenPlugin = {
  type: "AR_MARKER",
  label: "Réalité augmentée",
  icon: "etape",
  zoneNeeds: { content: true, header: false, footer: false },
  defaultScreen: {
    layout: "basic-story",
    background: { type: "color", value: "#1a1a2e" },
    zones: {
      content: { layout: "stack", widgets: [{ type: "module" }] },
    },
  },
  editorPreview: ArMarkerEditorPreview,
  propertiesPanel: ArMarkerPropertiesPanel,
  playerRenderer: ArMarkerPlayerRenderer,
  customizableStyles: {},
};
