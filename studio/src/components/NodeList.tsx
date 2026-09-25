// Double vue Liste + Graphe : la liste visualise et modifie le même graphe.
// Sobre : une ligne par étape, icône du type + nom + puces de statut.
// Synchronisée avec le canvas via sel / onChoisir. En lecture seule (mobile
// relecture), les actions d'édition sont masquées, la sélection reste.

import { useMemo, useState } from "react";
import { Icon } from "./icons";
import { ChevronRepli } from "./Repli";
import { CONDITIONS_FR, ETATS_FR, MODULES_FR } from "../game/i18n-ui";
import type { Game, Widget, ZoneId } from "../game/types";
import { removeNode } from "../game/mcp";

export type FiltreListe = "tous" | "etapes" | "tirages" | "fins" | "impasses" | "brouillons";

// Sous-arbre écran (change studio-apercu-arbre-paysage) : zones dans l'ordre
// d'affichage, widgets avec libellé court. Les fantômes (zones absentes) sont
// exclus — l'arbre reflète l'écran courant du nœud.
const ORDRE_ZONES: ZoneId[] = ["header", "content", "footer", "overlay"];

const NOM_ZONE_ARBRE: Record<ZoneId, string> = {
  header: "En-tête",
  content: "Contenu",
  footer: "Pied de page",
  overlay: "Surimpression",
};

function libelleWidget(w: Widget): string {
  switch (w.type) {
    case "text":
      return w.text ? (w.text.length > 24 ? `${w.text.slice(0, 24)}…` : w.text) : "texte";
    case "image":
      return "image";
    case "button":
      return w.label || "bouton";
    case "module":
      return "module";
    case "progress":
      return "progression";
    case "spacer":
      return "espaceur";
  }
}

const ICONE_TYPE: Record<string, "etape" | "lieu" | "tirage" | "fin" | "zone" | "essai"> = {
  QUIZ: "etape",
  INFO: "etape",
  DIFFERENCE_GAME: "essai",
  PUZZLE: "etape",
  AR_MARKER: "lieu",
  BOUSSOLE: "zone",
  RANDOM_POOL: "tirage",
};

