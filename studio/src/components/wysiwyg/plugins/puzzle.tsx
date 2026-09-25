// ScreenPlugin du module PUZZLE (change studio-screen-editor).
// Bloc puzzle image : image source (asset du pack), decoupe lignes x colonnes
// 2-6, apercu de la grille (pieces = lignes x colonnes), refus hors bornes.
// L'image est referencee par chemin d'asset : son enregistrement au manifest
// passe par le pipeline `registerAsset` existant (ecran Exporter).
// Jeu (change studio-puzzle-code-input) : tuiles decoupees par
// background-position, melange Fisher-Yates anti-resolu, deplacement `slide`
// (tap-a-tap + clavier) ou `drag` (pointeur tactile/souris), completion ->
// onComplete, essais/temps -> verrouillage interne (le Noeud reste ACTIVE,
// l'auteur tranche via Terminer/Abandonner comme pour les autres modules).
import { useEffect, useMemo, useRef, useState } from "react";
import { urlAssetSession } from "../image-files";
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { MinigameParamsAccordeon } from "./minigame-params";
import { Accordeon, useAccordeon } from "../../Accordeon";
import { ImagePicker } from "../ImagePicker";

export const DECOUPE_MIN = 2;
export const DECOUPE_MAX = 6;

interface PuzzleData {
  image?: string;
  tileRows?: number;
  tileCols?: number;
  rows?: number;
  cols?: number;
  mode?: string;
  maxAttempts?: number;
  timeLimitSeconds?: number;
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

export function puzzleMode(data: Record<string, unknown>): "slide" | "drag" {
  return (data as PuzzleData).mode === "drag" ? "drag" : "slide";
}

// --- Utilitaires purs (testables sans React) ---

// Melange Fisher-Yates des index d'origine [0..n-1]. Ne retourne jamais
// l'ordre resolu (garde anti-resolu), sauf n <= 1.
export function melangerPieces(n: number, tirage: () => number = Math.random): number[] {
  const ordre = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(tirage() * (i + 1));
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
  }
  if (n > 1 && puzzleEstResolu(ordre)) [ordre[n - 1], ordre[n - 2]] = [ordre[n - 2], ordre[n - 1]];
  return ordre;
}

export function puzzleEstResolu(ordre: number[]): boolean {
  return ordre.every((origine, position) => origine === position);
}

