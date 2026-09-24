// ScreenPlugin du module BOUSSOLE (change studio-module-forms).
// Enigme boussole : toleranceDeg (requis), stabilisation, secours (code
// animateur), essais/temps via les defauts globaux. Le module reste validant
// en interne : aucun cap ne remonte vers l'orchestrateur.
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { MinigameParamsAccordeon } from "./minigame-params";
import { Accordeon, useAccordeon } from "../../Accordeon";

interface BoussoleData {
  toleranceDeg?: number;
  stabilizationMs?: number;
  onTimeout?: string;
  fallback?: { code?: string };
  maxAttempts?: number;
  timeLimitSeconds?: number;
}

// Rose des vents statique avec secteur de tolerance.
export function BoussoleEditorPreview({ data }: ModuleEditorPreviewProps) {
  const d = data as BoussoleData;
  const tol = typeof d.toleranceDeg === "number" ? d.toleranceDeg : null;
  if (tol == null) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Boussole — sans tolérance</p>
        <p className="text-[10px] text-fog">Cliquez pour configurer la tolérance en degrés</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded bg-surface-2/50 px-3 py-3">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-label={`Rose des vents, tolérance ${tol} degrés`}>
        <circle cx="36" cy="36" r="30" stroke="var(--couleur-accent)" strokeWidth="2" />
        <path d="M36 6 L40 22 L36 19 L32 22 Z" fill="var(--couleur-accent)" />
        <text x="36" y="14" textAnchor="middle" fontSize="9" fill="var(--couleur-accent)">N</text>
        <circle cx="36" cy="36" r="3" fill="var(--couleur-accent)" />
        <text x="36" y="62" textAnchor="middle" fontSize="9" fill="var(--ink-2)">±{tol}°</text>
      </svg>
      <p className="text-[10px] text-fog">
        Tolérance ±{tol}°{typeof d.stabilizationMs === "number" ? ` — stabilisation ${d.stabilizationMs} ms` : ""}
        {d.fallback?.code ? " — secours configuré" : " — sans secours"}
      </p>
    </div>
  );
}

// Panneau de proprietes : tolerance (requise), stabilisation, secours.
export function BoussolePropertiesPanel({ data, onChange, readOnly, minigameDefaults }: ModulePropertiesPanelProps) {
  const d = data as BoussoleData;
  const [ouvert, basculer] = useAccordeon("boussole-config", true);
  const setNombre = (cle: "toleranceDeg" | "stabilizationMs", raw: string) => {
    if (raw === "") {
      const next = { ...data };
      delete next[cle];
      onChange(next);
      return;
    }
    onChange({ ...data, [cle]: Number(raw) });
  };
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-2" aria-label="Configuration de la boussole">
        <Accordeon
          id="boussole-config"
          titre="Cap et secours"
          badge={<span className="puce">{typeof d.toleranceDeg === "number" ? `±${d.toleranceDeg}°` : "sans tolérance"}</span>}
          ouvert={ouvert}
          onToggle={basculer}
        >
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-xs">
              Tolérance en degrés (requise, &gt; 0)
              <input
                type="number"
                min={1}
                step={1}
                className="champ"
                value={typeof d.toleranceDeg === "number" ? d.toleranceDeg : ""}
                placeholder="15"
                aria-label="Tolérance en degrés"
                onChange={(e) => setNombre("toleranceDeg", e.target.value)}
              />
            </label>
            {typeof d.toleranceDeg !== "number" ? (
              <p className="text-[11px] text-fail" role="alert">
                Une boussole sans tolérance sera rejetée à la validation.
              </p>
            ) : null}
            <label className="flex flex-col gap-1 text-xs">
              Stabilisation (ms, optionnel)
              <input
                type="number"
                min={0}
                step={100}
                className="champ"
                value={typeof d.stabilizationMs === "number" ? d.stabilizationMs : ""}
                placeholder="2000"
                aria-label="Durée de stabilisation en millisecondes"
                onChange={(e) => setNombre("stabilizationMs", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Code de secours animateur (optionnel)
              <input
                className="champ"
                value={d.fallback?.code ?? ""}
                placeholder="Code si capteur instable"
                aria-label="Code de secours animateur"
                onChange={(e) =>
                  onChange({ ...data, fallback: e.target.value ? { code: e.target.value } : undefined })
                }
              />
            </label>
          </div>
        </Accordeon>
        <MinigameParamsAccordeon data={data} defaults={minigameDefaults} onChange={onChange} readOnly={readOnly} />
      </div>
    </fieldset>
  );
}

// Rendu joueur : etat non bloquant (capteur natif hors socle Studio),
// la simulation continue via Terminer/Abandonner.
export function BoussolePlayerRenderer({ data }: ModulePlayerRendererProps) {
  return <BoussoleEditorPreview data={data} />;
}

export const boussoleScreenPlugin: ModuleScreenPlugin = {
  type: "BOUSSOLE",
  label: "Énigme boussole",
  icon: "etape",
  zoneNeeds: { content: true, header: false, footer: false },
  defaultScreen: {
    layout: "basic-story",
    background: { type: "color", value: "#1a1a2e" },
    zones: {
      content: { layout: "stack", widgets: [{ type: "module" }] },
    },
  },
  editorPreview: BoussoleEditorPreview,
  propertiesPanel: BoussolePropertiesPanel,
  playerRenderer: BoussolePlayerRenderer,
  customizableStyles: {},
};
