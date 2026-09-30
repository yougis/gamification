// Aperçu visuel du tableau de bord branché sur l'essai (changes
// studio-home-apercu-simu, home-phonecanvas-unique) : le PhoneCanvas de
// l'écran composé, en lecture seule, alimenté par l'état simu courant
// (temps simulé, états relus, proposition = tête de file réelle).
// Lecture seule : aucun callback n'écrit au JSON ; `onOuvrir` rejoue le
// contrôle d'essai existant (ouvrir), comme « Avancer d'un pas ».
import { Icon } from "./icons";
import { calculerApercu } from "../game/apercu-accueil";
import { PhoneCanvas, VIEWPORTS, type ViewportId } from "./wysiwyg/PhoneCanvas";
import type { CarteSimu } from "./wysiwyg/widgets/CarteInteractiveSimu";
import { useEffect, useRef, useState } from "react";
import type { Game } from "../game/types";

export function ApercuAccueil({
  game,
  nowMs,
  terminees,
  elus,
  teteFile,
  actif,
  onOuvrir,
  viewport = "phone-portrait",
  onViewport,
  positionSimu,
}: {
  game: Game;
  nowMs: number;
  terminees: Set<string>;
  elus: string[];
  teteFile: string | null;
  actif: string | null;
  onOuvrir: (id: string) => void;
  // Viewport d'aperçu (change studio-modejeux-viewports) : état partagé depuis
  // App. Sans onViewport : suit la valeur sans sélecteur (comportement historique
  // portrait pour les appelants qui ne le branchent pas).
  viewport?: ViewportId;
  onViewport?: (v: ViewportId) => void;
  // Position simulée (change simu-carte-puzzle-viewports) : alimente la carte
  // interactive du tableau. Absente = position non renseignée (carte
  // interactive quand même, éligibilité lue de `elus`).
  positionSimu?: { lat: number; lng: number } | null;
}) {
  const ap = calculerApercu(game, nowMs, terminees, elus, teteFile, actif);
  // Carte interactive du tableau (change simu-carte-puzzle-viewports) :
  // mêmes éligibles que l'aperçu, ouverture via le contrôle d'essai existant.
  const carteSimu: CarteSimu = {
    position: positionSimu ?? null,
    eligible: (id: string) => elus.includes(id),
    onOuvrir,
  };
  // Mise à l'échelle plein-cadre (change simu-carte-puzzle-viewports) : même
  // calcul que Screen et terminal, pour une même taille par viewport partout.
  const cadreRef = useRef<HTMLDivElement | null>(null);
  const [tailleCadre, setTailleCadre] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = cadreRef.current;
    if (!el) return;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      setTailleCadre((p) => (Math.abs(p.w - r.width) < 1 && Math.abs(p.h - r.height) < 1 ? p : { w: r.width, h: r.height }));
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const format = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[0];
  const echelle =
    (viewport === "phone-landscape" || viewport === "tablet-landscape") &&
    tailleCadre.w > 0 &&
    tailleCadre.h > 0
      ? Math.min(tailleCadre.w / format.largeur, tailleCadre.h / format.hauteur, 1)
      : undefined;
  const scale = echelle != null && echelle < 1 ? echelle : undefined;
  return (
    <div className="carte p-3" aria-label="Aperçu du tableau de bord — essai en cours">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="accueil" size={15} /> Tableau de bord — essai en cours
        {onViewport && (
          <span className="ml-auto flex items-center gap-1" role="toolbar" aria-label="Viewport d'aperçu">
            {VIEWPORTS.map((v) => {
              const icone =
                v.id === "phone-portrait" ? "tel-portrait"
                : v.id === "phone-landscape" ? "tel-paysage"
                : v.id === "tablet-portrait" ? "tab-portrait"
                : "tab-paysage";
              const etiquette = `${v.libelle} (${v.largeur}×${v.hauteur})`;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`btn btn-compact min-h-8 px-2 ${viewport === v.id ? "btn-active" : ""}`}
                  aria-pressed={viewport === v.id}
                  aria-label={etiquette}
                  title={etiquette}
                  onClick={() => onViewport(v.id)}
                >
                  <Icon name={icone} size={14} />
                </button>
              );
            })}
          </span>
        )}
      </h3>
      <div className="mt-1" ref={cadreRef}>
        <PhoneCanvas
          screen={game.global?.screen ?? {}}
          game={game}
          lignesApercu={ap.lignes}
          viewport={viewport}
          scale={scale}
          showGhosts={false}
          carteSimu={carteSimu}
          dissimulationJoueur
          cleContexte={game.gameId}
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
