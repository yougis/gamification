// Apercu d'un widget texte dans le canvas WYSIWYG + edition en place
// (change studio-screen-editor, design D2) : `editing` rend le paragraphe
// `contentEditable` (plaintext-only), commit sur blur/Entree, Echap annule.
// Sanitisation : le commit lit `innerText` (texte brut, colle riche neutralise).
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { TextWidget } from "../../../game/types";

const STYLE_CLASSE: Record<NonNullable<TextWidget["style"]>, string> = {
  heading: "text-lg font-bold",
  subtitle: "text-sm font-semibold",
  body: "text-sm",
  caption: "text-xs text-fog",
};

const ALIGN_CLASSE: Record<NonNullable<TextWidget["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function TextWidgetRenderer({
  widget,
  editing,
  onCommit,
  onCancel,
}: {
  widget: TextWidget;
  editing?: boolean;
  onCommit?: (text: string) => void;
  onCancel?: () => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  // Niveau widget (`styles`) surcharge les champs plats historiques.
  const styles = widget.styles ?? {};
  const align = styles.align ?? widget.align ?? "left";
  const style: CSSProperties = {};
  if (styles.fontFamily) style.fontFamily = styles.fontFamily;
  const taille = styles.fontSize ?? widget.fontSize;
  if (taille) style.fontSize = taille;
  if (styles.fontWeight) style.fontWeight = styles.fontWeight;
  const couleur = styles.color ?? widget.color;
  if (couleur) style.color = couleur;
  // Focus a l'ouverture pour taper immediatement ; le curseur en fin de texte.
  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  if (!editing) {
    return (
      <p className={`${STYLE_CLASSE[widget.style ?? "body"]} ${ALIGN_CLASSE[align]}`} style={style}>
        {widget.text}
      </p>
    );
  }

  const commit = () => {
    const brut = ref.current?.innerText ?? widget.text;
    // Normalise les fins de ligne (innerText ajoute un \n final sous Chrome).
    onCommit?.(brut.replace(/\n+$/, ""));
  };
  const touches = (e: KeyboardEvent<HTMLParagraphElement>) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };
  return (
    <p
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label="Éditer le texte"
      aria-multiline="true"
      className={`${STYLE_CLASSE[widget.style ?? "body"]} ${ALIGN_CLASSE[align]} min-w-4 cursor-text rounded bg-canvas/60 px-1 outline-1 outline-dashed outline-neon`}
      style={style}
      onBlur={commit}
      onKeyDown={touches}
      onClick={(e) => e.stopPropagation()}
    >
      {widget.text}
    </p>
  );
}
