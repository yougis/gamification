// Etat non bloquant du terminal joueur (change studio-player-preview) :
// affiche quand le Module du noeud ACTIVE ne declare aucun renderer joueur.
// Triche uniquement : terminer/abandonner sans ecrire dans le JSON source.
import { Icon } from "../icons";

export function PlayerFallback({
  moduleType,
  onTerminer,
  onAbandonner,
}: {
  moduleType?: string;
  onTerminer: () => void;
  onAbandonner: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-line bg-surface-2/50 px-3 py-6">
      <Icon name="package" size={24} />
      <span className="text-sm font-semibold text-snow">{moduleType ?? "Module"}</span>
      <span className="puce">SIMULÉ</span>
      <p className="text-center text-[11px] text-fog">
        Pas de rendu joueur pour ce module en simulation web — la partie continue par triche tracée.
      </p>
      <div className="flex gap-1">
        <button className="btn-primaire" onClick={onTerminer}>
          <Icon name="valider" size={15} /> Terminer
        </button>
        <button className="btn" onClick={onAbandonner}>Abandonner</button>
      </div>
    </div>
  );
}
