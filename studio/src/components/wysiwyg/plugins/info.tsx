// ScreenPlugin du module INFO (change module-info-story).
// Module du recit : briefing, consigne, interlude. Etapes ordonnees
// { text?, image?, video?, audio? } (au moins un contenu), navigation swipe
// + bouton « Suivant » (les deux appellent le meme avancer), medias lus a
// la demande (jamais d'autoplay), fin des etapes -> onComplete. Pas d'essais
// ni de temps : un recit ne se « rate » pas.
import { useRef, useState } from "react";
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { Accordeon, useAccordeon } from "../../Accordeon";
import { ImagePicker } from "../ImagePicker";
import { MediaPicker } from "../MediaPicker";

export interface InfoStep {
  text?: string;
  image?: string;
  video?: string;
  audio?: string;
}

export function infoSteps(data: Record<string, unknown>): InfoStep[] {
  const steps = (data as { steps?: unknown }).steps;
  return Array.isArray(steps) ? (steps as InfoStep[]) : [];
}

export function etapeValide(step: InfoStep): boolean {
  return [step.text, step.image, step.video, step.audio].some(
    (c) => typeof c === "string" && c.trim() !== "",
  );
}

function EtapeVisuel({ step }: { step: InfoStep }) {
  return (
    <div className="flex flex-col gap-1.5">
      {step.text ? <p className="text-sm text-snow">{step.text}</p> : null}
      {step.image ? <img src={step.image} alt="" className="block w-full rounded border border-line object-contain" /> : null}
      {step.video ? (
        <p className="truncate font-mono text-[10px] text-fog" title={step.video}>
          🎬 {step.video}
        </p>
      ) : null}
      {step.audio ? (
        <p className="truncate font-mono text-[10px] text-fog" title={step.audio}>
          🔊 {step.audio}
        </p>
      ) : null}
    </div>
  );
}

// Apercu statique pagine : premiere etape + compteur 1/N. Aucun element
// <video>/<audio> (garantie anti-autoplay), aucun geste, aucun etat.
export function InfoEditorPreview({ data }: ModuleEditorPreviewProps) {
  const steps = infoSteps(data);
  if (steps.length === 0) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Récit — aucune étape</p>
        <p className="text-[10px] text-fog">Cliquez pour ajouter des étapes (texte, image, vidéo, audio)</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded bg-surface-2/50 px-3 py-3">
      <p className="text-[10px] text-fog">Étape 1/{steps.length}</p>
      <EtapeVisuel step={steps[0]} />
    </div>
  );
}

