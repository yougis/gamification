// Terminal joueur simule du mode "Jeux" (change studio-player-preview) :
// plein ecran, PhoneCanvas en lecture seule (ni selection, ni edition, ni
// fantomes), slot module rendu par le renderer joueur du registre — ou
// PlayerFallback si le Module n'en declare aucun. Vue seulement : toute
// progression transite par les callbacks triche (onCompleteNode, onTerminer,
// onAbandonner) et n'ecrit jamais dans le JSON source.
import { useEffect } from "react";
import { Icon } from "../icons";
import { PhoneCanvas } from "./PhoneCanvas";
import { PlayerFallback } from "./PlayerFallback";
import { getPlayer } from "../../game/module-screen-plugin";
import { resolveScreen } from "../../game/screen-utils";
import type { Branding, ExperienceStyle, GameNode, HoldMode, ScreenDefinition } from "../../game/types";

export function PlayerTerminal({
  node,
  globalScreen,
  branding,
  experienceStyle,
  holdMode,
  onCompleteNode,
  onTerminer,
  onAbandonner,
  onQuitter,
}: {
  node: GameNode;
  globalScreen?: ScreenDefinition;
  branding?: Branding;
  experienceStyle?: ExperienceStyle;
  holdMode: HoldMode;
  onCompleteNode: (score: number) => void;
  onTerminer: () => void;
  onAbandonner: () => void;
  onQuitter: () => void;
}) {
  useEffect(() => {
    const sortie = (e: KeyboardEvent) => {
      if (e.key === "Escape") onQuitter();
    };
    window.addEventListener("keydown", sortie);
    return () => window.removeEventListener("keydown", sortie);
  }, [onQuitter]);

  const screen = resolveScreen(node, globalScreen);
  const Player = getPlayer(node.module.type);
  const data = (node.module.data ?? {}) as Record<string, unknown>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas" role="dialog" aria-label={`Terminal joueur simulé — ${node.id}`}>
      <div className="flex min-h-11 items-center gap-2 border-b border-rule bg-panel px-3">
        <span className="puce">SIMULÉ</span>
        <span className="puce">hold:{holdMode}</span>
        <span className="truncate font-mono text-[11px] text-snow">{node.id}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] text-fog">simulation — n'écrit jamais dans le JSON source</span>
          <button className="btn min-h-9" onClick={onQuitter}>
            <Icon name="fermer" size={15} /> Quitter (Échap)
          </button>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <PhoneCanvas
          screen={screen}
          moduleType={node.module.type}
          moduleData={data}
          viewport="phone-portrait"
          showGhosts={false}
          dissimulationJoueur
          cleContexte={node.id}
          couleurMessage={branding?.primaryColor}
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
