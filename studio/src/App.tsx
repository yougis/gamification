import { useEffect, useMemo, useState, useReducer } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { validateGame, deadEnds } from "./game/validate";
import { evaluate, drawPool, type Sim } from "./game/evaluate";
import { composeNodes, setActivation, registerAsset, exportPack, addSecoursCode, type ManifestFile } from "./game/mcp";
import { emptyMeta, type Condition, type Game, type GameNode, type Predicate, type StudioMeta } from "./game/types";
import {
  MODULES_FR, CONDITIONS_FR, FAMILLES, PRESETS_RAYON, MILIEUX, ETATS_FR,
  OPERATEURS_FR, erreurFR, type Milieu,
} from "./game/i18n-ui";
import registre from "./game/schema/registry.json";

const TYPES_MODULE = ["INFO", ...Object.keys(registre), "RANDOM_POOL"];
import { Icon } from "./components/icons";
import { WorkflowStepper, type EtapeWorkflow } from "./components/WorkflowStepper";
import { NodeList } from "./components/NodeList";

type Snap = { game: Game; meta: StudioMeta };
interface State { past: Snap[]; present: Snap; future: Snap[]; }

const jeuVide = (): Game => ({
  gameId: "nouvelle-enquete",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  branding: {},
  global: { gpsRadiusMeters: 30 },
  nodes: [],
});

const init: State = { past: [], present: { game: jeuVide(), meta: emptyMeta() }, future: [] };

type Action = { t: "set"; snap: Snap } | { t: "undo" } | { t: "redo" };

const reduce = (s: State, a: Action): State => {
  if (a.t === "undo") {
    if (!s.past.length) return s;
    const prev = s.past[s.past.length - 1];
    return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future] };
  }
  if (a.t === "redo") {
    if (!s.future.length) return s;
    const [next, ...rest] = s.future;
    return { past: [...s.past, s.present], present: next, future: rest };
  }
  return { past: [...s.past, s.present], present: a.snap, future: [] };
};

const TYPES_CONDITION = ["GEOFENCE", "NODE_COMPLETED", "TIMER", "POOL_DRAWN", "PROXIMITY_MASTER", "CONDITIONAL", "WINDOW"];

const conditionVide = (type: string): Condition => {
  switch (type) {
    case "GEOFENCE":
      return { type: "GEOFENCE", lat: 48.0, lng: 2.0, radiusMeters: 30, predicate: "enter" };
    case "NODE_COMPLETED":
      return { type: "NODE_COMPLETED", nodeId: "" };
    case "TIMER":
      return { type: "TIMER", anchor: "GAME_START", delaySeconds: 60 };
    case "POOL_DRAWN":
      return { type: "POOL_DRAWN", poolNodeId: "" };
    case "PROXIMITY_MASTER":
      return { type: "PROXIMITY_MASTER", masterId: "", transport: "ble" };
    default:
      return { type: type as Condition["type"] };
  }
};

const refDe = (c: Condition): string | undefined =>
  c.type === "NODE_COMPLETED" ? c.nodeId : c.type === "POOL_DRAWN" ? c.poolNodeId : undefined;

type Onglet = "graphe" | "liste" | "detail" | "essai";

