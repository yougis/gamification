// Rend une zone (header/content/footer/overlay) : ses widgets en pile, grille
// ou libre. Clic sur le fond -> selection de la zone ; clic sur un widget ->
// selection du widget. Etat vide : cadre pointille incitatif.
// Layout `free` : coordonnees relatives (flux + retour a la ligne) pour
// survivre aux 4 viewports sans debordement (change studio-screen-editor).
// Depot DnD sur le fond de zone = ajout en fin ; depot sur un widget =
// insertion avant lui (props traversees depuis PhoneCanvas).
import { useState } from "react";
import type { ReactNode } from "react";
import type { Game, Widget, ZoneContent, ZoneId } from "../../game/types";
import type { LigneApercu } from "../../game/apercu-accueil";
import type { CarteSimu } from "./widgets/CarteInteractiveSimu";
import { WidgetRenderer, lireDragSource } from "./WidgetRenderer";

const LAYOUT_CLASSE: Record<string, string> = {
  stack: "flex flex-col gap-2",
  grid: "grid grid-cols-2 gap-2",
  free: "flex flex-row flex-wrap gap-2",
};

export function ZoneRenderer({
  zone,
  zoneId,
  moduleType,
  moduleData,
  selected,
  selectedWidgetIndex,
  onSelectZone,
  onSelectWidget,
  onCommitText,
  onMoveWidgetAcross,
  renderModule,
  contextePage,
  hauteurMaxMedia,
  game,
  lignesApercu,
  carteSimu,
  masquerPleinEcran,
  flottant = false,
  // Traversant (change carte-fond-flottant) : édition ciblée fond — même
  // les widgets laissent passer les pointeurs vers la carte du fond.
  // Défaut false = comportement historique (widgets opaques en flottant).
  traversant = false,
}: {
  zone: ZoneContent;
  zoneId: ZoneId;
  moduleType?: string;
  moduleData?: Record<string, unknown>;
  selected?: boolean;
  selectedWidgetIndex?: number | null;
  onSelectZone?: (zoneId: ZoneId) => void;
  onSelectWidget?: (zoneId: ZoneId, index: number) => void;
  onCommitText?: (zoneId: ZoneId, index: number, text: string) => void;
  // Deplacement (intra ou inter-zones) en une seule operation MCP.
  onMoveWidgetAcross?: (fromZone: ZoneId, fromIndex: number, toZone: ZoneId, toIndex: number | "end") => void;
  // Slot module remplaçable (change studio-player-preview), transmis au
  // WidgetRenderer. Absent = aperçu éditeur.
  renderModule?: (widget: Widget) => ReactNode;
  // Contexte de sous-page (change screen-subpages), transmis aux widgets.
  contextePage?: { index: number; total: number };
  // Borne viewport pour le fit (change screen-subpages).
  hauteurMaxMedia?: number;
  // Jeu courant (change widget-cartographie) : contexte de lecture pour les
  // widgets lies (carte). Absent = apercu sans donnees.
  game?: Game;
  // Snapshot d'essai (change home-phonecanvas-unique) : transmis à la carte.
  lignesApercu?: LigneApercu[];
  // Carte simu (change carte-joueur-navigable, phase 3) : carte interactive
  // dans le terminal simulé. Absent = aperçu auteur statique.
  carteSimu?: CarteSimu;
  // Plein écran (change studio-widgets-pleinecran) : quand vrai, les widgets
  // `pleinEcran` ne sont pas rendus dans le flux — PhoneCanvas les affiche
  // dans la couche breakout (cadre entier). Ici : fantôme de rappel en mode
  // auteur (sélection possible), rien en lecture seule (terminal).
  masquerPleinEcran?: boolean;
  // Flottant (change carte-fond-flottant) : hors édition avec un fond présent,
  // la zone laisse passer les pointeurs dans les creux (widgets opaques sauf
  // traversée explicite) vers la carte du fond. En édition ciblée fond,
  // `traversant` laisse tout passer pour atteindre la carte.
  flottant?: boolean;
  traversant?: boolean;
}) {
  const widgets = zone.widgets ?? [];
  const [survol, setSurvol] = useState(false);
  const dndActif = onMoveWidgetAcross != null;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Zone ${zoneId}`}
      onClick={(e) => {
        // Le clic ne doit pas bouillonner vers le fond du canvas (qui vide
        // la selection) : miroir du pattern de WidgetRenderer.
        e.stopPropagation();
        onSelectZone?.(zoneId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSelectZone?.(zoneId);
        }
      }}
      onDragOver={dndActif ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setSurvol(true); } : undefined}
      onDragLeave={dndActif ? () => setSurvol(false) : undefined}
      onDrop={
        dndActif
          ? (e) => {
              e.preventDefault();
              setSurvol(false);
              const src = lireDragSource(e);
              if (!src) return;
              // Depot en fin de zone ; sans effet si deja dernier de sa zone.
              if (src.zone === zoneId && src.index === widgets.length - 1) return;
              onMoveWidgetAcross?.(src.zone, src.index, zoneId, "end");
            }
          : undefined
      }
      className={`rounded p-2 ${flottant ? "pointer-events-none" : ""} ${selected ? "outline-2 outline-neon outline" : "outline-1 outline-dashed outline-transparent hover:outline-line"} ${survol ? "outline-2 outline-dashed outline-neon" : ""}`}
    >
      {widgets.length === 0 ? (
        <div className="rounded border border-dashed border-line px-3 py-4 text-center text-xs text-fog">
          Zone {zoneId} vide — ajoutez un widget
        </div>
      ) : (
        <div className={LAYOUT_CLASSE[zone.layout ?? "stack"]}>
          {widgets.map((w: Widget, i: number) => {
            const estPleinEcran = (w as { pleinEcran?: boolean }).pleinEcran === true;
            if (masquerPleinEcran && estPleinEcran) {
              // Fantôme auteur (sélectionne le widget pour le régler) ;
              // rien en lecture seule (le breakout de PhoneCanvas l'affiche).
              if (onSelectWidget == null) return null;
              return (
                <button
                  key={i}
                  type="button"
                  className={`rounded border border-dashed px-3 py-2 text-center text-xs ${selectedWidgetIndex === i ? "border-neon text-snow" : "border-line text-fog hover:border-neon hover:text-snow"}`}
                  onClick={(e) => { e.stopPropagation(); onSelectWidget?.(zoneId, i); }}
                  title="Widget plein écran — affiché sur tout le cadre (cliquer pour régler)"
                  aria-label={`Widget ${w.type} plein écran`}
                >
                  ⛶ {w.type} plein écran
                </button>
              );
            }
            return (
            <WidgetRenderer
              key={i}
              widget={w}
              index={i}
              zoneId={zoneId}
              moduleType={moduleType}
              moduleData={moduleData}
              selected={selectedWidgetIndex === i}
              deplacable={dndActif && w.type === "text"}
              onSelect={(index) => onSelectWidget?.(zoneId, index)}
              onCommitText={onCommitText}
              renderModule={renderModule}
              contextePage={contextePage}
              hauteurMaxMedia={hauteurMaxMedia}
              game={game}
              lignesApercu={lignesApercu}
              carteSimu={carteSimu}
              flottant={flottant}
              traversant={traversant}
              onDropBefore={
                dndActif
                  ? (fromZone, fromIndex, toZone, toIndex) => onMoveWidgetAcross?.(fromZone, fromIndex, toZone, toIndex)
                  : undefined
              }
            />
            );
          })}
        </div>
      )}
    </div>
  );
}
