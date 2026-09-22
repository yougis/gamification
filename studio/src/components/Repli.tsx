// Commande de repli unique des panneaux (change studio-composer-ux) :
// chevron ancré au bord (sens = direction du mouvement) + rail icon-only.
// Remplace les boutons texte « Replier »/« Déplier » et la molette.
import { Icon, type IconName } from "./icons";

export type DirectionRepli = "gauche" | "droite" | "haut" | "bas";

const CHEVRON: Record<DirectionRepli, IconName> = {
  gauche: "chevron-g",
  droite: "chevron-d",
  haut: "chevron-h",
  bas: "chevron-b",
};

/** Chevron de repli/dépli ancré au bord d'un panneau ouvert ou de son rail. */
export function ChevronRepli({
  direction,
  titre,
  replie,
  onBasculer,
}: {
  /** Sens du mouvement provoqué par le clic. */
  direction: DirectionRepli;
  /** Tooltip + label accessible. */
  titre: string;
  /** True si le panneau est actuellement replié (pour aria-expanded). */
  replie: boolean;
  onBasculer: () => void;
}) {
  return (
    <button
      className="btn min-h-8 px-2"
      onClick={onBasculer}
      title={titre}
      aria-label={titre}
      aria-expanded={!replie}
    >
      <Icon name={CHEVRON[direction]} size={14} />
    </button>
  );
}

/** Rail fin laissé par un panneau replié : icône seule + tooltip, clic = déplier. */
export function RailReplie({
  icone,
  titre,
  directionRetour,
  onDeplier,
}: {
  icone: IconName;
  /** Tooltip + label accessible (« … — cliquer pour déplier »). */
  titre: string;
  /** Sens du retour du contenu (graphe replié à gauche → "droite", liste/détail → "gauche"). */
  directionRetour: DirectionRepli;
  onDeplier: () => void;
}) {
  return (
    <div className="carte flex w-12 shrink-0 flex-col items-center gap-2 p-2" aria-label={titre}>
      <button className="btn px-2.5" onClick={onDeplier} title={titre} aria-label={titre} aria-expanded={false}>
        <Icon name={icone} size={17} />
      </button>
      <ChevronRepli direction={directionRetour} titre={titre} replie onBasculer={onDeplier} />
    </div>
  );
}
