// Double vue Liste + Graphe : la liste visualise et modifie le même graphe.
// Sobre : une ligne par étape, icône du type + nom + puces de statut.
// Synchronisée avec le canvas via sel / onChoisir. En lecture seule (mobile
// relecture), les actions d'édition sont masquées, la sélection reste.

import { useMemo, useState } from "react";
import { Icon } from "./icons";
import { CONDITIONS_FR, ETATS_FR, MODULES_FR } from "../game/i18n-ui";
import type { Game } from "../game/types";

export type FiltreListe = "tous" | "etapes" | "tirages" | "fins" | "impasses" | "brouillons";

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
  onChoisir,
  erreursParNoeud,
  lectureSeule,
}: {
  game: Game;
  statuts: Record<string, { state: string }>;
  impasses: Set<string>;
  sel: string | null;
  onChoisir: (id: string) => void;
  erreursParNoeud: Map<string, string[]>;
  lectureSeule: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreListe>("tous");

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
      <header className="flex flex-col gap-2 border-b p-2" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2">
          <Icon name="liste" size={16} />
          <h2 className="text-sm font-bold">Étapes ({elements.length}/{game.nodes.length})</h2>
          <span className="flex-1" />
          {!lectureSeule && (
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>
              Clic = modifier à droite
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2">
            <span className="sr-only">Rechercher une étape</span>
            <Icon name="recherche" size={15} />
            <input
              className="champ min-w-0 flex-1"
              style={{ minHeight: 40 }}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher (nom, quiz, lieu…)"
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer la liste</span>
            <select className="champ" style={{ minHeight: 40 }} value={filtre} onChange={(e) => setFiltre(e.target.value as FiltreListe)}>
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
          <div className="p-4 text-sm">
            <p className="font-semibold">Le graphe est vide.</p>
            <p style={{ color: "var(--ink-2)" }}>
              {lectureSeule
                ? "Rien à relire pour l'instant."
                : "Ajoute une Étape, un Lieu GPS, un Tirage ou une Fin depuis la palette, puis relie les étapes entre elles."}
            </p>
          </div>
        )}
        {game.nodes.length > 0 && elements.length === 0 && (
          <p className="p-4 text-sm" style={{ color: "var(--ink-2)" }}>
            Aucune étape ne correspond à « {recherche} ». Essaie un autre mot ou un autre filtre.
          </p>
        )}
        {elements.map((n) => {
          const statut = statuts[n.id]?.state ?? "draft";
          const estImpasse = impasses.has(n.id);
          const enErreur = (erreursParNoeud.get(n.id) ?? []).length > 0;
          const choisi = sel === n.id;
          const declencheurs = n.activation.requires
            .map((c) => CONDITIONS_FR[c.type]?.nom ?? c.type)
            .slice(0, 2)
            .join(" + ");
          return (
            <button
              key={n.id}
              id={`liste-${n.id}`}
              role="option"
              aria-selected={choisi}
              onClick={() => onChoisir(n.id)}
              className={choisi ? "etape-courante" : undefined}
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                textAlign: "left",
                alignItems: "flex-start",
                padding: "10px",
                margin: "2px 0",
                borderRadius: 10,
                border: choisi ? "2px solid var(--focus)" : enErreur ? "1px solid var(--couleur-alerte)" : "1px solid var(--line)",
                background: choisi ? "var(--surface)" : "var(--surface-2)",
                cursor: "pointer",
                minHeight: 56,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flex: "none",
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
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13 }}>{n.id}</strong>
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
                <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {MODULES_FR[n.module.type]?.nom ?? n.module.type}
                  {declencheurs ? ` · ${declencheurs}` : ""}
                  {` · ${ETATS_FR[statut] ?? statut}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