export default function App() {
  const [st, dispatch] = useReducer(reduce, init);
  const { game } = st.present;
  const [sel, setSel] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [rapport, setRapport] = useState<string[]>([]);
  const [brut, setBrut] = useState<string[]>([]);
  const [animateur, setAnimateur] = useState(false);
  const [manifest, setManifest] = useState<ManifestFile[]>([]);
  const [nouveauType, setNouveauType] = useState("GEOFENCE");
  const [etapeWorkflow, setEtapeWorkflow] = useState<EtapeWorkflow>(1);
  const [onglet, setOnglet] = useState<Onglet>("graphe");
  const [exportOk, setExportOk] = useState(false);
  const [etroite, setEtroite] = useState(false);
  // --- prévisualisation ---
  const [sessionId, setSessionId] = useState("session-1");
  const [sim, setSim] = useState({ present: [] as string[], dwell: [] as string[], through: [] as string[], dtMin: 0, precision: 5 });
  const [draws, setDraws] = useState<Record<string, string[]>>({});
  const [forced, setForced] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [replays, setReplays] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [testAll, setTestAll] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const maj = () => setEtroite(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  // Mobile relecture : lecture seule + statuts + validation, pas d'édition.
  const lectureSeule = etroite && onglet !== "graphe" ? false : etroite && false;
  const relecture = etroite;
  void lectureSeule;

  const edit = (fn: (s: Snap) => Snap) => {
    if (relecture) return;
    dispatch({ t: "set", snap: fn(st.present) });
    setExportOk(false);
  };
  const editGame = (fn: (g: Game) => Game) => edit((s) => ({ ...s, game: fn(s.game) }));
  const etape: GameNode | undefined = game.nodes.find((n) => n.id === sel);
  const impasses = useMemo(() => new Set(deadEnds(game)), [game]);

  const erreursParNoeud = useMemo(() => {
    const m = new Map<string, string[]>();
    const ids = new Set(game.nodes.map((n) => n.id));
    for (const e of brut) {
      for (const id of ids) {
        if (e.includes(id)) {
          const l = m.get(id) ?? [];
          l.push(e);
          m.set(id, l);
        }
      }
    }
    for (const id of impasses) {
      const l = m.get(id) ?? [];
      if (!l.some((x) => x.includes("impasse"))) l.push(`Impasse : ${id} ne mène à aucune fin — relie-la à une fin.`);
      m.set(id, l);
    }
    return m;
  }, [brut, game.nodes, impasses]);

  const noeuds: Node[] = useMemo(
    () =>
      game.nodes.map((n, i) => {
        const estSel = sel === n.id;
        const enErreur = (erreursParNoeud.get(n.id) ?? []).length > 0;
        const statut = st.present.meta.status[n.id]?.state ?? "draft";
        const nom = MODULES_FR[n.module.type]?.nom ?? n.module.type;
        return {
          id: n.id,
          position: positions[n.id] ?? { x: (i % 4) * 250, y: Math.floor(i / 4) * 160 },
          selected: estSel,
          data: {
            label: `${n.isEnding ? "FIN · " : ""}${n.id} · ${nom}${statut === "draft" ? " · Brouillon" : ""}${enErreur ? " · À corriger" : ""}`,
          },
          style: {
            border: estSel
              ? "3px solid #0b5fff"
              : enErreur
                ? "2px solid #b42318"
                : n.isEnding
                  ? "2px solid #8a5a00"
                  : n.module.type === "RANDOM_POOL"
                    ? "2px dashed #5f3dc4"
                    : "1px solid #b9c1ca",
            background: estSel
              ? "#e8efff"
              : enErreur
                ? "#fdecea"
                : n.isEnding
                  ? "#fff4d6"
                  : n.module.type === "RANDOM_POOL"
                    ? "#ede9fe"
                    : "#ffffff",
            borderRadius: 12,
            padding: 8,
            fontWeight: estSel || enErreur ? 700 : 500,
            boxShadow: estSel ? "0 0 0 3px #fff, 0 0 0 5px #0b5fff" : undefined,
          },
        };
      }),
    [game.nodes, positions, erreursParNoeud, sel, st.present.meta.status],
  );
  const aretes: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (const n of game.nodes) {
      for (const c of n.activation.requires) {
        const from = refDe(c) ?? (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" ? c.anchorNodeId : undefined);
        if (from && game.nodes.some((m) => m.id === from)) {
          const impasse = impasses.has(n.id);
          edges.push({
            id: `${from}->${n.id}:${c.type}`, source: from, target: n.id,
            label: CONDITIONS_FR[c.type]?.nom ?? c.type,
            animated: impasse,
            style: impasse ? { stroke: "#b42318", strokeWidth: 2.5 } : { stroke: "#6b7280", strokeWidth: 1.6 },
            labelStyle: { fill: impasse ? "#b42318" : "#374151", fontWeight: 600 },
            labelBgStyle: { fill: "#fff", fillOpacity: 0.92 },
          });
        }
      }
    }
    return edges;
  }, [game.nodes, impasses]);

  const onNodesChange = (changes: NodeChange[]) => {
    if (relecture) return;
    const nodes = applyNodeChanges(changes, noeuds);
    const pos: Record<string, { x: number; y: number }> = { ...positions };
    for (const n of nodes) pos[n.id] = n.position;
    setPositions(pos);
  };
  const onConnect = (c: Connection) => {
    if (relecture) return;
    if (!c.source || !c.target) return;
    editGame((g) => {
      const nodes = g.nodes.map((n) => {
        if (n.id !== c.target) return n;
        const requires = [...n.activation.requires, { type: "NODE_COMPLETED", nodeId: c.source! } as Condition];
        return setActivation(g, n.id, {
          ...n.activation, requires,
          operator: n.activation.operator ?? (requires.length > 1 ? "AND" : undefined),
        }).nodes.find((m) => m.id === n.id)!;
      });
      return { ...g, nodes };
    });
  };

  const actualiserRapport = (g: Game) => {
    const v = validateGame(g);
    const brutes = v.layers.flatMap((l) => l.errors);
    setBrut(brutes);
    setRapport(v.layers.flatMap((l) => (l.errors.length ? l.errors.map(erreurFR) : [`Couche ${l.layer} : OK`])));
    return v;
  };
  const valider = () => {
    actualiserRapport(game);
    setEtapeWorkflow(4);
    if (!etroite) setOnglet("graphe");
  };
  useEffect(() => {
    const v = validateGame(game);
    setBrut(v.layers.flatMap((l) => l.errors));
    setRapport(v.layers.flatMap((l) => (l.errors.length ? l.errors.map(erreurFR) : [`Couche ${l.layer} : OK`])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const ajouterEtape = (preset: "etape" | "tirage" | "fin" | "lieu") => {
    if (relecture) return;
    const id = `etape-${game.nodes.length + 1}`;
    if (preset === "tirage") {
      editGame((g) => composeNodes(g, [{
        id, module: { type: "RANDOM_POOL", data: {} },
        activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
        randomPool: { candidates: [], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" },
      }]));
    } else if (preset === "fin") {
      editGame((g) => composeNodes(g, [{
        id, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } },
        activation: { requires: [] }, isEnding: true,
      }]));
    } else if (preset === "lieu") {
      editGame((g) => composeNodes(g, [{
        id, module: { type: "INFO", data: {} },
        activation: { requires: [{ type: "GEOFENCE", lat: 48.0, lng: 2.0, radiusMeters: 30, predicate: "enter" }] },
      }]));
    } else {
      editGame((g) => composeNodes(g, [{
        id, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } },
        activation: { requires: [] },
      }]));
    }
    setSel(id);
    setEtapeWorkflow(2);
    if (etroite) setOnglet("detail");
  };

  const objetSim = (): Sim => ({
    present: new Set(sim.present),
    dwellOk: new Set(sim.dwell),
    throughOk: new Set(sim.through),
    nowMs: sim.dtMin * 60000,
    completedAt: new Map(Object.entries(done)),
    accuracyM: sim.precision,
  });

  const ev = doEval(objetSim());
  function doEval(s: Sim) {
    return evaluate(game, s, draws, new Map(Object.entries(done)), new Map(Object.entries(counts)), new Set());
  }
  const file = activeId ? ev.unlocked.filter((id) => id !== activeId) : ev.unlocked;

  const journal = (msg: string) => setLog((l) => [...l, `[${sessionId}] ${msg} (triche)`]);
  const ouvrir = (id: string) => {
    setActiveId(id);
    journal(`ouverture ${id}`);
  };
  const terminer = (id: string, abandon: boolean) => {
    const n = game.nodes.find((m) => m.id === id)!;
    const fois = (counts[id] ?? 0) + 1;
    if (fois > 1) {
      const used = replays[id] ?? 0;
      if (n.onReentry !== "replay" || used >= (n.maxReentries ?? 0)) {
        journal(`${id} : rejouée ignorée`);
        setActiveId(null);
        return;
      }
      setReplays((r) => ({ ...r, [id]: used + 1 }));
      if (!n.scoreOnReplay) journal(`${id} : rejouée sans score`);
    }
    setCounts((c) => ({ ...c, [id]: fois }));
    if (!abandon) {
      setDone((d) => ({ ...d, [id]: sim.dtMin * 60000 }));
      journal(`${id} : TERMINÉE`);
      const nextDraws = { ...draws };
      for (const p of game.nodes) {
        if (!p.randomPool || nextDraws[p.id]) continue;
        const s = objetSim();
        const ok = p.activation.requires.every((c) => {
          if (c.type === "TIMER") return s.nowMs >= (c.delaySeconds ?? 0) * 1000;
          if (c.type === "NODE_COMPLETED") return (done[c.nodeId!] ?? -1) >= 0;
          if (c.type === "POOL_DRAWN") return (draws[c.poolNodeId!] ?? []).length > 0;
          return true;
        });
        if (ok) {
          const f = forced[p.id] ? [forced[p.id]] : undefined;
          nextDraws[p.id] = drawPool(p, sessionId, f);
          journal(`tirage ${p.id} -> ${nextDraws[p.id].join(",")}${f ? " (forcé)" : ""}`);
        }
      }
      setDraws(nextDraws);
    } else journal(`${id} : abandonnée`);
    setActiveId(null);
  };

  const nouvelleSession = () => {
    setDraws({});
    setDone({});
    setCounts({});
    setReplays({});
    setActiveId(null);
    setSim({ present: [], dwell: [], through: [], dtMin: 0, precision: 5 });
    journal("nouvelle session");
  };

  const testerBranches = () => {
    const pools = game.nodes.filter((n) => n.randomPool);
    if (!pools.length) {
      setTestAll("aucun tirage : rien à tester");
      return;
    }
    const out: string[] = [];
    for (const p of pools) {
      for (const cand of p.randomPool!.candidates) {
        const s: Sim = {
          present: new Set(game.nodes.map((n) => n.id)),
          dwellOk: new Set(game.nodes.map((n) => n.id)),
          throughOk: new Set(game.nodes.map((n) => n.id)),
          nowMs: 3600000,
          completedAt: new Map(),
          accuracyM: 5,
        };
        const localDone = new Map<string, number>();
        const localCount = new Map<string, number>();
        let steps = 0;
        let progresse = true;
        while (progresse && steps < game.nodes.length * 3) {
          progresse = false;
          steps++;
          const r = evaluate(game, s, { [p.id]: [cand] }, localDone, localCount, new Set());
          const target = r.auto[0] ?? r.choice[0];
          if (!target) break;
          localDone.set(target, steps);
          localCount.set(target, 1);
          s.completedAt = localDone;
          progresse = true;
        }
        const fin = game.nodes.some((n) => n.isEnding && localDone.has(n.id));
        out.push(`${p.id}→${cand} : ${fin ? "FIN atteinte" : "BLOQUÉE"}`);
      }
    }
    setTestAll(out.join(" | "));
  };

  const exporter = async () => {
    const r = await exportPack(game, st.present.meta, manifest, animateur);
    if (!r.ok) {
      setBrut(r.errors);
      setRapport(r.errors.map(erreurFR));
      setEtapeWorkflow(4);
      const m = r.errors.join(" ");
      const fautif = game.nodes.find((n) => m.includes(n.id));
      if (fautif) setSel(fautif.id);
      return;
    }
    const dl = (name: string, text: string) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = name;
      a.click();
    };
    dl("game.json", r.gameJson!);
    dl("manifest.json", JSON.stringify(r.manifest, null, 2));
    dl("studio-meta.json", JSON.stringify(st.present.meta, null, 2));
    setRapport([`Export OK : game.json + manifest (${r.manifest!.files.length} fichiers) + studio-meta.json`]);
    setExportOk(true);
    setEtapeWorkflow(5);
  };

  const chargerFixture = async () => {
    const mod = await import("./game/game-5poi.json");
    const g = (mod as { default: Game }).default;
    edit((s) => ({ game: g, meta: { ...s.meta } }));
    setSel(null);
    nouvelleSession();
  };

  const erreurs = rapport.filter((r) => !r.includes(": OK"));
  const nbEtapes = game.nodes.length;
  const finPresente = game.nodes.some((n) => n.isEnding);
  const nbBrouillons = game.nodes.filter((n) => (st.present.meta.status[n.id]?.state ?? "draft") === "draft").length;
  const bloqueExport = erreurs.length > 0 || (!animateur && nbBrouillons > 0);
  const fait = {
    1: nbEtapes > 0,
    2: nbEtapes > 0,
    3: nbEtapes > 0 && nbBrouillons === 0,
    4: erreurs.length === 0 && nbEtapes > 0,
    5: exportOk,
  } as Record<EtapeWorkflow, boolean>;

  const choisirNoeud = (id: string) => {
    setSel(id);
    if (etroite) setOnglet("detail");
    else if (etapeWorkflow === 1) setEtapeWorkflow(2);
  };

  const palette = (
    <nav className="flex flex-col gap-2" aria-label="Ajouter une étape">
      <span className="text-xs font-bold uppercase" style={{ color: "var(--ink-2)" }}>Ajouter</span>
      {relecture && (
        <p className="puce" style={{ whiteSpace: "normal" }}>
          <Icon name="statut" size={13} /> Relecture : ajout désactivé sur petit écran
        </p>
      )}
      <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => ajouterEtape("etape")} disabled={relecture} title="Créer une étape Quiz / jeu">
        <Icon name="etape" size={17} /> Étape de jeu
      </button>
      <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => ajouterEtape("lieu")} disabled={relecture} title="Créer un lieu avec zone GPS">
        <Icon name="lieu" size={17} /> Lieu GPS
      </button>
      <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => ajouterEtape("tirage")} disabled={relecture} title="Créer un tirage au sort parmi des étapes">
        <Icon name="tirage" size={17} /> Tirage au sort
      </button>
      <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => ajouterEtape("fin")} disabled={relecture} title="Créer l'étape de fin du jeu">
        <Icon name="fin" size={17} /> Fin du jeu
      </button>
      <span className="text-xs" style={{ color: "var(--ink-2)" }}>Glisse un lien d'une étape à l'autre pour « après l'étape… ».</span>
    </nav>
  );

  const zoneGraphe = (
    <div className="carte studio-flow relative min-h-0 flex-1 overflow-hidden" style={{ minHeight: 320 }}>
      <ReactFlow nodes={noeuds} edges={aretes} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(_, n) => choisirNoeud(n.id)} fitView minZoom={0.3} maxZoom={2} nodesConnectable={!relecture} nodesDraggable={!relecture} elementsSelectable>
        <Background gap={22} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable style={{ borderRadius: 10 }} aria-label="Mini-carte du graphe" />
        <Panel position="top-left">
          <span className="puce">
            <Icon name="graphe" size={13} /> {nbEtapes} étape{nbEtapes > 1 ? "s" : ""} · glisser pour relier
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );

  const pied = (
    <footer className="flex flex-wrap items-center gap-2 border-t px-3 py-2 text-xs" style={{ borderColor: "var(--line)", background: "var(--surface)" }} aria-label="État du jeu">
      {erreurs.length ? (
        <span className="puce puce-erreur"><Icon name="alerte" size={13} /> {erreurs.length} problème{erreurs.length > 1 ? "s" : ""}</span>
      ) : (
        <span className="puce puce-ok"><Icon name="ok" size={13} /> Valide</span>
      )}
      <span className="puce"><Icon name="liste" size={13} /> {nbEtapes} étape{nbEtapes > 1 ? "s" : ""}</span>
      {finPresente
        ? <span className="puce puce-fin"><Icon name="fin" size={13} /> Fin présente</span>
        : <span className="puce puce-erreur"><Icon name="alerte" size={13} /> Pas de fin — ajoute une Fin du jeu</span>}
      {impasses.size > 0 && (
        <button className="puce puce-erreur" style={{ cursor: "pointer" }} onClick={() => choisirNoeud([...impasses][0])} title="Aller à la première impasse">
          <Icon name="alerte" size={13} /> {impasses.size} impasse{impasses.size > 1 ? "s" : ""} : {[...impasses].slice(0, 3).join(", ")}
        </button>
      )}
      <span className="puce"><Icon name="exemple" size={13} /> {manifest.length} fichier{manifest.length > 1 ? "s" : ""} au manifest</span>
      {nbBrouillons > 0 && (
        <span className="puce"><Icon name="statut" size={13} /> {nbBrouillons} brouillon{nbBrouillons > 1 ? "s" : ""}</span>
      )}
    </footer>
  );

  const listeErreurs = erreurs.length > 0 && (
    <ul className="max-h-28 overflow-auto border-t px-3 py-2 text-xs" style={{ borderColor: "var(--line)", background: "var(--surface)" }} aria-label="Problèmes à corriger">
      {erreurs.map((r, i) => {
        const fautif = game.nodes.find((n) => brut.join(" ").includes(n.id) && r.length > 0 && brut.some((b) => b.includes(n.id) && erreurFR(b) === r));
        void fautif;
        // Retrouve un nœud cité dans l'erreur brute correspondante pour surligner au clic.
        const cible = game.nodes.find((n) => brut[i] && brut[i].includes(n.id)) ?? game.nodes.find((n) => r.includes(n.id));
        return (
          <li key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
            <Icon name="alerte" size={14} />
            <span style={{ flex: 1 }}>{r}</span>
            {cible && (
              <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => choisirNoeud(cible.id)} title={`Aller à ${cible.id}`}>
                Voir {cible.id}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  const detail = (
    <aside className="carte min-h-0 flex-1 overflow-auto p-2" aria-label="Détail de l'étape" style={{ minWidth: 0 }}>
      {etape ? (
        <Inspecteur
          game={game} node={etape} meta={st.present.meta} editGame={editGame} edit={edit}
          nouveauType={nouveauType} setNouveauType={setNouveauType} lectureSeule={relecture}
        />
      ) : (
        <div className="p-3 text-sm">
          <p className="font-bold">Rien de sélectionné.</p>
          <p style={{ color: "var(--ink-2)" }}>Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier.</p>
        </div>
      )}
    </aside>
  );

  const essai = (
    <aside className="carte min-h-0 overflow-auto p-2" aria-label="Essai et relecture" style={{ minWidth: 0 }}>
      <ManifestForm manifest={manifest} setManifest={setManifest} lectureSeule={relecture} />
      <I18nPanel meta={st.present.meta} edit={edit} lectureSeule={relecture} />
      <ReviewOverlay game={game} meta={st.present.meta} />
      <Apercu
        game={game} sim={sim} setSim={setSim} file={file} activeId={activeId}
        ouvrir={ouvrir} terminer={terminer} draws={draws} forced={forced} setForced={setForced}
        log={log} testAll={testAll} testerBranches={testerBranches} sessionId={sessionId}
        setSessionId={setSessionId} nouvelleSession={nouvelleSession}
      />
    </aside>
  );

  return (
    <div className="flex h-screen flex-col text-sm" style={{ background: "var(--surface-2)", color: "var(--ink)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="flex flex-col gap-2 border-b px-3 pt-2" style={{ borderColor: "var(--line)", background: "var(--surface)", paddingTop: "max(8px, env(safe-area-inset-top))" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, background: "var(--couleur-accent)", color: "#fff" }}>
              <Icon name="graphe" size={18} />
            </span>
            <strong className="text-base">GeoPlay Studio</strong>
          </span>
          <label className="flex items-center gap-2">
            <span className="sr-only">Nom du jeu</span>
            <input className="champ" value={game.gameId} size={18} disabled={relecture}
              onChange={(e) => editGame((g) => ({ ...g, gameId: e.target.value }))} aria-label="Nom du jeu" />
          </label>
          <span className="flex-1" />
          <button className="btn" onClick={valider} title="Valider couches 1+2">
            <Icon name="valider" size={16} /> Valider
          </button>
          <button className="btn" onClick={chargerFixture} disabled={relecture} title="Charger la fixture neutre 1/5 vers FIN">
            <Icon name="exemple" size={16} /> Exemple
          </button>
          <button className="btn-primaire" onClick={exporter} disabled={bloqueExport && !animateur} title={bloqueExport && !animateur ? "Corrige les problèmes avant d'exporter" : "Exporter game.json + manifest + studio-meta.json"}>
            <Icon name="exporter" size={16} /> Exporter
          </button>
          <label className="puce" style={{ cursor: "pointer" }} title="Mode animateur : brouillons jouables, triche tracée">
            <input type="checkbox" checked={animateur} onChange={(e) => setAnimateur(e.target.checked)} aria-label="Mode animateur" />
            <Icon name="animateur" size={14} /> Animateur
          </label>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => dispatch({ t: "undo" })} disabled={!st.past.length || relecture} title="Annuler la dernière modification">
              <Icon name="annuler" size={16} /> <span className="hidden xl:inline">Annuler</span>
            </button>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => dispatch({ t: "redo" })} disabled={!st.future.length || relecture} title="Rétablir">
              <Icon name="retablir" size={16} /> <span className="hidden xl:inline">Rétablir</span>
            </button>
          </span>
        </div>
        <WorkflowStepper courant={etapeWorkflow} onAller={setEtapeWorkflow} fait={fait} bloqueExport={bloqueExport && !animateur} nbErreurs={erreurs.length} nbBrouillons={nbBrouillons} />
        {relecture && (
          <p className="puce" style={{ alignSelf: "flex-start" }}>
            <Icon name="statut" size={13} /> Petit écran : relecture — visualisation, statuts et validation. Retouche sur grand écran.
          </p>
        )}
      </header>

      {/* Grand écran : 3 volets sobres. Petit écran : onglets + barre basse. */}
      <div className="hidden min-h-0 flex-1 gap-3 p-3 lg:flex">
        <div className="carte w-60 shrink-0 overflow-auto p-3" style={{ maxWidth: 260 }}>
          {palette}
        </div>
        <main className="flex min-w-0 flex-[3] flex-col gap-2" aria-label="Graphe et liste">
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="flex min-w-0 flex-[3] flex-col">{zoneGraphe}</div>
            <div className="flex min-w-0 flex-[2] flex-col" style={{ maxWidth: 340 }}>
              <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} onChoisir={choisirNoeud} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} />
            </div>
          </div>
          {pied}
          {listeErreurs}
        </main>
        <div className="flex min-w-0 flex-[2] flex-col gap-3 overflow-auto" style={{ maxWidth: 400 }}>
          {detail}
          {essai}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:hidden">
        <main className="flex min-h-0 flex-1 flex-col" aria-label="Vue courante">
          {onglet === "graphe" && (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="carte shrink-0 p-2">{palette}</div>
              <div className="flex min-h-0 flex-1 flex-col">{zoneGraphe}</div>
            </div>
          )}
          {onglet === "liste" && (
            <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} onChoisir={choisirNoeud} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} />
          )}
          {onglet === "detail" && detail}
          {onglet === "essai" && essai}
        </main>
        {pied}
        {listeErreurs}
        <nav className="carte flex shrink-0 items-stretch gap-1 p-1" aria-label="Vues" style={{ position: "sticky", bottom: 0 }}>
          {(
            [
              { id: "graphe", nom: "Graphe", icone: "graphe" },
              { id: "liste", nom: "Liste", icone: "liste" },
              { id: "detail", nom: "Détail", icone: "detail" },
              { id: "essai", nom: "Essai", icone: "essai" },
            ] as { id: Onglet; nom: string; icone: "graphe" | "liste" | "detail" | "essai" }[]
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              aria-current={onglet === o.id ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minHeight: 56,
                justifyContent: "center",
                borderRadius: 10,
                border: onglet === o.id ? "2px solid var(--focus)" : "1px solid transparent",
                background: onglet === o.id ? "var(--surface)" : "transparent",
                fontWeight: onglet === o.id ? 700 : 500,
                fontSize: 12,
              }}
            >
              <Icon name={o.icone} size={19} />
              {o.nom}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Famille({ titre, aide, children }: { titre: string; aide: string; children: React.ReactNode }) {
  return (
    <details open className="carte" style={{ padding: 0 }}>
      <summary className="cursor-pointer px-3 font-semibold" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>{titre}</summary>
      <div className="px-3 pb-3 flex flex-col gap-2">
        <span className="text-xs" style={{ color: "var(--ink-2)" }}>{aide}</span>
        {children}
      </div>
    </details>
  );
}

function Inspecteur({ game, node, meta, editGame, edit, nouveauType, setNouveauType, lectureSeule }: {
  game: Game; node: GameNode; meta: StudioMeta;
  editGame: (fn: (g: Game) => Game) => void;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  nouveauType: string; setNouveauType: (s: string) => void;
  lectureSeule: boolean;
}) {
  const upd = (patch: Partial<GameNode>) => editGame((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)) }));
  const updDecl = (i: number, patch: Partial<Condition>) =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== node.id) return n;
        const requires = n.activation.requires.map((c, j) => (j === i ? { ...c, ...patch } : c));
        return { ...n, activation: { ...n.activation, requires } };
      }),
    }));
  const supprDecl = (i: number) =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, activation: { ...n.activation, requires: n.activation.requires.filter((_, j) => j !== i) } } : n)),
    }));
  const ajoutDecl = () =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== node.id) return n;
        const requires = [...n.activation.requires, conditionVide(nouveauType)];
        return { ...n, activation: { ...n.activation, requires, operator: n.activation.operator ?? (requires.length > 1 ? "AND" : undefined) } };
      }),
    }));
  const st = meta.status[node.id]?.state ?? "draft";
  const milieu: Milieu = meta.milieu[node.id] ?? "exterieur";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold">{node.id}</h3>
        <span className="puce"><Icon name="statut" size={12} /> {ETATS_FR[st]}</span>
        {node.isEnding && <span className="puce puce-fin"><Icon name="fin" size={12} /> Fin</span>}
      </div>
      <fieldset disabled={lectureSeule} style={{ display: "contents" }}>
      <Famille titre={FAMILLES[0].titre} aide={FAMILLES[0].aide}>
        <label>Mini-jeu <select className="champ" value={node.module.type} onChange={(e) => upd({ module: { ...node.module, type: e.target.value } })}>
          {TYPES_MODULE.map((k) => <option key={k} value={k} title={MODULES_FR[k]?.aide}>{MODULES_FR[k]?.nom ?? k}</option>)}
        </select></label>
        {node.module.type === "QUIZ" && (
          <div>
            {(Array.isArray(node.module.data.questions) ? node.module.data.questions as { q?: string }[] : []).map((q, i) => (
              <div key={i} className="flex gap-1">
                <input className="champ flex-1" value={q.q ?? ""} size={24} placeholder={`Question ${i + 1}`}
                  onChange={(e) => {
                    const questions = [...(node.module.data.questions as { q?: string }[])];
                    questions[i] = { q: e.target.value };
                    upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
                  }} />
                <button className="btn" style={{ padding: "0 10px" }} aria-label={`Supprimer la question ${i + 1}`} title="Supprimer" onClick={() => {
                  const questions = (node.module.data.questions as { q?: string }[]).filter((_, j) => j !== i);
                  upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
                }}><Icon name="fermer" size={15} /></button>
              </div>
            ))}
            <button className="btn" onClick={() => {
              const questions = [...(Array.isArray(node.module.data.questions) ? node.module.data.questions as { q?: string }[] : []), { q: "" }];
              upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
            }}><Icon name="ajouter" size={15} /> Question</button>
          </div>
        )}
        <details><summary className="cursor-pointer text-xs">Données expertes (JSON)</summary>
          <textarea rows={3} className="w-full champ font-mono text-xs" value={JSON.stringify(node.module.data)} onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value) as Record<string, unknown>;
              if (data && typeof data === "object") upd({ module: { ...node.module, data } });
            } catch { /* frappe en cours */ }
          }} />
        </details>
      </Famille>
      <Famille titre={FAMILLES[1].titre} aide={FAMILLES[1].aide}>
        <label>Logique <select className="champ" value={node.activation.operator ?? ""} onChange={(e) => upd({ activation: { ...node.activation, operator: (e.target.value || undefined) as GameNode["activation"]["operator"] } })}>
          <option value="">— (1 seul déclencheur)</option>
          <option value="AND">{OPERATEURS_FR.AND}</option>
          <option value="OR">{OPERATEURS_FR.OR}</option>
        </select></label>
        <div className="flex gap-1">
          <select className="champ" value={nouveauType} onChange={(e) => setNouveauType(e.target.value)}>
            {TYPES_CONDITION.map((c) => <option key={c} value={c} title={CONDITIONS_FR[c]?.aide}>{CONDITIONS_FR[c]?.nom ?? c}</option>)}
          </select>
          <button className="btn" onClick={ajoutDecl}><Icon name="ajouter" size={15} /> Déclencheur</button>
        </div>
        {node.activation.requires.map((c, i) => (
          <div key={i} className="carte p-2" style={{ boxShadow: "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name={c.type === "GEOFENCE" ? "zone" : c.type === "NODE_COMPLETED" ? "apres" : c.type === "TIMER" ? "delai" : c.type === "POOL_DRAWN" ? "tiree" : c.type === "PROXIMITY_MASTER" ? "animateur" : "detail"} size={15} />
              <b>{CONDITIONS_FR[c.type]?.nom ?? c.type}</b>
              <span style={{ flex: 1 }} />
              <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} aria-label="Supprimer ce déclencheur" title="Supprimer" onClick={() => supprDecl(i)}><Icon name="fermer" size={14} /></button>
            </span>
            <ChampsDecl game={game} c={c} upd={(p) => updDecl(i, p)} />
          </div>
        ))}
      </Famille>
      <Famille titre={FAMILLES[2].titre} aide={FAMILLES[2].aide}>
        <label className="flex items-center gap-1"><input type="checkbox" checked={node.activation.latch ?? true} onChange={(e) => upd({ activation: { ...node.activation, latch: e.target.checked } })} /> Rester ouvert après passage</label>
        <label>Rejouable <select className="champ" value={node.onReentry ?? "ignore"} onChange={(e) => upd({ onReentry: e.target.value as GameNode["onReentry"] })}>
          <option value="ignore">Non (une fois)</option><option value="replay">Oui</option>
        </select></label>
        {node.onReentry === "replay" && (
          <label>Rejouées max <input className="champ w-16" type="number" min={1} value={node.maxReentries ?? 1} onChange={(e) => upd({ maxReentries: Number(e.target.value) })} /></label>
        )}
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!node.scoreOnReplay} onChange={(e) => upd({ scoreOnReplay: e.target.checked })} /> Les rejouées marquent des points</label>
        <label className="flex items-center gap-1 font-semibold"><input type="checkbox" checked={!!node.isEnding} onChange={(e) => upd({ isEnding: e.target.checked })} /> Fin du jeu</label>
      </Famille>
      <Famille titre={FAMILLES[3].titre} aide={FAMILLES[3].aide}>
        {node.module.type === "RANDOM_POOL" || node.randomPool ? (
          <div className="flex flex-col gap-1">
            <label>Nombre tiré <input className="champ w-16" type="number" min={1} value={node.randomPool?.drawCount ?? 1}
              onChange={(e) => upd({ randomPool: { candidates: node.randomPool?.candidates ?? [], drawCount: Number(e.target.value), drawTiming: node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION" } })} /></label>
            <label>Moment <select className="champ" value={node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION"} onChange={(e) => upd({ randomPool: { candidates: node.randomPool?.candidates ?? [], drawCount: node.randomPool?.drawCount ?? 1, drawTiming: e.target.value as "ON_POOL_ACTIVATION" | "ON_GAME_START" } })}>
              <option value="ON_POOL_ACTIVATION">En arrivant sur le tirage</option><option value="ON_GAME_START">Au démarrage du jeu</option>
            </select></label>
            <div>Candidates : {game.nodes.filter((m) => m.id !== node.id).map((m) => (
              <label key={m.id} className="mr-2"><input type="checkbox" checked={node.randomPool?.candidates.includes(m.id) ?? false}
                onChange={(e) => {
                  const cur = node.randomPool?.candidates ?? [];
                  const candidates = e.target.checked ? [...cur, m.id] : cur.filter((x) => x !== m.id);
                  upd({ randomPool: { candidates, drawCount: node.randomPool?.drawCount ?? 1, drawTiming: node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION" } });
                }} />{m.id}</label>
            ))}</div>
          </div>
        ) : (
          <button className="btn" onClick={() => upd({ randomPool: { candidates: [], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" } })}><Icon name="tirage" size={15} /> Transformer en tirage</button>
        )}
      </Famille>
      <Famille titre={FAMILLES[4].titre} aide={FAMILLES[4].aide}>
        <label>Statut <select className="champ" value={st} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, status: { ...s.meta.status, [node.id]: { state: e.target.value as StudioMeta["status"][string]["state"] } } } }))}>
          {Object.entries(ETATS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Fournisseur <input className="champ" size={12} value={meta.provenance[node.id]?.providerId ?? ""} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, provenance: { ...s.meta.provenance, [node.id]: { providerId: e.target.value, license: s.meta.provenance[node.id]?.license ?? "", sourceUrl: s.meta.provenance[node.id]?.sourceUrl ?? "" } } } }))} placeholder="Qui fournit le contenu ?" /></label>
        <label>Milieu <select className="champ" value={milieu} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, milieu: { ...s.meta.milieu, [node.id]: e.target.value as Milieu } } }))}>
          {Object.entries(MILIEUX).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}
        </select></label>
        <i className="text-xs" style={{ color: "var(--ink-2)" }}>Conseil : {MILIEUX[milieu].reco}</i>
        {node.activation.requires.some((c) => c.type === "PROXIMITY_MASTER") && (
          <button className="btn" onClick={() => {
            try {
              editGame((g) => addSecoursCode(g, node.id));
            } catch (e) {
              alert(String(e));
            }
          }}><Icon name="ajouter" size={15} /> Secours par code</button>
        )}
        <details><summary className="cursor-pointer text-xs">Options expertes (JSON)</summary>
          <textarea rows={2} className="w-full champ font-mono text-xs" defaultValue={JSON.stringify(meta.overrides[node.id] ?? {})} key={node.id} onBlur={(e) => {
            try {
              const patch = JSON.parse(e.target.value) as Record<string, unknown>;
              if (patch && typeof patch === "object") {
                edit((s) => ({ ...s, meta: { ...s.meta, overrides: { ...s.meta.overrides, [node.id]: patch as StudioMeta["overrides"][string] } } }));
              }
            } catch { alert("Options invalides (JSON)"); }
          }} />
        </details>
      </Famille>
      </fieldset>
    </div>
  );
}

