// Menu d'ajout de widget dans une zone : bouton + liste deroulante des types
// disponibles (text, image, button, progress, spacer). Le widget module est
// gere par le noeud lui-meme (auto-ajout), jamais depuis ce menu.
import { useState } from "react";
import { Icon } from "../icons";
import type { Widget } from "../../game/types";

export type AddableWidgetType = "text" | "image" | "button" | "progress" | "spacer";

const ENTREES: { type: AddableWidgetType; libelle: string }[] = [
  { type: "text", libelle: "Texte" },
  { type: "image", libelle: "Image" },
  { type: "button", libelle: "Bouton" },
  { type: "progress", libelle: "Progression" },
  { type: "spacer", libelle: "Espaceur" },
];

export function defaultWidget(type: AddableWidgetType): Widget {
  switch (type) {
    case "text":
      return { type: "text", text: "Nouveau texte", style: "body" };
    case "image":
      return { type: "image", src: "image.png", fit: "cover", alt: "" };
    case "button":
      return { type: "button", label: "Continuer", variant: "primary" };
    case "progress":
      return { type: "progress", progressType: "steps", showLabel: true };
    case "spacer":
      return { type: "spacer", height: 16 };
  }
}

export function AddWidgetMenu({ onAddWidget }: { onAddWidget: (type: AddableWidgetType) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded border border-line px-3 py-1.5 text-sm text-snow hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
      >
        <Icon name="ajouter" size={14} />
        Ajouter un widget
      </button>
      {ouvert ? (
        <div role="menu" className="absolute z-10 mt-1 w-44 rounded border border-line bg-surface py-1 shadow-lg">
          {ENTREES.map((e) => (
            <button
              key={e.type}
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-sm text-snow hover:bg-surface-2"
              onClick={() => {
                onAddWidget(e.type);
                setOuvert(false);
              }}
            >
              {e.libelle}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
