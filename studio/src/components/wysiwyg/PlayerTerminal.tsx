// Terminal joueur simule du mode "Jeux" (change studio-player-preview) :
// plein ecran, PhoneCanvas en lecture seule (ni selection, ni edition, ni
// fantomes), slot module rendu par le renderer joueur du registre — ou
// PlayerFallback si le Module n'en declare aucun. Vue seulement : toute
// progression transite par les callbacks triche (onCompleteNode, onTerminer,
// onAbandonner) et n'ecrit jamais dans le JSON source.
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { PhoneCanvas, VIEWPORTS, type ViewportId } from "./PhoneCanvas";
import { PlayerFallback } from "./PlayerFallback";
import type { CarteSimu } from "./widgets/CarteInteractiveSimu";
import { getPlayer } from "../../game/module-screen-plugin";
import { resolveScreen } from "../../game/screen-utils";
import type { Branding, ExperienceStyle, Game, GameNode, HoldMode, ScreenDefinition } from "../../game/types";

export function PlayerTerminal({
  node,
  game,
  globalScreen,
  branding,
  experienceStyle,
  holdMode,
  onCompleteNode,
  onTerminer,
  onAbandonner,
  onQuitter,
  positionSimu,
  eligiblesSimu,
  onOuvrirSimu,
  viewport = "phone-portrait",
  onViewport,
}: {
  node: GameNode;
  // Jeu courant (change widget-cartographie) : contexte de lecture pour les
  // widgets lies (carte : positions, fonds). Absent = apercu sans donnees.
  game?: Game;
  globalScreen?: ScreenDefinition;
  branding?: Branding;
  experienceStyle?: ExperienceStyle;
  holdMode: HoldMode;
  onCompleteNode: (score: number) => void;
  onTerminer: () => void;
  onAbandonner: () => void;
  onQuitter: () => void;
  // Carte simu (change carte-joueur-navigable, phase 3) : position simulée
  // (null = non renseignée), éligibles simulés, ouverture simulée. Absents =
  // carte schématique sans interaction (comportement historique).
  positionSimu?: { lat: number; lng: number } | null;
  eligiblesSimu?: string[];
  onOuvrirSimu?: (id: string) => void;
  // Viewport d'aperçu (change studio-modejeux-viewports) : mêmes 4 formats que
  // Screen, état partagé depuis App. Absent de onViewport = pas de sélecteur
  // (comportement historique portrait pour les autres appelants).
  viewport?: ViewportId;
  onViewport?: (v: ViewportId) => void;
}) {
  useEffect(() => {
    const sortie = (e: KeyboardEvent) => {
      if (e.key === "Escape") onQuitter();
    };
    window.addEventListener("keydown", sortie);
    return () => window.removeEventListener("keydown", sortie);
  }, [onQuitter]);

  // Mise à l'échelle plein-cadre en paysage (même calcul que Screen) :
  // réduction seule, portrait en rendu natif.
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

  const screen = resolveScreen(node, globalScreen);
  const Player = getPlayer(node.module.type);
  const data = (node.module.data ?? {}) as Record<string, unknown>;
  // Carte interactive simulée : construite seulement si un ouvreur simu est
  // fourni (sinon aperçu schématique historique, sans clavier simulé).
  const carteSimu: CarteSimu | undefined =
    onOuvrirSimu && game
      ? {
          position: positionSimu ?? null,
          eligible: (id: string) => eligiblesSimu?.includes(id) ?? false,
          onOuvrir: onOuvrirSimu,
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas" role="dialog" aria-label={`Terminal joueur simulé — ${node.id}`}>
      <div className="flex min-h-11 items-center gap-2 border-b border-rule bg-panel px-3">
        <span className="puce">SIMULÉ</span>
        <span className="puce">hold:{holdMode}</span>
        <span className="truncate font-mono text-[11px] text-snow">{node.id}</span>
        {onViewport && (
          <span className="flex items-center gap-1" role="toolbar" aria-label="Viewport d'aperçu">
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
                  className={`btn min-h-9 px-2 ${viewport === v.id ? "btn-active" : ""}`}
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
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] text-fog">simulation — n'écrit jamais dans le JSON source</span>
          <button className="btn min-h-9" onClick={onQuitter}>
            <Icon name="fermer" size={15} /> Quitter (Échap)
          </button>
        </span>
      </div>
      <div ref={cadreRef} className="min-h-0 flex-1 overflow-auto">
        <PhoneCanvas
          screen={screen}
          game={game}
          moduleType={node.module.type}
          moduleData={data}
          viewport={viewport}
          scale={scale}
          showGhosts={false}
          dissimulationJoueur
          cleContexte={node.id}
          couleurMessage={branding?.primaryColor}
          carteSimu={carteSimu}
          renderModule={() =>
            Player ? (
              <Player data={data} branding={branding} experienceStyle={experienceStyle} onComplete={onCompleteNode} />
            ) : (
              <PlayerFallback moduleType={node.module.type} onTerminer={onTerminer} onAbandonner={onAbandonner} />
            )
          }
        />
      </div>
      <div className="flex min-h-11 items-center gap-1 border-t border-rule bg-panel px-3">
        <span className="text-[9px] text-fog">Triche tracée :</span>
        <button className="btn-primaire min-h-9" onClick={onTerminer}>
          <Icon name="valider" size={15} /> Terminer
        </button>
        <button className="btn min-h-9" onClick={onAbandonner}>Abandonner</button>
      </div>
    </div>
  );
}
