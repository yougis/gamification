// Apercu statique d'une barre de progression dans le canvas WYSIWYG (non interactif).
// Remplissage a mi-parcours : simple echantillon visuel, jamais une vraie progression.
import type { ProgressBarWidget } from "../../../game/types";

export function ProgressBarWidgetRenderer({ widget, contextePage }: { widget: ProgressBarWidget; contextePage?: { index: number; total: number } }) {
  // Dans un contenu paginé (change screen-subpages), la barre reflète
  // l'avancement page i/N ; sinon échantillon statique inchangé.
  const fraction = contextePage && contextePage.total > 0 ? (contextePage.index + 1) / contextePage.total : 0.5;
  const libelle = widget.progressType === "score" ? "Score" : "Étape";
  const compteur = contextePage ? ` ${contextePage.index + 1}/${contextePage.total}` : " 1/5";
  return (
    <div className="flex flex-col gap-1">
      {widget.showLabel ? (
        <span className="text-xs text-fog">{libelle}{compteur}</span>
      ) : null}
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.round(fraction * 100)}%`, ...(widget.color ? { backgroundColor: widget.color } : {}) }} />
      </div>
    </div>
  );
}
