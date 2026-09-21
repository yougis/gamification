// Selecteur de template d'ecran : grille de cartes avec miniature live
// (PhoneCanvas reduit, non interactif) + nom. Si l'ecran courant est
// personnalise, confirmation avant remplacement (4.3).
import { PhoneCanvas } from "./PhoneCanvas";
import { SCREEN_TEMPLATES } from "../../game/screen-templates";

export function TemplatePicker({
  currentLayout,
  hasCustomizations,
  onSelectTemplate,
}: {
  currentLayout?: string;
  hasCustomizations?: boolean;
  onSelectTemplate: (layoutId: string) => void;
}) {
  const choisir = (layoutId: string) => {
    if (hasCustomizations && layoutId !== currentLayout) {
      if (!window.confirm("Les modifications actuelles seront perdues. Continuer ?")) return;
    }
    onSelectTemplate(layoutId);
  };
  return (
    <div className="flex flex-col gap-2" aria-label="Modèles d'écran">
      <span className="text-xs text-fog">Modèle de mise en page</span>
      <div className="grid grid-cols-2 gap-2">
        {SCREEN_TEMPLATES.map((t) => {
          const actif = t.id === currentLayout;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => choisir(t.id)}
              aria-pressed={actif}
              title={t.description}
              className={`flex flex-col items-center gap-1 rounded border p-1.5 ${actif ? "border-neon" : "border-line hover:border-snow"}`}
            >
              <span className="pointer-events-none overflow-hidden rounded" style={{ width: 90, height: 120 }}>
                <PhoneCanvas screen={t.screen} scale={0.24} showGhosts={false} />
              </span>
              <span className="text-[11px] font-semibold text-snow">{t.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
