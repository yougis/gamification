// Stepper du workflow de création — sobre, lisible au clavier.
// 1 Graphe · 2 Épreuves · 3 Relecture · 4 Validation · 5 Export
// L'état visuel (courant / fait / bloqué) ne vit que dans l'UI locale,
// jamais dans le JSON du jeu (exigence : aucun état visuel sans équivalent JSON
// ne s'applique qu'au graphe exporté, pas au chrome du Studio).

import { Icon, type IconName } from "./icons";

export type EtapeWorkflow = 1 | 2 | 3 | 4 | 5;

export const ETAPES: { id: EtapeWorkflow; nom: string; aide: string; icone: IconName }[] = [
  { id: 1, nom: "Graphe", aide: "Poser les étapes et les liens", icone: "graphe" },
  { id: 2, nom: "Épreuves", aide: "Renseigner chaque mini-jeu", icone: "etape" },
  { id: 3, nom: "Relecture", aide: "Statuts Brouillon / Relu / Publié", icone: "statut" },
  { id: 4, nom: "Validation", aide: "Couches 1+2, impasses surlignées", icone: "valider" },
  { id: 5, nom: "Export", aide: "Pack offline vérifié SHA-256", icone: "exporter" },
];

export function WorkflowStepper({
  courant,
  onAller,
  fait,
  bloqueExport,
  nbErreurs,
  nbBrouillons,
}: {
  courant: EtapeWorkflow;
  onAller: (e: EtapeWorkflow) => void;
  fait: Record<EtapeWorkflow, boolean>;
  bloqueExport: boolean;
  nbErreurs: number;
  nbBrouillons: number;
}) {
  return (
    <nav aria-label="Étapes de création" className="w-full">
      <ol className="flex items-stretch gap-1 overflow-x-auto py-1 list-none m-0 pl-0">
        {ETAPES.map((e, i) => {
          const estCourante = e.id === courant;
          const estFaite = fait[e.id];
          const bloque = e.id === 5 && bloqueExport;
          let badge: string | null = null;
          if (e.id === 3 && nbBrouillons > 0) badge = `${nbBrouillons} brouillon${nbBrouillons > 1 ? "s" : ""}`;
          if (e.id === 4 && nbErreurs > 0) badge = `${nbErreurs} problème${nbErreurs > 1 ? "s" : ""}`;
          return (
            <li key={e.id} className="flex items-stretch flex-1 min-w-[132px]">
              <button
                type="button"
                onClick={() => onAller(e.id)}
                aria-current={estCourante ? "step" : undefined}
                title={`${e.nom} — ${e.aide}`}
className={`${estCourante ? "etape-courante" : ""} flex items-center gap-2 w-full min-h-12 rounded-lg cursor-pointer text-left font-semibold px-2.5 py-1.5`}
                 style={{
                   border: estCourante ? "2px solid var(--focus)" : "1px solid var(--line)",
                   background: estCourante ? "var(--surface)" : "var(--surface-2)",
                   fontWeight: estCourante ? 700 : 600,
                 }}
              >
<span
                   aria-hidden="true"
                   className="inline-flex items-center justify-center rounded-full shrink-0 font-bold text-[9px]"
                   style={{
                     width: 28,
                     height: 28,
                     border: "1px solid var(--line-forte)",
                     background: estFaite ? "var(--couleur-accent-douce)" : "var(--surface)",
                     color: estFaite ? "var(--couleur-accent-fonce)" : "var(--ink-2)",
                   }}
                 >
                  {estFaite && !estCourante ? <Icon name="ok" size={15} /> : <span>{i + 1}</span>}
                </span>
<span className="min-w-0">
                   <span className="flex items-center gap-1.5 text-[9px]">
                     <Icon name={e.icone} size={15} />
                     {e.nom}
                   </span>
                   <span className="block text-[11px] font-normal" style={{ color: bloque || badge ? "var(--couleur-alerte)" : "var(--ink-2)" }}>
                     {bloque ? "Bloqué : corriger d'abord" : (badge ?? e.aide)}
                   </span>
                 </span>
              </button>
              {i < ETAPES.length - 1 && (
                <span aria-hidden="true" className="self-center px-0.5 text-forte inline-flex">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5.5 15.5 12 9 18.5" />
                  </svg>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
