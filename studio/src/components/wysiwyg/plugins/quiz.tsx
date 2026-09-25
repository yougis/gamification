// ScreenPlugin du module QUIZ : reference pour les futurs modules (change studio-screen-wysiwyg).
// Bloc QCM (change studio-screen-editor) : 2-6 reponses texte et/ou image,
// bonne reponse, explication ; refus de formulaire (reponse vide, bonne
// reponse absente). Imports type-only vers module-screen-plugin : pas de cycle.
import { useState } from "react";
import { Icon } from "../../icons";
import type {
  ModuleEditorPreviewProps,
  ModulePropertiesPanelProps,
  ModulePlayerRendererProps,
  ModuleScreenPlugin,
} from "../../../game/module-screen-plugin";
import { Accordeon, useAccordeon } from "../../Accordeon";
import { MinigameParamsAccordeon } from "./minigame-params";
import { ImagePicker } from "../ImagePicker";

export interface QuizOptionObject {
  text?: string;
  image?: string;
}

export type QuizOption = string | QuizOptionObject;

export interface QuizQuestion {
  q?: string;
  options?: QuizOption[];
  correctIndex?: number;
  explanation?: string;
  points?: number;
}

function quizQuestions(data: Record<string, unknown>): QuizQuestion[] {
  const q = (data as { questions?: unknown }).questions;
  return Array.isArray(q) ? (q as QuizQuestion[]) : [];
}

export function quizOptionText(opt: QuizOption | undefined): string {
  if (typeof opt === "string") return opt;
  return opt?.text ?? "";
}

export function quizOptionImage(opt: QuizOption | undefined): string {
  if (typeof opt === "string") return "";
  return opt?.image ?? "";
}

function optionVide(opt: QuizOption | undefined): boolean {
  return quizOptionText(opt).trim() === "" && quizOptionImage(opt).trim() === "";
}