// Panneau de proprietes : liste d'etapes (ajout/suppression/monte/descend),
// chacune avec texte multiligne + selecteurs pack image/video/audio.
export function InfoPropertiesPanel({ data, onChange, readOnly, onPickFile }: ModulePropertiesPanelProps) {
  const steps = infoSteps(data);
  const pick = onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); });
  const patchEtape = (index: number, patch: Partial<InfoStep>) => {
    onChange({ ...data, steps: steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  };
  const deplacerEtape = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (index < 0 || index >= steps.length || j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[index], next[j]] = [next[j], next[index]];
    onChange({ ...data, steps: next });
  };
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-2" aria-label="Étapes du récit">
        {steps.map((step, i) => (
          <EtapeBloc
            key={i}
            index={i}
            step={step}
            premiere={i === 0}
            derniere={i === steps.length - 1}
            onPatch={(patch) => patchEtape(i, patch)}
            onDeplacer={(dir) => deplacerEtape(i, dir)}
            onSupprimer={() => onChange({ ...data, steps: steps.filter((_, j) => j !== i) })}
            onPickFile={pick}
          />
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => onChange({ ...data, steps: [...steps, { text: "" }] })}
          title="Ajouter une étape au récit"
        >
          + Étape {steps.length + 1}
        </button>
      </div>
    </fieldset>
  );
}

function EtapeBloc({
  index,
  step,
  premiere,
  derniere,
  onPatch,
  onDeplacer,
  onSupprimer,
  onPickFile,
}: {
  index: number;
  step: InfoStep;
  premiere: boolean;
  derniere: boolean;
  onPatch: (patch: Partial<InfoStep>) => void;
  onDeplacer: (dir: -1 | 1) => void;
  onSupprimer: () => void;
  onPickFile: (file: File) => Promise<string>;
}) {
  const [ouvert, basculer] = useAccordeon(`info-etape-${index}`, premiere);
  const valide = etapeValide(step);
  const resume = step.text?.trim() ? (step.text.trim().length > 28 ? `${step.text.trim().slice(0, 28)}…` : step.text.trim()) : null;
  return (
    <Accordeon
      id={`info-etape-${index}`}
      titre={`Étape ${index + 1}`}
      badge={
        <>
          <span className="puce" title={resume ?? "Sans texte"}>
            {resume ?? ([step.image && "image", step.video && "vidéo", step.audio && "audio"].filter(Boolean).join(" + ") || "vide")}
          </span>
          {!valide ? (
            <span className="puce puce-erreur" role="alert">
              Étape vide
            </span>
          ) : null}
        </>
      }
      ouvert={ouvert}
      onToggle={basculer}
    >
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Texte
          <textarea
            className="champ"
            rows={3}
            value={step.text ?? ""}
            placeholder="Londres, 1891. L'enquête commence…"
            aria-label={`Texte de l'étape ${index + 1}`}
            onChange={(e) => onPatch({ text: e.target.value })}
          />
        </label>
        <ImagePicker
          label={`Image de l'étape ${index + 1}`}
          value={step.image ?? ""}
          onPickFile={onPickFile}
          onChange={(image) => onPatch({ image: image || undefined })}
        />
        <MediaPicker
          kind="video"
          label={`Vidéo de l'étape ${index + 1}`}
          value={step.video ?? ""}
          onPickFile={onPickFile}
          onChange={(video) => onPatch({ video: video || undefined })}
        />
        <MediaPicker
          kind="audio"
          label={`Audio de l'étape ${index + 1}`}
          value={step.audio ?? ""}
          onPickFile={onPickFile}
          onChange={(audio) => onPatch({ audio: audio || undefined })}
        />
        {!valide ? (
          <p className="text-[11px] text-fail" role="alert">
            Étape vide : renseigne au moins un texte, une image, une vidéo ou un audio (sinon la validation la refusera).
          </p>
        ) : null}
        <div className="flex gap-1">
          <button type="button" className="btn min-h-8 px-2 text-[8px]" disabled={premiere} onClick={() => onDeplacer(-1)} title="Monter l'étape" aria-label={`Monter l'étape ${index + 1}`}>
            ↑
          </button>
          <button type="button" className="btn min-h-8 px-2 text-[8px]" disabled={derniere} onClick={() => onDeplacer(1)} title="Descendre l'étape" aria-label={`Descendre l'étape ${index + 1}`}>
            ↓
          </button>
          <button type="button" className="btn min-h-8 px-2 text-[8px]" onClick={onSupprimer} title={`Supprimer l'étape ${index + 1}`} aria-label={`Supprimer l'étape ${index + 1}`}>
            Supprimer
          </button>
        </div>
      </div>
    </Accordeon>
  );
}

// Rendu joueur : swipe horizontal ET bouton « Suivant » (meme avancer),
// medias lus a la demande (controls natifs, preload none, jamais
// d'autoplay), derniere etape validee -> onComplete.
export function InfoPlayerRenderer({ data, onComplete }: ModulePlayerRendererProps) {
  const steps = infoSteps(data);
  const [index, setIndex] = useState(0);
  const [termine, setTermine] = useState(false);
  const fini = useRef(false);
  const toucher = useRef<{ x: number } | null>(null);
  if (steps.length === 0) return <p className="text-sm">Récit non configuré.</p>;
  const at = Math.min(index, steps.length - 1);
  const step = steps[at];
  const dernier = at >= steps.length - 1;

  const avancer = () => {
    if (termine) return;
    if (!dernier) {
      setIndex(at + 1);
      return;
    }
    if (!fini.current) {
      fini.current = true;
      setTermine(true);
      onComplete?.(steps.length);
    }
  };
  const reculer = () => {
    if (termine || at <= 0) return;
    setIndex(at - 1);
  };

  return (
    <div
      className="flex flex-col gap-3"
      onTouchStart={(e) => {
        toucher.current = { x: e.touches[0]?.clientX ?? 0 };
      }}
      onTouchEnd={(e) => {
        const depart = toucher.current;
        toucher.current = null;
        if (!depart) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - depart.x;
        if (dx <= -40) avancer();
        else if (dx >= 40) reculer();
      }}
    >
      <p className="text-xs text-fog" aria-live="polite">
        Étape {at + 1}/{steps.length}
      </p>
      {step.text ? <p className="text-sm text-snow">{step.text}</p> : null}
      {step.image ? <img src={step.image} alt="" className="block w-full rounded border border-line object-contain" /> : null}
      {step.video ? (
        <video src={step.video} controls preload="none" playsInline className="block w-full rounded border border-line" aria-label="Vidéo du récit" />
      ) : null}
      {step.audio ? (
        <audio src={step.audio} controls preload="none" className="block w-full" aria-label="Audio du récit" />
      ) : null}
      <div className="flex gap-2">
        {at > 0 ? (
          <button type="button" className="btn" disabled={termine} onClick={reculer} aria-label="Étape précédente">
            ← Précédent
          </button>
        ) : null}
        <button type="button" className="btn btn-primaire" disabled={termine} onClick={avancer}>
          {dernier ? "Terminer" : "Suivant →"}
        </button>
      </div>
      {termine ? (
        <p className="text-xs font-semibold text-pass" role="status">
          Récit terminé !
        </p>
      ) : null}
    </div>
  );
}

export const infoScreenPlugin: ModuleScreenPlugin = {
  type: "INFO",
  label: "Récit multimédia",
  icon: "etape",
  zoneNeeds: { content: true, header: false, footer: false },
  defaultScreen: {
    layout: "basic-story",
    background: { type: "color", value: "#1a1a2e" },
    zones: {
      header: {
        layout: "stack",
        widgets: [{ type: "text", text: "Titre de l'étape", style: "heading", align: "center" }],
      },
      content: { layout: "stack", widgets: [{ type: "module" }] },
      footer: {
        layout: "stack",
        widgets: [{ type: "button", label: "Suivant", action: "navigate", variant: "primary" }],
      },
    },
  },
  editorPreview: InfoEditorPreview,
  propertiesPanel: InfoPropertiesPanel,
  playerRenderer: InfoPlayerRenderer,
  customizableStyles: { backgroundColor: true, textColor: true, fontSize: true },
};
