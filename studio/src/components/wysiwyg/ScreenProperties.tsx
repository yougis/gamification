// Proprietes de l'ecran : fond (type, valeur, voile). La selection de l'ecran
// se fait en cliquant une zone vide du canvas (PhoneCanvas remonte null).
import type { ScreenBackground } from "../../game/types";

const DEFAUT_FOND: ScreenBackground = { type: "color", value: "#1a1a2e" };

export function ScreenProperties({
  background,
  onChange,
}: {
  background?: ScreenBackground;
  onChange: (bg: ScreenBackground) => void;
}) {
  const bg = background ?? DEFAUT_FOND;
  const set = (patch: Partial<ScreenBackground>) => onChange({ ...bg, ...patch });
  return (
    <div className="flex flex-col gap-2 p-2" aria-label="Propriétés de l'écran">
      <h4 className="font-bold text-sm">Écran — fond</h4>
      <label className="flex flex-col gap-1 text-xs">
        Type de fond
        <select
          className="champ"
          value={bg.type}
          onChange={(e) => set({ type: e.target.value as ScreenBackground["type"] })}
        >
          <option value="color">Couleur unie</option>
          <option value="image">Image</option>
          <option value="gradient">Dégradé (CSS)</option>
        </select>
      </label>
      {bg.type === "color" ? (
        <label className="flex items-center gap-2 text-xs">
          Couleur
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(bg.value) ? bg.value : "#1a1a2e"} onChange={(e) => set({ value: e.target.value })} />
          <input
            type="text"
            className="champ flex-1"
            value={bg.value}
            onChange={(e) => set({ value: e.target.value })}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-xs">
          {bg.type === "image" ? "Source (asset ou URL)" : "Valeur CSS (linear-gradient…)"}
          <input
            type="text"
            className="champ"
            value={bg.value}
            onChange={(e) => set({ value: e.target.value })}
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs">
        Voile ({Math.round((bg.overlay ?? 0) * 100)} %)
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={bg.overlay ?? 0}
          onChange={(e) => set({ overlay: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