// Apercu statique : premiere question + options (texte et vignettes), bonne reponse marquee.
export function QuizEditorPreview({ data }: ModuleEditorPreviewProps) {
  const questions = quizQuestions(data);
  if (questions.length === 0) {
    return (
      <div className="rounded border border-dashed border-line px-3 py-4 text-center">
        <p className="text-xs font-semibold text-snow">Quiz — aucune question</p>
        <p className="text-[10px] text-fog">Cliquez pour ajouter des questions</p>
      </div>
    );
  }
  const first = questions[0];
  const options = Array.isArray(first.options) ? first.options : [];
  return (
    <div className="flex flex-col gap-2 rounded bg-surface-2/50 px-3 py-3">
      <p className="text-[10px] text-fog">Question 1/{questions.length}</p>
      <p className="text-sm font-semibold text-snow">{first.q || "Question sans titre"}</p>
      <div className="flex flex-col gap-1">
        {(options.length > 0 ? options : ["Option A", "Option B"]).map((opt, i) => (
          <span
            key={i}
            className={`flex items-center gap-2 rounded border px-2 py-1 text-xs text-snow ${i === first.correctIndex ? "border-neon" : "border-line"}`}
          >
            {quizOptionImage(opt) ? (
              <img src={quizOptionImage(opt)} alt="" className="h-8 w-8 rounded object-cover" />
            ) : null}
            <span className="flex-1">{quizOptionText(opt) || <em className="text-fog">Image seule</em>}</span>
            {i === first.correctIndex ? <span className="puce puce-ok">Bonne réponse</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

// Une question = un accordéon (change studio-composer-ux) : badge = énoncé
// tronqué + alerte si aucune bonne réponse désignée. Composant enfant dédié
// car les hooks ne peuvent pas vivre dans une boucle .map.
function QuestionBloc({
  qi,
  question,
  premiere,
  patch,
  supprimer,
  onPickFile,
}: {
  qi: number;
  question: QuizQuestion;
  premiere: boolean;
  patch: (patch: Partial<QuizQuestion>) => void;
  supprimer: () => void;
  onPickFile?: (file: File) => Promise<string>;
}) {
  const [ouvert, basculer] = useAccordeon(`quiz-q-${qi}`, premiere);
  const q = question;
  const options = Array.isArray(q.options) ? q.options : [];
  const sansBonne = q.correctIndex == null && options.length > 0;
  const enonce = (q.q ?? "").trim();
  return (
    <Accordeon
      id={`quiz-q-${qi}`}
      titre={`Question ${qi + 1}`}
      badge={
        <>
          <span className="puce" title={enonce || "Sans énoncé"}>
            {enonce ? (enonce.length > 28 ? `${enonce.slice(0, 28)}…` : enonce) : "Sans énoncé"}
          </span>
          {sansBonne ? (
            <span className="puce puce-erreur" role="alert">
              Sans bonne réponse
            </span>
          ) : null}
        </>
      }
      ouvert={ouvert}
      onToggle={basculer}
    >
      <div className="flex flex-col gap-2 rounded border border-line p-2">
        <div className="flex gap-1">
          <input
            className="champ flex-1"
            value={q.q ?? ""}
            placeholder={`Question ${qi + 1}`}
            aria-label={`Question ${qi + 1}`}
            onChange={(e) => patch({ q: e.target.value })}
          />
          <button
            type="button"
            className="btn px-2.5"
            aria-label={`Supprimer la question ${qi + 1}`}
            title="Supprimer"
            onClick={supprimer}
          >
            <Icon name="fermer" size={15} />
          </button>
        </div>
        <span className="text-xs text-fog">Réponses ({options.length}/6) — cochez la bonne</span>
        {options.map((opt, oi) => {
          const vide = optionVide(opt);
          return (
            <div key={oi} className={`flex flex-col gap-1 rounded border p-1.5 ${vide ? "border-fail/60" : "border-line/60"}`}>
              <div className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`quiz-${qi}-correct`}
                  checked={q.correctIndex === oi}
                  aria-label={`Bonne réponse : option ${oi + 1}`}
                  title="Bonne réponse"
                  onChange={() => patch({ correctIndex: oi })}
                />
                <input
                  className="champ min-w-0 flex-1"
                  value={quizOptionText(opt)}
                  placeholder={`Réponse ${oi + 1} (texte)`}
                  aria-label={`Réponse ${oi + 1} texte`}
                  onChange={(e) => {
                    const next = [...options];
                    const img = quizOptionImage(opt);
                    next[oi] = img ? { text: e.target.value, image: img } : e.target.value;
                    patch({ options: next });
                  }}
                />
                <button
                  type="button"
                  className="btn px-2 disabled:opacity-30"
                  disabled={options.length <= 2}
                  title={options.length <= 2 ? "Minimum 2 réponses" : "Supprimer cette réponse"}
                  aria-label={`Supprimer la réponse ${oi + 1}`}
                  onClick={() => patch({ options: options.filter((_, j) => j !== oi) })}
                >
                  <Icon name="fermer" size={13} />
                </button>
              </div>
              <ImagePicker
                label={`Réponse ${oi + 1} image (optionnel)`}
                value={quizOptionImage(opt)}
                onPickFile={onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); })}
                onChange={(img) => {
                  const next = [...options];
                  const txt = quizOptionText(opt);
                  next[oi] = !txt && !img ? "" : img && !txt ? { image: img } : { text: txt, ...(img ? { image: img } : {}) };
                  patch({ options: next });
                }}
              />
              {vide ? <p className="text-[11px] text-fail" role="alert">Réponse vide : texte ou image requis.</p> : null}
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn"
            disabled={options.length >= 6}
            title={options.length >= 6 ? "Maximum 6 réponses" : "Ajouter une réponse"}
            onClick={() => patch({ options: [...options, ""] })}
          >
            <Icon name="ajouter" size={13} /> Réponse
          </button>
          {sansBonne ? (
            <p className="text-[11px] text-caution" role="alert">Désignez la bonne réponse.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            Explication (optionnel)
            <input
              className="champ"
              value={q.explanation ?? ""}
              placeholder="Affichée après réponse"
              aria-label={`Explication question ${qi + 1}`}
              onChange={(e) => patch({ explanation: e.target.value || undefined })}
            />
          </label>
          <label className="flex w-20 flex-col gap-1 text-xs">
            Points
            <input
              type="number"
              min={0}
              className="champ"
              value={q.points ?? ""}
              placeholder="1"
              aria-label={`Points question ${qi + 1}`}
              onChange={(e) => patch({ points: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </label>
        </div>
      </div>
    </Accordeon>
  );
}

// Panneau de proprietes : questions + bloc QCM (reponses, bonne reponse,
// explication) + parametres essais/temps. Refus de formulaire : reponse sans
// texte ni image, question sans bonne reponse, bornes 2-6 reponses.
export function QuizPropertiesPanel({ data, onChange, readOnly, minigameDefaults, onPickFile }: ModulePropertiesPanelProps) {
  const questions = quizQuestions(data);
  const setQuestions = (next: QuizQuestion[]) => onChange({ ...data, questions: next });
  const patchQuestion = (qi: number, patch: Partial<QuizQuestion>) => {
    const next = [...questions];
    next[qi] = { ...next[qi], ...patch };
    // Bonne reponse hors bornes apres modification -> a re-designer.
    const n = next[qi].options?.length ?? 0;
    if (next[qi].correctIndex != null && next[qi].correctIndex >= n) {
      const { correctIndex: _retire, ...reste } = next[qi];
      void _retire;
      next[qi] = reste;
    }
    setQuestions(next);
  };
  return (
    <fieldset disabled={readOnly} className="contents">
      <div className="flex flex-col gap-3" aria-label="Questions du quiz">
        <span className="text-xs text-fog">Questions ({questions.length})</span>
        {questions.map((q, qi) => (
          <QuestionBloc
            key={qi}
            qi={qi}
            question={q}
            premiere={qi === 0}
            patch={(patch) => patchQuestion(qi, patch)}
            supprimer={() => setQuestions(questions.filter((_, j) => j !== qi))}
            onPickFile={onPickFile}
          />
        ))}
        <button type="button" className="btn" onClick={() => setQuestions([...questions, { q: "", options: ["", ""], points: 1 }])}>
          <Icon name="ajouter" size={15} /> Question
        </button>
        <MinigameParamsAccordeon data={data} defaults={minigameDefaults} onChange={onChange} readOnly={readOnly} />
      </div>
    </fieldset>
  );
}

// Rendu joueur interactif : selection, feedback, score, onComplete.
export function QuizPlayerRenderer({ data, onComplete, hint }: ModulePlayerRendererProps) {
  const questions = quizQuestions(data);
  const [index, setIndex] = useState(0);
  const [choix, setChoix] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  if (questions.length === 0) return <p className="text-sm">Quiz sans questions.</p>;
  const q = questions[index];
  const options = Array.isArray(q.options) ? q.options : [];
  const repondre = (i: number) => {
    if (choix != null) return;
    setChoix(i);
    const bon = i === (q.correctIndex ?? 0);
    const pts = bon ? (q.points ?? 1) : 0;
    const total = score + pts;
    setScore(total);
    if (index + 1 >= questions.length) onComplete?.(total);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fog">Question {index + 1}/{questions.length} — Score {score}</p>
      {hint ? <p className="rounded border border-line px-2 py-1 text-xs italic text-fog">💡 {hint}</p> : null}
      <p className="text-sm font-semibold">{q.q}</p>
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => repondre(i)}
          className={`flex items-center gap-2 rounded border px-2 py-1 text-left text-sm ${choix === i ? (i === (q.correctIndex ?? 0) ? "border-neon" : "border-red-500") : "border-line"}`}
        >
          {quizOptionImage(opt) ? <img src={quizOptionImage(opt)} alt="" className="h-8 w-8 rounded object-cover" /> : null}
          <span>{quizOptionText(opt) || "Image"}</span>
        </button>
      ))}
      {choix != null && q.explanation ? <p className="text-xs text-fog">{q.explanation}</p> : null}
      {choix != null && index + 1 < questions.length ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            setIndex(index + 1);
            setChoix(null);
          }}
        >
          Suivante
        </button>
      ) : null}
    </div>
  );
}

export const quizScreenPlugin: ModuleScreenPlugin = {
  type: "QUIZ",
  label: "Quiz / QCM",
  icon: "etape",
  zoneNeeds: { content: true, header: true, footer: true },
  defaultScreen: {
    layout: "quiz-focus",
    background: { type: "color", value: "#14141f" },
    zones: {
      header: {
        layout: "stack",
        widgets: [
          { type: "text", text: "Question", style: "heading", align: "center" },
          { type: "progress", progressType: "steps", showLabel: true },
        ],
      },
      content: { layout: "stack", widgets: [{ type: "module" }] },
      footer: {
        layout: "stack",
        widgets: [{ type: "button", label: "Valider", action: "navigate", variant: "primary" }],
      },
    },
  },
  editorPreview: QuizEditorPreview,
  propertiesPanel: QuizPropertiesPanel,
  playerRenderer: QuizPlayerRenderer,
  customizableStyles: { backgroundColor: true, textColor: true, fontSize: true, fontFamily: true, fontWeight: true },
};
