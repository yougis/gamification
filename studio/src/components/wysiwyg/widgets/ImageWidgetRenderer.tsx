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

export function ImageWidgetRenderer({ widget }: { widget: ImageWidget }) {
  const style: CSSProperties = {};
  const w = dim(widget.width);
  const h = dim(widget.height);
  if (w !== undefined) style.width = w;
  if (h !== undefined) style.height = h;
  return (
    <img
      src={widget.src}
      alt={widget.alt ?? ""}
      className={`w-full rounded ${FIT_CLASSE[widget.fit ?? "cover"]}`}
      style={style}
      draggable={false}
    />
  );
}
