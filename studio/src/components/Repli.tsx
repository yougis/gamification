// Commande de repli unique des panneaux (change studio-composer-ux) :
// chevron ancré au bord (sens = direction du mouvement) + rail icon-only.
// Remplace les boutons texte « Replier »/« Déplier » et la molette.
import { Fragment } from "react";
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
      className="btn btn-compact min-h-8 px-2"
      onClick={onBasculer}
      title={titre}
      aria-label={titre}
      aria-expanded={!replie}
    >
      <Icon name={CHEVRON[direction]} size={14} />
    </button>
  );
}

/** Action d'un rail replié : soit icône cliquable, soit rendu custom (ex. pastille). */
export type ActionRail =
  | { kind: "icone"; icone: IconName; titre: string; actif?: boolean; onAction: () => void }
  | { kind: "rendu"; rendu: React.ReactNode; cle: string };

/**
 * Rail fin laissé par un panneau replié (change studio-action-rails) : icône
 * du panneau (déplier tel quel) + actions du panneau. Plus de chevron ici :
 * l'icône panneau suffit (les chevrons restent sur les panneaux ouverts).
 */
export function RailReplie({
  icone,
  titre,
  actions = [],
  onDeplier,
}: {
  icone: IconName;
  /** Tooltip + label accessible (« … — cliquer pour déplier »). */
  titre: string;
  actions?: ActionRail[];
  onDeplier: () => void;
}) {
  return (
    <div className="carte flex w-12 shrink-0 flex-col items-center gap-2 p-2" aria-label={titre}>
      <button className="btn btn-compact px-2.5" onClick={onDeplier} title={titre} aria-label={titre} aria-expanded={false}>
        <Icon name={icone} size={17} />
      </button>
      {actions.map((a) =>
        a.kind === "rendu" ? (
          <Fragment key={a.cle}>{a.rendu}</Fragment>
        ) : (
          <button
            key={a.titre}
            className="btn btn-compact px-2"
            onClick={a.onAction}
            title={a.titre}
            aria-label={a.titre}
            aria-current={a.actif ? true : undefined}
          >
            <Icon name={a.icone} size={15} />
          </button>
        ),
      )}
    </div>
  );
}
