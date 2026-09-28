// Aperçu visuel du tableau de bord branché sur l'essai (changes
// studio-home-apercu-simu, home-phonecanvas-unique) : le PhoneCanvas de
// l'écran composé, en lecture seule, alimenté par l'état simu courant
// (temps simulé, états relus, proposition = tête de file réelle).
// Lecture seule : aucun callback n'écrit au JSON ; `onOuvrir` rejoue le
// contrôle d'essai existant (ouvrir), comme « Avancer d'un pas ».
import { Icon } from "./icons";
import { calculerApercu } from "../game/apercu-accueil";
import { PhoneCanvas } from "./wysiwyg/PhoneCanvas";
import type { Game } from "../game/types";

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
  return (
    <div className="carte p-3" aria-label="Aperçu du tableau de bord — essai en cours">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="accueil" size={15} /> Tableau de bord — essai en cours
      </h3>
      <div className="mt-1">
        <PhoneCanvas
          screen={game.global?.screen ?? {}}
          game={game}
          lignesApercu={ap.lignes}
          viewport="phone-portrait"
          showGhosts={false}
        />
      </div>
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
