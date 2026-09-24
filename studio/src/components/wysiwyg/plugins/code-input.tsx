// ScreenPlugin du module CODE_INPUT (change studio-puzzle-code-input).
// Etape cadenas : code attendu, indice, essais/temps via les defauts globaux.
// Visuel 100 % CSS/SVG generique (aucun asset, offline-first preserve).
// Rendu joueur : pave de saisie + clavier, verification, succes -> onComplete,
// echec -> essais decrements puis verrouillage interne (onTimeout : le Noeud
// reste ACTIVE, l'auteur tranche via Terminer/Abandonner).
import { useEffect, useRef, useState } from "react";
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { MinigameParamsAccordeon } from "./minigame-params";
import { Accordeon, useAccordeon } from "../../Accordeon";

interface CodeInputData {
  code?: string;
  hint?: string;
  successMessage?: string;
  failureMessage?: string;
  maxAttempts?: number;
  timeLimitSeconds?: number;
}

// Cadenas generique : anse + corps en SVG inline, pastilles du code,
// accents via la couleur systeme (branding fourni par l'appelant).
export function Cadenas({ codeLength, accent, ouvert }: { codeLength: number; accent: string; ouvert?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2" aria-label={ouvert ? "Cadenas ouvert" : "Cadenas fermé"}>
      <svg width="64" height="80" viewBox="0 0 64 80" fill="none" aria-hidden="true">
        <path
          d={ouvert ? "M20 36 V26 a12 12 0 0 1 24 0" : "M20 36 V26 a12 12 0 0 1 24 0 V36"}
          stroke={accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect x="10" y="34" width="44" height="36" rx="7" fill="var(--surface-2)" stroke={accent} strokeWidth="2" />
        <circle cx="32" cy="48" r="5" fill={accent} />
        <rect x="30" y="50" width="4" height="10" rx="2" fill={accent} />
      </svg>
      <div className="flex gap-1.5" aria-label={`${codeLength} caractère(s) attendus`}>
        {Array.from({ length: Math.max(codeLength, 1) }, (_, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full border"
            style={{ borderColor: accent, background: ouvert ? accent : "transparent" }}
          />
        ))}
      </div>
    </div>
  );
}

// Apercu statique : cadenas + longueur masquee + essais.
export function CodeInputEditorPreview({ data }: ModuleEditorPreviewProps) {
  const d = data as CodeInputData;
  if (!d.code) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Cadenas — aucun code</p>
        <p className="text-[10px] text-fog">Cliquez pour configurer le code attendu et l'indice</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded bg-surface-2/50 px-3 py-3">
      <Cadenas codeLength={d.code.length} accent="var(--couleur-accent)" />
      <p className="text-[10px] text-fog">
        Code {d.code.length} caractère(s)
        {typeof d.maxAttempts === "number" ? ` — ${d.maxAttempts} essai(s)` : ""}
        {d.hint ? " — indice configuré" : " — sans indice"}
      </p>
    </div>
  );
}