function ChampsDecl({ game, c, upd }: { game: Game; c: Condition; upd: (p: Partial<Condition>) => void }) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  switch (c.type) {
    case "GEOFENCE":
      return (
        <span className="flex flex-wrap gap-1 items-center">
          lat <input className="champ w-20" style={{ minHeight: 40 }} type="number" step="any" value={c.lat ?? ""} onChange={(e) => upd({ lat: num(e.target.value) })} />
          lng <input className="champ w-20" style={{ minHeight: 40 }} type="number" step="any" value={c.lng ?? ""} onChange={(e) => upd({ lng: num(e.target.value) })} />
          rayon <input className="champ w-16" style={{ minHeight: 40 }} type="number" value={c.radiusMeters ?? ""} onChange={(e) => upd({ radiusMeters: num(e.target.value) })} /> m
          {PRESETS_RAYON.map((p) => (
            <button key={p.nom} title={p.aide} className="btn" style={{ minHeight: 36 }} onClick={() => upd({ radiusMeters: p.metres })}>{p.nom} {p.metres}m</button>
          ))}
          Quand <select className="champ" style={{ minHeight: 40 }} value={c.predicate ?? "enter"} onChange={(e) => upd({ predicate: e.target.value as Predicate })}>
            <option value="enter">on entre</option><option value="exit">on sort</option><option value="dwell">on reste</option><option value="through">on traverse</option>
          </select>
          rester <input className="champ w-16" style={{ minHeight: 40 }} type="number" value={(c.dwellMs ?? "") as number | string} onChange={(e) => upd({ dwellMs: num(e.target.value) })} placeholder="ms" />
        </span>
      );
    case "PROXIMITY_MASTER":
      return (
        <span className="flex flex-wrap gap-1 items-center">
          animateur <input className="champ" style={{ minHeight: 40 }} value={c.masterId ?? ""} onChange={(e) => upd({ masterId: e.target.value })} size={10} />
          <button className="btn" style={{ minHeight: 36 }} title="Changer d'identifiant (révoque l'ancien)" onClick={() => upd({ masterId: `m-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}` })}>Rotation</button>
          lien <select className="champ" style={{ minHeight: 40 }} value={c.transport ?? "ble"} onChange={(e) => upd({ transport: e.target.value as "ble" | "wifi" })}>
            <option value="ble">Bluetooth</option><option value="wifi">Wi-Fi</option>
          </select>
          seuil <input className="champ w-16" style={{ minHeight: 40 }} type="number" value={c.minRssiDbm ?? ""} onChange={(e) => upd({ minRssiDbm: num(e.target.value) })} />
        </span>
      );
    case "NODE_COMPLETED":
      return (
        <span>après <select className="champ" style={{ minHeight: 40 }} value={c.nodeId ?? ""} onChange={(e) => upd({ nodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select> <label><input type="checkbox" checked={!!c.allowCycle} onChange={(e) => upd({ allowCycle: e.target.checked })} /> retour autorisé</label></span>
      );
    case "TIMER":
      return (
        <span>attendre <input className="champ w-16" style={{ minHeight: 40 }} type="number" value={c.delaySeconds ?? ""} onChange={(e) => upd({ delaySeconds: num(e.target.value) })} /> s depuis
          <select className="champ" style={{ minHeight: 40 }} value={c.anchor ?? "GAME_START"} onChange={(e) => upd({ anchor: e.target.value as "GAME_START" | "NODE_COMPLETION" })}>
            <option value="GAME_START">le démarrage</option><option value="NODE_COMPLETION">la fin de…</option>
          </select>
          {c.anchor === "NODE_COMPLETION" && <select className="champ" style={{ minHeight: 40 }} value={c.anchorNodeId ?? ""} onChange={(e) => upd({ anchorNodeId: e.target.value })}>
            <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>}</span>
      );
    case "POOL_DRAWN":
      return (
        <span>tirée par <select className="champ" style={{ minHeight: 40 }} value={c.poolNodeId ?? ""} onChange={(e) => upd({ poolNodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.filter((m) => m.randomPool).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select></span>
      );
    default:
      return <i>Réservé (non utilisé pour l'instant)</i>;
  }
}

function ManifestForm({ manifest, setManifest, lectureSeule }: { manifest: ManifestFile[]; setManifest: (m: ManifestFile[]) => void; lectureSeule: boolean }) {
  const [f, setF] = useState({ path: "assets/x.png", version: "1.0.0", size: 1024, sha256: "" });
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="exemple" size={15} /> Fichiers du pack ({manifest.length})
      </h3>
      <ul className="text-xs">{manifest.map((m) => <li key={m.path}>{m.path} v{m.version} {m.size}o {m.sha256.slice(0, 8)}…</li>)}</ul>
      {!lectureSeule && (
        <div className="flex flex-wrap gap-1">
          <input className="champ" style={{ minHeight: 40 }} value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} size={14} aria-label="Chemin du fichier" />
          <input className="champ" style={{ minHeight: 40 }} value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} size={7} aria-label="Version" />
          <input className="champ w-20" style={{ minHeight: 40 }} type="number" value={f.size} onChange={(e) => setF({ ...f, size: Number(e.target.value) })} aria-label="Taille en octets" />
          <input className="champ" style={{ minHeight: 40 }} value={f.sha256} onChange={(e) => setF({ ...f, sha256: e.target.value })} size={12} placeholder="sha256 (64 hex)" aria-label="SHA-256" />
          <button className="btn" onClick={() => { try { setManifest(registerAsset(manifest, f)); } catch (e) { alert(String(e)); } }}><Icon name="ajouter" size={15} /> Fichier</button>
        </div>
      )}
    </div>
  );
}

function I18nPanel({ meta, edit, lectureSeule }: {
  meta: StudioMeta;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  lectureSeule: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="detail" size={15} /> Textes et traductions
      </h3>
      {meta.i18n.map((row, i) => (
        <div key={i} className="flex gap-1">
          <input className="champ" style={{ minHeight: 40 }} value={row.key} size={12} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)) } }))} aria-label="Clé de texte" />
          <input className="champ flex-1" style={{ minHeight: 40 }} value={row.value} size={16} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) } }))} aria-label="Texte" />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.locked} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, locked: e.target.checked } : r)) } }))} /> verrou</label>
        </div>
      ))}
      {!lectureSeule && (
        <div className="flex gap-1">
          <button className="btn" onClick={() => edit((s) => ({ ...s, meta: { ...s.meta, i18n: [...s.meta.i18n, { key: `texte${s.meta.i18n.length + 1}`, value: "", locked: false }] } }))}><Icon name="ajouter" size={15} /> Texte</button>
          <button className="btn" onClick={() => {
            const kept = meta.i18n.filter((r) => r.locked).map((r) => r.key);
            edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r) => (r.locked ? r : { ...r, value: r.value ? `${r.value} (EN)` : r.value })) } }));
            setNote(`Verrouillés conservés : ${kept.join(", ") || "—"}`);
          }}>Simuler une retraduction</button>
        </div>
      )}
      {note && <div className="text-xs">{note}</div>}
    </div>
  );
}

