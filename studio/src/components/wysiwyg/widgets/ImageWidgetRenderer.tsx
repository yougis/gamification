// Apercu statique d'un widget image dans le canvas WYSIWYG (non interactif).
import type { CSSProperties } from "react";
import type { ImageWidget } from "../../../game/types";

const FIT_CLASSE: Record<NonNullable<ImageWidget["fit"]>, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
};

const dim = (v: number | string | undefined): string | number | undefined =>
  typeof v === "number" ? `${v}px` : v;

export function ImageWidgetRenderer({ widget, hauteurMax }: { widget: ImageWidget; hauteurMax?: number }) {
  const style: CSSProperties = {};
  const w = dim(widget.width);
  const h = dim(widget.height);
  if (w !== undefined) style.width = w;
  if (h !== undefined) style.height = h;
  // Fit par défaut (change screen-subpages) : `contain` + borne viewport
  // (ratio conservé, jamais rogné) sauf dimensions auteur explicites.
  const fit = widget.fit ?? "contain";
  if (h === undefined && hauteurMax !== undefined) style.maxHeight = hauteurMax;
  return (
    <img
      src={widget.src}
      alt={widget.alt ?? ""}
      className={`w-full rounded ${FIT_CLASSE[fit]}`}
      style={style}
      draggable={false}
    />
  );
}
