// ScreenPlugin du module DIFFERENCE_GAME (change studio-module-forms).
// Jeu des 7 erreurs : images source + derivee (assets du pack), dilatation
// tactile, trace de zones RECTANGLES en % sur l'image source (clic-glisse,
// normalise sur l'image affichee — responsive par construction).
import { useRef, useState } from "react";
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { Accordeon, useAccordeon } from "../../Accordeon";
import { ImagePicker } from "../ImagePicker";

export interface DiffZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiffPoint {
  x: number;
  y: number;
}

export interface DiffZonePoly {
  points: DiffPoint[];
}

// Zone 7-erreurs (change zones-7-erreurs) : rectangle historique OU polygone
// (liste de sommets en %). Les deux coexistent dans `polygons`.
export type DiffZone = DiffZoneRect | DiffZonePoly;

export const estPolygone = (z: DiffZone): z is DiffZonePoly => Array.isArray((z as DiffZonePoly).points);

export const libelleZone = (z: DiffZone, i: number): string =>
  estPolygone(z)
    ? `Zone ${i + 1} — polygone ${z.points.length} sommets`
    : `Zone ${i + 1} — ${z.x}%, ${z.y}% · ${z.w}×${z.h}`;

// Calque de zone en % sur l'image source (change zones-7-erreurs) : partage
// par l'apercu, le traceur et la relecture pour un rendu identique.
export function ZoneForme({ zone, index }: { zone: DiffZone; index: number }) {
  if (estPolygone(zone)) {
    return (
      <svg
        key={index}
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points={zone.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--couleur-accent)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  return (
    <div
      key={index}
      className="absolute border-2"
      style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%`, borderColor: "var(--couleur-accent)" }}
    />
  );
}

interface DifferenceData {
  source?: string;
  derivee?: string;
  polygons?: DiffZone[];
  touchDilatation?: number;
  simplifyPx?: number;
}

const arrondi1 = (n: number) => Math.round(n * 10) / 10;

// Apercu statique : source avec overlay des zones.
export function DifferenceEditorPreview({ data }: ModuleEditorPreviewProps) {
  const d = data as DifferenceData;
  const zones = Array.isArray(d.polygons) ? d.polygons : [];
  if (!d.source) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">7 erreurs — sans image source</p>
        <p className="text-[10px] text-fog">Cliquez pour déposer source + dérivée puis tracer les zones</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded bg-surface-2/50 px-3 py-3">
      <div className="relative overflow-hidden rounded border border-line">
        <img src={d.source} alt="Source du 7 erreurs" className="block w-full" />
        {zones.map((p, i) => (
          <ZoneForme key={i} zone={p} index={i} />
        ))}
      </div>
      <p className="text-[10px] text-fog">
        {zones.length} zone(s){d.derivee ? " — dérivée configurée" : " — dérivée manquante"}
      </p>
    </div>
  );
}

// Traceur : rectangle (clic-glisse, min 1 %) ou polygone (clic = sommet,
// Fermer = zone si >= 3 sommets), en % sur l'image affichee a son ratio reel
// (dimensions naturelles, fallback 16:9). Liste + suppression.
export function ZoneTracer({
  source,
  zones,
  onChange,
  readOnly,
}: {
  source: string;
  zones: DiffZone[];
  onChange: (zones: DiffZone[]) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const [courant, setCourant] = useState<DiffZoneRect | null>(null);
  const [outil, setOutil] = useState<"rectangle" | "polygone">("rectangle");
  const [sommets, setSommets] = useState<DiffPoint[]>([]);
  const [ratio, setRatio] = useState<number | null>(null);

  const enPourcent = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: arrondi1(Math.min(Math.max(((clientX - r.left) / r.width) * 100, 0), 100)),
      y: arrondi1(Math.min(Math.max(((clientY - r.top) / r.height) * 100, 0), 100)),
    };
  };
  const fermerPolygone = (pts: DiffPoint[]) => {
    if (pts.length >= 3) onChange([...zones, { points: pts }]);
    setSommets([]);
  };
  return (
    <div className="flex flex-col gap-2">
      {!readOnly ? (
        <div className="flex gap-1" role="toolbar" aria-label="Outil de tracé">
          <button
            type="button"
            className={`btn min-h-8 px-2.5 text-[8px] ${outil === "rectangle" ? "font-bold" : ""}`}
            aria-pressed={outil === "rectangle"}
            onClick={() => { setOutil("rectangle"); setSommets([]); }}
          >
            Rectangle
          </button>
          <button
            type="button"
            className={`btn min-h-8 px-2.5 text-[8px] ${outil === "polygone" ? "font-bold" : ""}`}
            aria-pressed={outil === "polygone"}
            onClick={() => { setOutil("polygone"); setCourant(null); depart.current = null; }}
          >
            Polygone
          </button>
          {outil === "polygone" && sommets.length > 0 ? (
            <>
              <button
                type="button"
                className="btn min-h-8 px-2.5 text-[8px]"
                disabled={sommets.length < 3}
                title={sommets.length < 3 ? "Au moins 3 sommets pour fermer" : "Fermer le polygone"}
                onClick={() => fermerPolygone(sommets)}
              >
                Fermer ({sommets.length})
              </button>
              <button
                type="button"
                className="btn min-h-8 px-2.5 text-[8px]"
                onClick={() => setSommets([])}
              >
                Annuler
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <div
        ref={ref}
        className="relative select-none overflow-hidden rounded border border-line"
        style={{ touchAction: "none", cursor: readOnly ? undefined : "crosshair", aspectRatio: ratio ? `${ratio}` : "16 / 9" }}
        aria-label={outil === "polygone" ? "Traceur de zones : cliquez pour ajouter des sommets" : "Traceur de zones : cliquez-glissez sur l'image"}
        onPointerDown={(e) => {
          if (readOnly || outil !== "rectangle") return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          depart.current = enPourcent(e.clientX, e.clientY);
          setCourant({ ...depart.current, w: 0, h: 0 });
        }}
        onPointerMove={(e) => {
          const dep = depart.current;
          if (!dep || readOnly || outil !== "rectangle") return;
          const p = enPourcent(e.clientX, e.clientY);
          setCourant({ x: Math.min(dep.x, p.x), y: Math.min(dep.y, p.y), w: arrondi1(Math.abs(p.x - dep.x)), h: arrondi1(Math.abs(p.y - dep.y)) });
        }}
        onPointerUp={() => {
          if (readOnly || outil !== "rectangle") return;
          if (courant && courant.w >= 1 && courant.h >= 1) onChange([...zones, courant]);
          depart.current = null;
          setCourant(null);
        }}
        onClick={(e) => {
          if (readOnly || outil !== "polygone") return;
          setSommets((s) => [...s, enPourcent(e.clientX, e.clientY)]);
        }}
      >
        <img
          src={source}
          alt="Source à zoner"
          className="absolute inset-0 h-full w-full"
          draggable={false}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) setRatio(img.naturalWidth / img.naturalHeight);
          }}
        />
        {zones.map((p, i) => (
          <ZoneForme key={i} zone={p} index={i} />
        ))}
        {courant && courant.w > 0 && courant.h > 0 ? (
          <div
            className="absolute border-2 border-dashed border-white"
            style={{ left: `${courant.x}%`, top: `${courant.y}%`, width: `${courant.w}%`, height: `${courant.h}%` }}
          />
        ) : null}
        {sommets.length > 0 ? (
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={sommets.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="white"
              strokeWidth={2}
              strokeDasharray="2 1"
              vectorEffect="non-scaling-stroke"
            />
            {sommets.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={1.2} fill="white" />
            ))}
          </svg>
        ) : null}
      </div>
      {zones.length > 0 ? (
        <ul className="flex flex-col gap-1" aria-label="Zones tracées">
          {zones.map((p, i) => (
            <li key={i} className="flex items-center gap-2 font-mono text-[10px] text-fog">
              <span className="flex-1">
                {libelleZone(p, i)}
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  className="btn min-h-8 px-2.5 text-[8px]"
                  aria-label={`Supprimer la zone ${i + 1}`}
                  onClick={() => onChange(zones.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-fog">Aucune zone — rectangle (cliquer-glisser) ou polygone (cliquer les sommets puis Fermer). Le schéma en exige au moins 1.</p>
      )}
    </div>
  );
}

// Panneau de proprietes : source + derivee, dilatation, traceur.
export function DifferencePropertiesPanel({ data, onChange, readOnly, onPickFile }: ModulePropertiesPanelProps) {
  const d = data as DifferenceData;
  const zones = Array.isArray(d.polygons) ? d.polygons : [];
  const [ouvert, basculer] = useAccordeon("difference-config", true);
  const pick = onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); });
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-2" aria-label="Configuration du 7 erreurs">
        <Accordeon
          id="difference-config"
          titre="Images et zones"
          badge={
            <>
              <span className="puce">{zones.length} zone(s)</span>
              {!d.source || !d.derivee ? (
                <span className="puce puce-erreur" role="alert">
                  Images manquantes
                </span>
              ) : null}
            </>
          }
          ouvert={ouvert}
          onToggle={basculer}
        >
          <div className="flex flex-col gap-2">
            <ImagePicker
              label="Image source (asset du pack)"
              value={d.source ?? ""}
              onPickFile={pick}
              onChange={(source) => onChange({ ...data, source: source || undefined })}
            />
            <ImagePicker
              label="Image dérivée (asset du pack)"
              value={d.derivee ?? ""}
              onPickFile={pick}
              onChange={(derivee) => onChange({ ...data, derivee: derivee || undefined })}
            />
            {!d.source || !d.derivee ? (
              <p className="text-[11px] text-fail" role="alert">
                Déposez les deux images : source (à zoner) et dérivée (à comparer).
              </p>
            ) : null}
            <label className="flex flex-col gap-1 text-xs">
              Dilatation tactile (%, rappel : 44 px mini pour gants)
              <input
                type="number"
                min={0}
                step={0.5}
                className="champ"
                value={typeof d.touchDilatation === "number" ? d.touchDilatation : ""}
                placeholder="2"
                aria-label="Dilatation tactile en pourcents"
                onChange={(e) =>
                  onChange({ ...data, touchDilatation: e.target.value === "" ? undefined : Number(e.target.value) })
                }
              />
            </label>
            {d.source ? (
              <ZoneTracer
                source={d.source}
                zones={zones}
                readOnly={readOnly}
                onChange={(polygons) => onChange({ ...data, polygons })}
              />
            ) : null}
          </div>
        </Accordeon>
      </div>
    </fieldset>
  );
}

// Rendu joueur : etat non bloquant (tactile natif hors socle Studio),
// la simulation continue via Terminer/Abandonner.
export function DifferencePlayerRenderer({ data }: ModulePlayerRendererProps) {
  return <DifferenceEditorPreview data={data} />;
}

export const differenceGameScreenPlugin: ModuleScreenPlugin = {
  type: "DIFFERENCE_GAME",
  label: "Jeu des 7 erreurs",
  icon: "etape",
  zoneNeeds: { content: true, header: false, footer: false },
  defaultScreen: {
    layout: "basic-story",
    background: { type: "color", value: "#1a1a2e" },
    zones: {
      content: { layout: "stack", widgets: [{ type: "module" }] },
    },
  },
  editorPreview: DifferenceEditorPreview,
  propertiesPanel: DifferencePropertiesPanel,
  playerRenderer: DifferencePlayerRenderer,
  customizableStyles: {},
};
