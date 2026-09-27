// Aperçu visuel du tableau de bord branché sur l'essai (change
// studio-home-apercu-simu) : temps simulé, rebours recalculés au tick,
// états relus aux complétions, proposition = tête de file réelle.
// Lecture seule : aucun callback n'écrit au JSON ; `onOuvrir` rejoue le
// contrôle d'essai existant (ouvrir), comme « Avancer d'un pas ».
import { toolboxIconVisible } from "../game/inventory";
import type { Game } from "../game/types";
import { Icon } from "./icons";
import { calculerApercu, mmss } from "../game/apercu-accueil";

export function ApercuAccueil({
  game,
  nowMs,
  terminees,
  elus,
  teteFile,
  actif,
  onOuvrir,
}: {
  game: Game;
  nowMs: number;
  terminees: Set<string>;
  elus: string[];
  teteFile: string | null;
  actif: string | null;
  onOuvrir: (id: string) => void;
}) {
  const ap = calculerApercu(game, nowMs, terminees, elus, teteFile, actif);
  const inventaire = toolboxIconVisible(game, actif);
  return (
    <div className="carte p-3" aria-label="Aperçu du tableau de bord — essai en cours">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="accueil" size={15} /> Tableau de bord — essai en cours
      </h3>
      <p className="font-mono text-[11px] text-snow mt-1">⏱ {mmss(nowMs)} (temps simulé)</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {ap.lignes.map((l) => (
          <li key={l.id} className="font-mono text-[9px] text-fog">
            • {l.id} — {l.etat}{l.reboursMs != null ? ` — dans ${mmss(l.reboursMs)}` : ""}
          </li>
        ))}
      </ul>
      <p className="font-mono text-[9px] text-fog mt-1">
        {inventaire ? "🎒 Boîte à outils proposée." : "Pas d'entrée inventaire (objets ou TOOLBOX manquants)."}
      </p>
      {ap.tete ? (
        <button className="btn btn-compact min-h-8 px-2 text-[8px] mt-1" onClick={() => onOuvrir(ap.tete!)} title={`Ouvrir ${ap.tete} (tête de file de l'essai)`}>
          <Icon name="accueil" size={14} /> Ouvrir : {ap.tete}
        </button>
      ) : (
        <p className="font-mono text-[9px] text-fog mt-1">File vide — aucune étape à ouvrir.</p>
      )}
    </div>
  );
}
