// Apercu d'un espaceur dans le canvas WYSIWYG : bloc vide a hauteur donnee.
import type { SpacerWidget } from "../../../game/types";

export function SpacerWidgetRenderer({ widget }: { widget: SpacerWidget }) {
  const height = typeof widget.height === "number" ? `${widget.height}px` : (widget.height ?? "16px");
  return <div style={{ height }} aria-hidden="true" />;
}