export function NodeList({
  game,
  statuts,
  impasses,
  sel,
  selMulti = [],
  onChoisir,
  onChoisirZone,
  onChoisirWidget,
  selZoneId,
  selWidgetIndex,
  onBasculer,
  onToutBasculer,
  toutSelectionne = false,
  erreursParNoeud,
  lectureSeule,
  onReplier,
  onAjouter,
  onSupprimer,
  moduleCreation,
  onModuleCreation,
  typesModule,
}: {
  game: Game;
  statuts: Record<string, { state: string }>;
  impasses: Set<string>;
  sel: string | null;
  // Sélection additive partagée avec le graphe (change studio-select-all, D1/D4) :
  // la sélection visible = `{sel} ∪ selMulti`, optionnelle pour compatibilité.
  selMulti?: string[];
  onChoisir: (id: string) => void;
  // Sous-arbre écran (change studio-apercu-arbre-paysage) : sélection d'une
  // zone ou d'un widget depuis la liste (même sélection que le clic canvas).
  // Absents = pas d'arbre (ex. vue mobile, relecture).
  onChoisirZone?: (id: string, zoneId: ZoneId) => void;
  onChoisirWidget?: (id: string, zoneId: ZoneId, index: number) => void;
  selZoneId?: ZoneId | null;
  selWidgetIndex?: number | null;
  // Maj+clic / Maj+Entrée : bascule le nœud dans la sélection partagée (D2).
  onBasculer?: (id: string) => void;
  // Action groupée unique « Tout sélectionner / Tout désélectionner » (D3),
  // même action que la barre du graphe, libellé réactif via `toutSelectionne`.
  onToutBasculer?: () => void;
  toutSelectionne?: boolean;
  erreursParNoeud: Map<string, string[]>;
  lectureSeule: boolean;
  onReplier?: () => void;
  onAjouter?: (preset: "etape" | "tirage" | "fin" | "lieu") => void;
  onSupprimer?: (id: string) => void;
  // Mini-jeu choisi en premier à la création (change studio-module-first) :
  // détermine module, données et écran initial des étapes créées.
  moduleCreation?: string;
  onModuleCreation?: (type: string) => void;
  typesModule?: string[];
}) {
  const selectionnes = new Set([...selMulti, ...(sel ? [sel] : [])]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreListe>("tous");
  // Étapes dont le sous-arbre écran est déplié (change
  // studio-apercu-arbre-paysage) : état local, jamais persisté.
  const [deplies, setDeplies] = useState<Set<string>>(new Set());
  const basculerArbre = (id: string) => {
    setDeplies((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const elements = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return game.nodes.filter((n) => {
      if (q && !`${n.id} ${(MODULES_FR[n.module.type]?.nom ?? n.module.type).toLowerCase()}`.includes(q)) return false;
      if (filtre === "etapes") return n.module.type !== "RANDOM_POOL" && !n.isEnding;
      if (filtre === "tirages") return n.module.type === "RANDOM_POOL" || !!n.randomPool;
      if (filtre === "fins") return !!n.isEnding;
      if (filtre === "impasses") return impasses.has(n.id);
      if (filtre === "brouillons") return (statuts[n.id]?.state ?? "draft") === "draft";
      return true;
    });
  }, [game.nodes, recherche, filtre, impasses, statuts]);

  return (
    <section aria-label="Liste des étapes" className="carte flex min-h-0 flex-1 flex-col overflow-hidden">
      {onAjouter && !lectureSeule && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-rule">
          <span className="text-[8px] font-bold uppercase text-fog mr-1">Ajouter</span>
          {onModuleCreation && typesModule && (
            <label className="flex items-center gap-1" title="Mini-jeu des étapes créées (premier choix : détermine l'écran initial)">
              <span className="sr-only">Mini-jeu des étapes créées</span>
              <select className="champ min-h-8 max-w-24 text-[8px]" value={moduleCreation ?? "QUIZ"} onChange={(e) => onModuleCreation(e.target.value)} aria-label="Mini-jeu des étapes créées">
                {typesModule.filter((t) => t !== "RANDOM_POOL").map((t) => (
                  <option key={t} value={t}>{MODULES_FR[t]?.nom ?? t}</option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn-compact min-h-8 px-2 text-[8px]" onClick={() => onAjouter("etape")} title="Créer une étape de jeu" aria-label="Étape de jeu">
            <Icon name="etape" size={14} /> Étape
          </button>
          <button className="btn btn-compact min-h-8 px-2 text-[8px]" onClick={() => onAjouter("lieu")} title="Créer un lieu avec zone GPS" aria-label="Lieu GPS">
            <Icon name="lieu" size={14} /> Lieu
          </button>
          <button className="btn btn-compact min-h-8 px-2 text-[8px]" onClick={() => onAjouter("tirage")} title="Créer un tirage au sort parmi des étapes" aria-label="Tirage au sort">
            <Icon name="tirage" size={14} /> Tirage
          </button>
          <button className="btn btn-compact min-h-8 px-2 text-[8px]" onClick={() => onAjouter("fin")} title="Créer l'étape de fin du jeu" aria-label="Fin du jeu">
            <Icon name="fin" size={14} /> Fin
          </button>
        </div>
      )}
      <header className="flex flex-col gap-2 border-b border-rule p-2">
        <div className="flex items-center gap-2">
          <Icon name="liste" size={16} />
          <h2 className="text-[9px] font-bold">Étapes ({elements.length}/{game.nodes.length})</h2>
          <span className="flex-1" />
          {onToutBasculer && (
            <button className="btn btn-compact min-h-8 px-2 text-[8px]" onClick={onToutBasculer}
              disabled={game.nodes.length === 0}
              title={toutSelectionne ? "Désélectionner toutes les étapes" : "Sélectionner toutes les étapes"}
              aria-label={toutSelectionne ? "Tout désélectionner" : "Tout sélectionner"}>
              {toutSelectionne ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
          {!lectureSeule && (
            <span className="text-[8px] text-fog" title="Maj+clic ajoute ou retire de la sélection multiple">
              Clic = modifier · Maj+clic = ajouter
            </span>
          )}
          {onReplier && (
            <ChevronRepli direction="gauche" titre="Replier la liste" replie={false} onBasculer={onReplier} />
          )}
        </div>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2">
            <span className="sr-only">Rechercher une étape</span>
            <Icon name="recherche" size={15} />
            <input
className="champ min-w-0 flex-1 min-h-10"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher (nom, quiz, lieu…)"
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer la liste</span>
            <select className="champ min-h-10" value={filtre} onChange={(e) => setFiltre(e.target.value as FiltreListe)}>
              <option value="tous">Toutes</option>
              <option value="etapes">Étapes de jeu</option>
              <option value="tirages">Tirages</option>
              <option value="fins">Fins</option>
              <option value="impasses">Impasses</option>
              <option value="brouillons">Brouillons</option>
            </select>
          </label>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-1" role="listbox" aria-label="Étapes du jeu" aria-activedescendant={sel ? `liste-${sel}` : undefined}>
        {game.nodes.length === 0 && (
          <div className="p-4 text-[9px]">
            <p className="font-semibold">Le graphe est vide.</p>
            <p className="text-fog">
              {lectureSeule
                ? "Rien à relire pour l'instant."
                : "Ajoute une Étape, un Lieu GPS, un Tirage ou une Fin depuis la palette, puis relie les étapes entre elles."}
            </p>
          </div>
        )}
        {game.nodes.length > 0 && elements.length === 0 && (
          <p className="p-4 text-[9px] text-fog">
            Aucune étape ne correspond à « {recherche} ». Essaie un autre mot ou un autre filtre.
          </p>
        )}
        {elements.map((n) => {
          const statut = statuts[n.id]?.state ?? "draft";
          const estImpasse = impasses.has(n.id);
          const enErreur = (erreursParNoeud.get(n.id) ?? []).length > 0;
          const choisi = selectionnes.has(n.id);
          const declencheurs = n.activation.requires
            .map((c) => CONDITIONS_FR[c.type]?.nom ?? c.type)
            .slice(0, 2)
            .join(" + ");
          // Sous-arbre écran (change studio-apercu-arbre-paysage) : zones
          // présentes du nœud, fantômes exclus. Rendu seulement si les
          // callbacks de sélection sont fournis (liste auteur).
          const zonesArbre = ORDRE_ZONES.filter((z) => n.screen?.zones?.[z] != null);
          const avecArbre = zonesArbre.length > 0 && (onChoisirZone || onChoisirWidget);
          const arbreOuvert = deplies.has(n.id);
          return (
            <div key={n.id}>
            <div
              id={`liste-${n.id}`}
              role="option"
              aria-selected={choisi}
              tabIndex={0}
              onClick={(e) => { if (e.shiftKey && onBasculer) onBasculer(n.id); else onChoisir(n.id); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (e.shiftKey && onBasculer) onBasculer(n.id);
                  else onChoisir(n.id);
                }
              }}
className={`${choisi ? "etape-courante" : ""} flex items-start gap-2.5 w-full min-h-14 rounded-lg cursor-pointer text-left p-2.5 my-0.5 font-normal`}
               style={{
                 border: choisi ? "2px solid var(--focus)" : enErreur ? "1px solid var(--couleur-alerte)" : "1px solid var(--line)",
                 background: choisi ? "var(--surface)" : "var(--surface-2)",
               }}
            >
<span
                 aria-hidden="true"
                 className="inline-flex items-center justify-center rounded-lg shrink-0"
                 style={{
                   width: 36,
                   height: 36,
                   border: "1px solid var(--line)",
                   background: n.isEnding
                     ? "var(--couleur-fin-douce)"
                     : n.module.type === "RANDOM_POOL"
                       ? "var(--couleur-tirage-douce)"
                       : "var(--surface)",
                   color: n.isEnding
                     ? "var(--couleur-fin)"
                     : n.module.type === "RANDOM_POOL"
                       ? "var(--couleur-tirage)"
                       : "var(--ink-2)",
                 }}
              >
                <Icon name={n.isEnding ? "fin" : (ICONE_TYPE[n.module.type] ?? "etape")} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 flex-wrap">
                  {avecArbre ? (
                    <button
                      type="button"
                      className="shrink-0 rounded px-0.5 text-fog hover:text-snow"
                      onClick={(e) => { e.stopPropagation(); basculerArbre(n.id); }}
                      title={arbreOuvert ? "Replier l'écran" : "Déplier l'écran (zones et widgets)"}
                      aria-label={arbreOuvert ? `Replier l'écran de ${n.id}` : `Déplier l'écran de ${n.id}`}
                      aria-expanded={arbreOuvert}
                    >
                      <Icon name={arbreOuvert ? "chevron-b" : "chevron-d"} size={13} />
                    </button>
                  ) : null}
                  <strong className="text-[9px]">{n.id}</strong>
                  {n.isEnding && (
                    <span className="puce puce-fin">
                      <Icon name="fin" size={12} /> Fin
                    </span>
                  )}
                  {(n.module.type === "RANDOM_POOL" || n.randomPool) && !n.isEnding && (
                    <span className="puce puce-tirage">
                      <Icon name="tirage" size={12} /> Tirage
                    </span>
                  )}
                  {estImpasse && (
                    <span className="puce puce-erreur">
                      <Icon name="alerte" size={12} /> Impasse
                    </span>
                  )}
                  {enErreur && !estImpasse && (
                    <span className="puce puce-erreur">
                      <Icon name="alerte" size={12} /> À corriger
                    </span>
                  )}
                </span>
                <span className="block text-[8px] text-fog overflow-hidden text-ellipsis">
                  {MODULES_FR[n.module.type]?.nom ?? n.module.type}
                  {declencheurs ? ` · ${declencheurs}` : ""}
                  {` · ${ETATS_FR[statut] ?? statut}`}
                </span>
              </span>
              {!lectureSeule && onSupprimer && (
                <button
                  className="shrink-0 p-1 rounded hover:bg-fail/20 text-fog hover:text-fail"
                  onClick={(e) => {
                    e.stopPropagation();
                    const refs: string[] = [];
                    for (const other of game.nodes) {
                      if (other.id === n.id) continue;
                      for (const c of other.activation.requires) {
                        if ((c.type === "NODE_COMPLETED" && c.nodeId === n.id) ||
                            (c.type === "POOL_DRAWN" && c.poolNodeId === n.id) ||
                            (c.type === "TIMER" && c.anchorNodeId === n.id)) {
                          refs.push(`${other.id} (${c.type})`);
                        }
                      }
                      for (const eff of (other.effects ?? [])) {
                        if ((eff.type === "REVEAL_NODE" || eff.type === "UNLOCK_NODE") && eff.nodeId === n.id) {
                          refs.push(`${other.id} (${eff.type})`);
                        }
                      }
                      if (other.discovery?.sourceNode === n.id) refs.push(`${other.id} (discovery)`);
                      if (other.randomPool?.candidates.includes(n.id)) refs.push(`${other.id} (pool)`);
                    }
                    const msg = refs.length > 0
                      ? `Supprimer « ${n.id} » ?\n\nRéférencé par :\n${refs.map((r) => `• ${r}`).join("\n")}`
                      : `Supprimer le nœud « ${n.id} » ?`;
                    if (window.confirm(msg)) {
                      onSupprimer(n.id);
                    }
                  }}
                  title={`Supprimer ${n.id}`}
                  aria-label={`Supprimer le nœud ${n.id}`}
                >
                  <Icon name="fermer" size={14} />
                </button>
              )}
            </div>
            {avecArbre && arbreOuvert ? (
              <div role="tree" aria-label={`Écran de ${n.id}`} className="ml-9 flex flex-col gap-0.5 border-l border-line pl-2 py-1">
                {zonesArbre.map((z) => {
                  const widgets = n.screen?.zones?.[z]?.widgets ?? [];
                  const zoneChoisie = sel === n.id && selZoneId === z;
                  return (
                    <div key={z}>
                      <button
                        type="button"
                        role="treeitem"
                        aria-selected={zoneChoisie && selWidgetIndex == null}
                        className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[8px] ${zoneChoisie && selWidgetIndex == null ? "bg-neon/10 text-neon" : "text-fog hover:text-snow"}`}
                        onClick={(e) => { e.stopPropagation(); onChoisir(n.id); onChoisirZone?.(n.id, z); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChoisir(n.id); onChoisirZone?.(n.id, z); } }}
                        title={`Voir la zone ${NOM_ZONE_ARBRE[z]}`}
                      >
                        <Icon name="zone" size={12} /> {NOM_ZONE_ARBRE[z]} ({widgets.length})
                      </button>
                      {widgets.map((w, i) => {
                        const widgetChoisi = sel === n.id && selZoneId === z && selWidgetIndex === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            role="treeitem"
                            aria-selected={widgetChoisi}
                            className={`ml-4 flex w-[calc(100%-1rem)] items-center gap-1 rounded px-1 py-0.5 text-left text-[8px] ${widgetChoisi ? "bg-neon/10 text-neon" : "text-fog hover:text-snow"}`}
                            onClick={(e) => { e.stopPropagation(); onChoisir(n.id); onChoisirWidget?.(n.id, z, i); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChoisir(n.id); onChoisirWidget?.(n.id, z, i); } }}
                            title={`Voir le widget ${libelleWidget(w)}`}
                          >
                            <Icon name="etape" size={11} />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{w.type} — {libelleWidget(w)}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