function ReviewOverlay({ game, meta }: { game: Game; meta: StudioMeta }) {
  const diffs = game.nodes.filter((n) => n.module.type === "DIFFERENCE_GAME");
  if (!diffs.length) return null;
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="essai" size={15} /> Relecture 7 erreurs (calques)
      </h3>
      {diffs.map((n) => {
        const d = n.module.data as { source?: string; derivee?: string; polygons?: { x: number; y: number; w: number; h: number }[] };
        const polys = d.polygons ?? [];
        const statut = meta.status[n.id]?.state ?? "draft";
        return (
          <div key={n.id} className="carte p-2 my-1" style={{ boxShadow: "none" }}>
            {n.id} — {ETATS_FR[statut]} — {polys.length} zone(s)
            <div className="relative w-full text-xs" style={{ paddingTop: "56%", background: "var(--ink)", color: "#fff", borderRadius: 8 }}>
              <span className="absolute top-0 left-1">{String(d.source ?? "image source ?")}</span>
              {polys.map((p, i) => (
                <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, border: "2px solid #ffd43b" }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SIGNAUX = [
  { m: 5, nom: "Bon (5 m)", dot: "var(--couleur-accent)" },
  { m: 15, nom: "Moyen (15 m)", dot: "#e8890c" },
  { m: 40, nom: "Faible (40 m)", dot: "var(--couleur-alerte)" },
];

function Apercu(props: {
  game: Game; sim: { present: string[]; dwell: string[]; through: string[]; dtMin: number; precision: number };
  setSim: (fn: (s: { present: string[]; dwell: string[]; through: string[]; dtMin: number; precision: number }) => { present: string[]; dwell: string[]; through: string[]; dtMin: number; precision: number }) => void;
  file: string[]; activeId: string | null;
  ouvrir: (id: string) => void; terminer: (id: string, abandon: boolean) => void;
  draws: Record<string, string[]>; forced: Record<string, string>; setForced: (f: Record<string, string>) => void;
  log: string[]; testAll: string | null; testerBranches: () => void; sessionId: string;
  setSessionId: (s: string) => void; nouvelleSession: () => void;
}) {
  const { game } = props;
  const pools = game.nodes.filter((n) => n.randomPool);
  const sig = SIGNAUX.find((s) => s.m === props.sim.precision) ?? SIGNAUX[0];
  const bascule = (k: "present" | "dwell" | "through", id: string) =>
    props.setSim((s) => ({ ...s, [k]: s[k].includes(id) ? s[k].filter((x) => x !== id) : [...s[k], id] }));
  return (
    <div className="carte p-3 flex flex-col gap-2">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="essai" size={15} /> Essai du parcours (triche tracée)
      </h3>
      <div className="flex gap-1 items-center flex-wrap">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Signal GPS
          <span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, borderRadius: 999, background: sig.dot, border: "1px solid var(--line-forte)" }} />
          <span className="sr-only">{sig.nom}</span>
        </span>
        <select className="champ" style={{ minHeight: 40 }} value={props.sim.precision} onChange={(e) => props.setSim((s) => ({ ...s, precision: Number(e.target.value) }))} aria-label="Précision GPS simulée">
          {SIGNAUX.map((s) => <option key={s.m} value={s.m}>{s.nom}</option>)}
        </select>
        <span>partie <input className="champ" style={{ minHeight: 40 }} value={props.sessionId} onChange={(e) => props.setSessionId(e.target.value)} size={10} aria-label="Identifiant de session" /></span>
        <button className="btn" onClick={props.nouvelleSession}><Icon name="ajouter" size={15} /> Nouvelle partie</button>
        <span>temps +<input className="champ w-16" style={{ minHeight: 40 }} type="number" value={props.sim.dtMin} onChange={(e) => props.setSim((s) => ({ ...s, dtMin: Number(e.target.value) }))} aria-label="Temps écoulé en minutes" /> min</span>
      </div>
      {pools.map((p) => (
        <div key={p.id}>Tirage {p.id} → [{(props.draws[p.id] ?? []).join(",")}]
          <select className="champ" style={{ minHeight: 40 }} value={props.forced[p.id] ?? ""} onChange={(e) => props.setForced({ ...props.forced, [p.id]: e.target.value })} aria-label={`Forcer le tirage ${p.id}`}>
            <option value="">tirage libre</option>{p.randomPool!.candidates.map((c) => <option key={c} value={c}>forcer {c}</option>)}
          </select></div>
      ))}
      <div>File d'attente : {props.file.length ? props.file.join(", ") : "—"} | Ouverte : {props.activeId ?? "—"}</div>
      {props.activeId && (
        <div className="flex gap-1"><button className="btn-primaire" onClick={() => props.terminer(props.activeId!, false)}><Icon name="valider" size={15} /> Terminer</button>
          <button className="btn" onClick={() => props.terminer(props.activeId!, true)}>Abandonner</button></div>
      )}
      <div className="max-h-32 overflow-auto carte" style={{ boxShadow: "none" }}>
        {game.nodes.filter((n) => !n.randomPool).map((n) => (
          <div key={n.id} className="flex gap-1 items-center px-1" style={{ minHeight: 44 }}>
            <button className="btn" style={{ minHeight: 36 }} onClick={() => props.ouvrir(n.id)} disabled={!props.file.includes(n.id) && props.activeId !== n.id}>ouvrir</button>
            {" "}{n.id}
            <label className="text-xs"><input type="checkbox" checked={props.sim.present.includes(n.id)} onChange={() => bascule("present", n.id)} /> ici</label>
            <label className="text-xs"><input type="checkbox" checked={props.sim.dwell.includes(n.id)} onChange={() => bascule("dwell", n.id)} /> reste</label>
            <label className="text-xs"><input type="checkbox" checked={props.sim.through.includes(n.id)} onChange={() => bascule("through", n.id)} /> traverse</label>
          </div>
        ))}
      </div>
      <button className="btn" onClick={props.testerBranches}><Icon name="choix" size={15} /> Tout tester en 1 clic</button>
      {props.testAll && <div className="text-xs">{props.testAll}</div>}
      <div className="max-h-24 overflow-auto text-xs"><b>Journal</b><ul>{props.log.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
    </div>
  );
}
