// Mini-aperçu statique de l'écran global Accueil (change
// studio-home-apercu-simu) : carte d'identité du tableau à t=0 (temps
// 00:00, états initiaux, rebours à plein délai, proposition calée sur le
// premier éligible à t=0). Lecture seule : aucun callback n'écrit ni au
// JSON ni à la simu (l'ouverture éventuelle passe par `onOuvrir`, qui ne
// fait que sélectionner un nœud existant).
import { useMemo } from "react";
import { Icon } from "./icons";
import { evaluate } from "../game/evaluate";
import { calculerApercu, mmss } from "../game/apercu-accueil";
import type { Game } from "../game/types";

export { calculerApercu, mmss };
export type { LigneApercu } from "../game/apercu-accueil";

export function AccueilApercu({ game, onOuvrir }: { game: Game; onOuvrir?: (id: string) => void }) {
  const ap = useMemo(() => {
    const sim = { present: new Set<string>(), dwellOk: new Set<string>(), throughOk: new Set<string>(), nowMs: 0, completedAt: new Map<string, number>(), accuracyM: 5 };
    const ev = evaluate(game, sim as never, {}, new Map(), new Map(), new Set());
    return calculerApercu(game, 0, new Set(), ev.unlocked, ev.unlocked[0] ?? null, null);
  }, [game]);
  return (
    <div aria-label="Aperçu de l'écran d'accueil">
      <p className="font-mono text-[9px] text-snow">⏱ 00:00 — aperçu (t=0, pas l'essai en cours)</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {ap.lignes.map((l) => (
          <li key={l.id} className="font-mono text-[8px] text-fog">
            • {l.id} — {l.etat}{l.reboursMs != null ? ` — dans ${mmss(l.reboursMs)}` : ""}
          </li>
        ))}
      </ul>
      {ap.tete && onOuvrir ? (
        <button className="btn btn-compact min-h-8 px-2 text-[8px] mt-1" onClick={() => onOuvrir(ap.tete!)} title={`Ouvrir ${ap.tete}`}>
          <Icon name="accueil" size={14} /> Ouvrir : {ap.tete}
        </button>
      ) : null}
    </div>
  );
}
