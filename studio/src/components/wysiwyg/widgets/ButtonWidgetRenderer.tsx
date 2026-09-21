// Apercu statique d'un widget bouton dans le canvas WYSIWYG (non interactif).
// Rendu en <span> : pas d'action, pas de soumission de formulaire.
import { Icon } from "../../icons";
import type { ButtonWidget } from "../../../game/types";

const VARIANT_CLASSE: Record<NonNullable<ButtonWidget["variant"]>, string> = {
  primary: "bg-neon text-ink font-semibold",
  secondary: "border border-line text-snow",
  ghost: "text-snow",
};

export function ButtonWidgetRenderer({ widget }: { widget: ButtonWidget }) {
  return (
    <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded ${VARIANT_CLASSE[widget.variant ?? "primary"]}`}>
      {widget.icon ? <Icon name="etape" size={14} /> : null}
      {widget.label}
    </span>
  );
}