export function echangerPieces(ordre: number[], a: number, b: number): number[] {
  const next = [...ordre];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// Fond CSS d'une tuile : l'image source est affichee en grand derriere la
// grille, chaque tuile n'en montre que sa part (origine = index resolu).
export function tuileFond(image: string, lignes: number, colonnes: number, origine: number): React.CSSProperties {
  const col = colonnes > 1 ? (origine % colonnes) / (colonnes - 1) : 0;
  const lig = lignes > 1 ? Math.floor(origine / colonnes) / (lignes - 1) : 0;
  return {
    backgroundImage: `url("${image}")`,
    backgroundSize: `${colonnes * 100}% ${lignes * 100}%`,
    backgroundPosition: `${col * 100}% ${lig * 100}%`,
    backgroundRepeat: "no-repeat",
  };
}

// Apercu statique : image decoupee en tuiles melangees (jamais la grille
// numerotee). Re-melange a chaque changement de config, stable sinon.
export function PuzzleEditorPreview({ data }: ModuleEditorPreviewProps) {
  const d = data as PuzzleData;
  const { lignes, colonnes } = puzzleDecoupe(data);
  const pieces = lignes * colonnes;
  const melange = useMemo(() => melangerPieces(pieces), [d.image, lignes, colonnes, pieces]);
  // Résolution d'asset (change studio-lot-correctifs) : le chemin du pack
  // n'est pas affichable tel quel dans le Studio — même mécanisme que la
  // vignette ImagePicker (repli = chemin brut).
  const srcImage = (d.image && urlAssetSession(d.image)) || d.image;
  if (!d.image) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Puzzle — aucune image</p>
        <p className="text-[10px] text-fog">Cliquez pour configurer l'image et la découpe</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded bg-surface-2/50 px-3 py-3">
      <p className="text-[10px] text-fog">
        Puzzle {lignes}×{colonnes} — {pieces} pièces mélangées
      </p>
      <div
        className="grid gap-0.5 overflow-hidden rounded border border-line"
        style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}
        aria-label={`Aperçu mélangé ${lignes} par ${colonnes}`}
      >
        {melange.map((origine, position) => (
          <div
            key={position}
            className="aspect-square bg-surface"
            style={tuileFond(srcImage!, lignes, colonnes, origine)}
            title={`Tuile ${position + 1}`}
          />
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
export function PuzzlePropertiesPanel({ data, onChange, readOnly, minigameDefaults, onPickFile }: ModulePropertiesPanelProps) {
  const d = data as PuzzleData;
  const lignes = typeof d.tileRows === "number" ? d.tileRows : 3;
  const colonnes = typeof d.tileCols === "number" ? d.tileCols : 3;
  const valide = puzzleDecoupeValide(lignes, colonnes);
  const [decoupeOuverte, basculerDecoupe] = useAccordeon("puzzle-decoupe", true);
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
        <Accordeon
          id="puzzle-decoupe"
          titre="Image et découpe"
          badge={
            <>
              <span className="puce">
                {lignes}×{colonnes} ({lignes * colonnes} pièces)
              </span>
              {!valide ? (
                <span className="puce puce-erreur" role="alert">
                  Hors bornes 2–6
                </span>
              ) : null}
            </>
          }
          ouvert={decoupeOuverte}
          onToggle={basculerDecoupe}
        >
          <div className="flex flex-col gap-2">
            <ImagePicker
              label="Image source (asset du pack)"
              value={d.image ?? ""}
              onPickFile={onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); })}
              onChange={(image) => onChange({ ...data, image: image || undefined })}
            />
            <p className="text-[11px] text-fog">Le fichier est ajouté au manifest (écran Exporter).</p>
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
            ) : null}
            <label className="flex flex-col gap-1 text-xs">
              Déplacement des tuiles
              <select
                className="champ"
                value={puzzleMode(data)}
                aria-label="Mode de déplacement des tuiles"
                onChange={(e) => onChange({ ...data, mode: e.target.value })}
              >
                <option value="slide">Tap-à-tap (sélection + échange, clavier OK)</option>
                <option value="drag">Glisser-déposer (tactile + souris)</option>
              </select>
            </label>
          </div>
        </Accordeon>
        <MinigameParamsAccordeon data={data} defaults={minigameDefaults} onChange={onChange} readOnly={readOnly} />
      </div>
    </fieldset>
  );
}

