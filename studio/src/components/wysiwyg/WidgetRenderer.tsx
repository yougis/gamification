// Rend un widget selon son discriminant `type`. Selection au clic (remonte
// l'index du widget dans sa zone). Deux interactions d'edition (change
// studio-screen-editor, design D2) :
// - widgets texte : clic ouvre l'edition en place (`contentEditable`
//   plaintext-only, commit blur/Entree via `onCommitText`, Echap annule,
//   sanitisation texte brut a la persistance) ;
// - drag-and-drop HTML5 : `draggable` sur le conteneur, `dataTransfer` porte
//   `{zone, index}` ; depot sur un widget = insertion avant lui, depot sur le
//   fond de zone = ajout en fin. Repli clavier : boutons haut/bas du panneau.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Widget, ZoneId } from "../../game/types";
import { TextWidgetRenderer } from "./widgets/TextWidgetRenderer";
import { ImageWidgetRenderer } from "./widgets/ImageWidgetRenderer";
import { ButtonWidgetRenderer } from "./widgets/ButtonWidgetRenderer";
import { ProgressBarWidgetRenderer } from "./widgets/ProgressBarWidgetRenderer";
import { ModuleWidgetRenderer } from "./widgets/ModuleWidgetRenderer";
import { SpacerWidgetRenderer } from "./widgets/SpacerWidgetRenderer";

export const DRAG_MIME = "application/x-geoplay-widget";

export interface WidgetDragSource {
  zone: ZoneId;
  index: number;
}

export function lireDragSource(e: React.DragEvent): WidgetDragSource | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<WidgetDragSource>;
    if (typeof p.zone !== "string" || typeof p.index !== "number") return null;
    return { zone: p.zone as ZoneId, index: p.index };
  } catch {
    return null;
  }
}

export function WidgetRenderer({
  widget,
  index,
  zoneId,
  moduleType,
  moduleData,
  selected,
  deplacable = false,
  onSelect,
  onCommitText,
  onDropBefore,
  renderModule,
}: {
  widget: Widget;
  index: number;
  zoneId?: ZoneId;
  moduleType?: string;
  moduleData?: Record<string, unknown>;
  selected?: boolean;
  // Drag-and-drop : true pour les widgets texte (change studio-screen-editor).
  deplacable?: boolean;
  onSelect?: (index: number) => void;
  // Edition en place : (zone, index, texte) — appele seulement si modifie.
  onCommitText?: (zoneId: ZoneId, index: number, text: string) => void;
  // Depot sur ce widget : insertion avant lui (zone, index cibles resolus ici).
  onDropBefore?: (fromZone: ZoneId, fromIndex: number, toZone: ZoneId, toIndex: number) => void;
  // Slot module remplaçable (change studio-player-preview) : si fourni et que
  // le widget est de type "module", rendu à la place de ModuleWidgetRenderer
  // (ex. renderer joueur en mode terminal). Absent = aperçu éditeur.
  renderModule?: (widget: Widget) => ReactNode;
}) {
  const [edition, setEdition] = useState(false);
  const [survol, setSurvol] = useState(false);
  const estTexte = widget.type === "text";
  // Ferme l'editeur quand la selection quitte le widget.
  useEffect(() => {
    if (!selected) setEdition(false);
  }, [selected ]);
  // Ferme l'editeur si le widget change sous les pieds (ex. template).
  const texteCourant = estTexte ? (widget as { text?: string }).text : undefined;
  useEffect(() => {
    setEdition(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texteCourant]);

  const ouvrirEdition = () => {
    // Un clic sur un texte l'ouvre en edition (la selection suit aussi) ;
    // la navigation clavier (Entree) selectionne sans editer.
    if (estTexte && onCommitText && zoneId) setEdition(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Widget ${widget.type}`}
      title={deplacable ? "Glisser pour déplacer" : undefined}
      draggable={deplacable}
      onDragStart={(e) => {
        if (!deplacable || !zoneId) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ zone: zoneId, index }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!onDropBefore) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        if (!onDropBefore || !zoneId) return;
        e.preventDefault();
        e.stopPropagation();
        setSurvol(false);
        const src = lireDragSource(e);
        if (!src) return;
        // Meme zone : l'index cible est exprime post-retrait (le widget source
        // est retire d'abord) ; depot sur soi-meme = sans effet.
        let cible = index;
        if (src.zone === zoneId) {
          if (src.index === index) return;
          if (src.index < index) cible = index - 1;
          if (cible === src.index) return;
        }
        onDropBefore(src.zone, src.index, zoneId, cible);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(index);
        ouvrirEdition();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSelect?.(index);
        }
      }}
      className={`min-w-0 max-w-full rounded ${selected ? "outline-2 outline-neon outline" : ""} ${survol ? "outline-2 outline-dashed outline-neon" : ""} ${deplacable ? "cursor-grab" : ""}`}
    >
      {widget.type === "text" ? (
        <TextWidgetRenderer
          widget={widget}
          editing={edition && selected}
          onCommit={(text) => {
            setEdition(false);
            if (zoneId && text !== widget.text) onCommitText?.(zoneId, index, text);
          }}
          onCancel={() => setEdition(false)}
        />
      ) : null}
      {widget.type === "image" ? <ImageWidgetRenderer widget={widget} /> : null}
      {widget.type === "button" ? <ButtonWidgetRenderer widget={widget} /> : null}
      {widget.type === "progress" ? <ProgressBarWidgetRenderer widget={widget} /> : null}
      {widget.type === "module" ? (renderModule ? renderModule(widget) : <ModuleWidgetRenderer widget={widget} moduleType={moduleType} moduleData={moduleData} />) : null}
      {widget.type === "spacer" ? <SpacerWidgetRenderer widget={widget} /> : null}
    </div>
  );
}