// Panneau de proprietes : code attendu, indice, messages, essais/temps.
export function CodeInputPropertiesPanel({ data, onChange, readOnly, minigameDefaults }: ModulePropertiesPanelProps) {
  const d = data as CodeInputData;
  const [ouvert, basculer] = useAccordeon("code-input-config", true);
  const set = (cle: keyof CodeInputData, valeur: string) =>
    onChange({ ...data, [cle]: valeur === "" ? undefined : valeur });
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-2" aria-label="Configuration du cadenas">
        <Accordeon
          id="code-input-config"
          titre="Code et indice"
          badge={
            <span className="puce">{d.code ? `${d.code.length} caractère(s)` : "sans code"}</span>
          }
          ouvert={ouvert}
          onToggle={basculer}
        >
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-xs">
              Code attendu (requis)
              <input
                className="champ"
                value={d.code ?? ""}
                placeholder="1947"
                aria-label="Code attendu"
                onChange={(e) => set("code", e.target.value)}
              />
            </label>
            {!d.code ? (
              <p className="text-[11px] text-fail" role="alert">
                Un cadenas sans code sera rejeté à la validation.
              </p>
            ) : null}
            <label className="flex flex-col gap-1 text-xs">
              Indice (optionnel)
              <input
                className="champ"
                value={d.hint ?? ""}
                placeholder="Regarde sous le banc…"
                aria-label="Indice affiché au joueur"
                onChange={(e) => set("hint", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Message de succès (optionnel)
              <input
                className="champ"
                value={d.successMessage ?? ""}
                placeholder="Clic ! Le cadenas s'ouvre."
                aria-label="Message de succès"
                onChange={(e) => set("successMessage", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Message d'échec (optionnel)
              <input
                className="champ"
                value={d.failureMessage ?? ""}
                placeholder="Raté, essaie encore."
                aria-label="Message d'échec"
                onChange={(e) => set("failureMessage", e.target.value)}
              />
            </label>
          </div>
        </Accordeon>
        <MinigameParamsAccordeon data={data} defaults={minigameDefaults} onChange={onChange} readOnly={readOnly} />
      </div>
    </fieldset>
  );
}

// Rendu joueur interactif : saisie (clavier + pave tactile), verification,
// succes -> onComplete, echec -> essais puis verrouillage interne.
export function CodeInputPlayerRenderer({ data, branding, onComplete }: ModulePlayerRendererProps) {
  const d = data as CodeInputData;
  const maxEssais = typeof d.maxAttempts === "number" && d.maxAttempts >= 1 ? d.maxAttempts : null;
  const limite = typeof d.timeLimitSeconds === "number" && d.timeLimitSeconds > 0 ? d.timeLimitSeconds : null;
  const accent = branding?.primaryColor ?? "var(--couleur-accent)";

  const [saisie, setSaisie] = useState("");
  const [essais, setEssais] = useState(0);
  const [termine, setTermine] = useState(false);
  const [blocage, setBlocage] = useState<string | null>(null);
  const [restant, setRestant] = useState<number | null>(limite);
  const fini = useRef(false);

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
  }, [limite, d.code]);

  if (!d.code) return <p className="text-sm">Cadenas non configuré (code attendu manquant).</p>;

  const valider = (valeur: string) => {
    if (termine || blocage) return;
    if (valeur === d.code) {
      if (!fini.current) {
        fini.current = true;
        setTermine(true);
        onComplete?.(1);
      }
      return;
    }
    const total = essais + 1;
    setEssais(total);
    setSaisie("");
    if (maxEssais != null && total >= maxEssais) {
      setBlocage(
        d.failureMessage ?? `Essais épuisés (${maxEssais}) — manche terminée (l'auteur tranche : Terminer / Abandonner).`,
      );
    }
  };

  const taper = (car: string) => {
    if (termine || blocage) return;
    setSaisie((s) => s + car);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Cadenas codeLength={d.code.length} accent={accent} ouvert={termine} />
      {d.hint && !termine ? <p className="text-xs text-fog">Indice : {d.hint}</p> : null}
      <p className="text-xs text-fog" aria-live="polite">
        {saisie ? "•".repeat(saisie.length) : `${d.code.length} caractère(s) attendus`}
        {maxEssais != null ? ` — essai ${Math.min(essais + 1, maxEssais)}/${maxEssais}` : ""}
        {restant != null ? ` — ${restant}s` : ""}
      </p>
      <div className="flex gap-2">
        <input
          className="champ min-h-9 flex-1"
          value={saisie}
          disabled={termine || blocage != null}
          aria-label="Saisie du code"
          placeholder="Tape le code…"
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") valider(saisie);
          }}
        />
        <button type="button" className="btn min-h-9" disabled={termine || blocage != null || !saisie} onClick={() => valider(saisie)}>
          Valider
        </button>
        <button type="button" className="btn min-h-9" disabled={termine || blocage != null || !saisie} onClick={() => setSaisie("")} aria-label="Effacer la saisie">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1" aria-label="Pavé tactile">
        {"0123456789".split("").map((c) => (
          <button
            key={c}
            type="button"
            className="btn min-h-9 min-w-9"
            disabled={termine || blocage != null}
            onClick={() => taper(c)}
            aria-label={`Chiffre ${c}`}
          >
            {c}
          </button>
        ))}
      </div>
      {termine ? <p className="text-xs font-semibold text-pass" role="status">{d.successMessage ?? "Cadenas ouvert !"}</p> : null}
      {blocage ? <p className="text-xs text-fail" role="alert">{blocage}</p> : null}
    </div>
  );
}

export const codeInputScreenPlugin: ModuleScreenPlugin = {
  type: "CODE_INPUT",
  label: "Cadenas à code",
  icon: "etape",
  zoneNeeds: { content: true, header: false, footer: false },
  defaultScreen: {
    layout: "basic-story",
    background: { type: "color", value: "#1a1a2e" },
    zones: {
      content: { layout: "stack", widgets: [{ type: "module" }] },
    },
  },
  editorPreview: CodeInputEditorPreview,
  propertiesPanel: CodeInputPropertiesPanel,
  playerRenderer: CodeInputPlayerRenderer,
  customizableStyles: { backgroundColor: true, textColor: true },
};