// Rendu joueur interactif : melange initial, deplacement slide (tap-a-tap,
// clavier via focus + Entree) ou drag (pointeur), completion -> onComplete,
// essais/temps -> verrouillage interne avec message.
export function PuzzlePlayerRenderer({ data, branding, onComplete, hint }: ModulePlayerRendererProps) {
  const d = data as PuzzleData;
  const { lignes, colonnes } = puzzleDecoupe(data);
  const pieces = lignes * colonnes;
  const mode = puzzleMode(data);
  const maxEssais = typeof d.maxAttempts === "number" && d.maxAttempts >= 1 ? d.maxAttempts : null;
  const limite = typeof d.timeLimitSeconds === "number" && d.timeLimitSeconds > 0 ? d.timeLimitSeconds : null;
  const accent = branding?.primaryColor ?? "var(--couleur-accent)";

  const [ordre, setOrdre] = useState<number[]>(() => melangerPieces(pieces));
  const [selection, setSelection] = useState<number | null>(null);
  const [essais, setEssais] = useState(0);
  const [termine, setTermine] = useState(false);
  const [blocage, setBlocage] = useState<string | null>(null);
  const [restant, setRestant] = useState<number | null>(limite);
  const fini = useRef(false);
  const presse = useRef<{ position: number; x: number; y: number } | null>(null);
  const [fantome, setFantome] = useState<{ x: number; y: number } | null>(null);

  // Compte a rebours : a zero, verrouillage interne (onTimeout).
  useEffect(() => {
    if (limite == null) return;
    setRestant(limite);
    const t = window.setInterval(() => {
      setRestant((r) => {
        if (r == null || r <= 1) {
          window.clearInterval(t);
          setBlocage("Temps écoulé — manche terminée (l'auteur tranche : Terminer / Abandonner).");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [limite, d.image, lignes, colonnes]);

  if (!d.image) return <p className="text-sm">Puzzle sans image source.</p>;

  const permuter = (a: number, b: number) => {
    if (a === b || termine || blocage) return;
    if (maxEssais != null && essais + 1 > maxEssais) {
      setBlocage(`Essais épuisés (${maxEssais}) — manche terminée (l'auteur tranche : Terminer / Abandonner).`);
      return;
    }
    const next = echangerPieces(ordre, a, b);
    setOrdre(next);
    setEssais((e) => e + 1);
    setSelection(null);
    if (puzzleEstResolu(next) && !fini.current) {
      fini.current = true;
      setTermine(true);
      onComplete?.(pieces);
    }
  };

  // Tap-a-tap (mode slide, et repli clavier/souris en mode drag).
  const taper = (position: number) => {
    if (termine || blocage) return;
    if (selection == null) {
      setSelection(position);
      return;
    }
    permuter(selection, position);
  };

  // Drag au pointeur : suivi du doigt/souris puis ancrage sur la cible.
  const pointeurBas = (position: number) => (e: React.PointerEvent) => {
    presse.current = { position, x: e.clientX, y: e.clientY };
  };
  const pointeurBouge = (e: React.PointerEvent) => {
    const p = presse.current;
    if (!p || termine || blocage) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) setFantome({ x: e.clientX, y: e.clientY });
  };
  const pointeurHaut = (position: number) => (e: React.PointerEvent) => {
    const p = presse.current;
    presse.current = null;
    const glisse = fantome != null;
    setFantome(null);
    if (!p || termine || blocage) return;
    if (mode === "drag" && glisse) {
      const cible = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pos]");
      const vers = cible ? Number(cible.getAttribute("data-pos")) : NaN;
      if (!Number.isNaN(vers)) permuter(p.position, vers);
      else taper(position);
      return;
    }
    taper(position);
  };

  return (
    <div className="flex flex-col gap-2">
      {hint ? <p className="rounded border border-line px-2 py-1 text-xs italic text-fog">💡 {hint}</p> : null}
      <p className="text-xs text-fog">
        Puzzle {lignes}×{colonnes} — {pieces} pièces{maxEssais != null ? ` — essai ${Math.min(essais + 1, maxEssais)}/${maxEssais}` : ""}
        {restant != null ? ` — ${restant}s` : ""}
      </p>
      <div
        className="relative grid gap-0.5 overflow-hidden rounded border border-line"
        style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`, touchAction: mode === "drag" ? "none" : undefined }}
        aria-label={`Puzzle ${mode === "drag" ? "glisser-déposer" : "tap-à-tap"}`}
        onPointerMove={pointeurBouge}
      >
        {ordre.map((origine, position) => (
          <button
            key={position}
            type="button"
            data-pos={position}
            onClick={() => taper(position)}
            onPointerDown={pointeurBas(position)}
            onPointerUp={pointeurHaut(position)}
            disabled={termine || blocage != null}
            aria-label={`Tuile ${position + 1}${origine === position ? " (bien placée)" : ""}${selection === position ? " (sélectionnée)" : ""}`}
            className="aspect-square bg-surface disabled:cursor-default"
            style={{
              ...tuileFond(d.image!, lignes, colonnes, origine),
              outline: selection === position ? `3px solid ${accent}` : undefined,
              outlineOffset: "-3px",
              opacity: origine === position ? 1 : 0.92,
            }}
          />
        ))}
        {fantome && (
          <div
            className="pointer-events-none fixed z-50 h-12 w-12 rounded border-2 opacity-80"
            style={{ left: fantome.x - 24, top: fantome.y - 24, borderColor: accent }}
          />
        )}
      </div>
      {selection != null && !termine && !blocage ? (
        <p className="text-[11px] text-fog">Tuile {selection + 1} sélectionnée — tapez sa destination.</p>
      ) : null}
      {termine ? <p className="text-xs font-semibold text-pass" role="status">Puzzle complété !</p> : null}
      {blocage ? <p className="text-xs text-fail" role="alert">{blocage}</p> : null}
    </div>
  );
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
