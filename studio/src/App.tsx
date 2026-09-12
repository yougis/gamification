import { useEffect, useMemo, useReducer, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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

export default function App() {
  const [st, dispatch] = useReducer(reduce, init);
  const { game } = st.present;
  const [sel, setSel] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [rapport, setRapport] = useState<string[]>([]);
  const [animateur, setAnimateur] = useState(false);
  const [manifest, setManifest] = useState<ManifestFile[]>([]);
  const [nouveauType, setNouveauType] = useState("GEOFENCE");
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

  const edit = (fn: (s: Snap) => Snap) => dispatch({ t: "set", snap: fn(st.present) });
  const editGame = (fn: (g: Game) => Game) => edit((s) => ({ ...s, game: fn(s.game) }));
  const etape: GameNode | undefined = game.nodes.find((n) => n.id === sel);
  const impasses = useMemo(() => new Set(deadEnds(game)), [game]);

  const noeuds: Node[] = useMemo(
    () =>
      game.nodes.map((n, i) => ({
        id: n.id,
        position: positions[n.id] ?? { x: (i % 4) * 240, y: Math.floor(i / 4) * 150 },
        data: { label: `${n.id} · ${MODULES_FR[n.module.type]?.nom ?? n.module.type}${n.isEnding ? " · FIN" : ""}` },
        style: n.isEnding
          ? { border: "3px solid #9a6700", background: "#fff8e1" }
          : n.module.type === "RANDOM_POOL"
            ? { border: "2px dashed #8250df" }
            : impasses.has(n.id)
              ? { border: "2px solid #cf222e" }
              : {},
      })),
    [game.nodes, positions, impasses],
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
            animated: impasse, style: impasse ? { stroke: "#cf222e", strokeWidth: 2 } : {},
          });
        }
      }
    }
    return edges;
  }, [game.nodes, impasses]);

  const onNodesChange = (changes: NodeChange[]) => {
    const nodes = applyNodeChanges(changes, noeuds);
    const pos: Record<string, { x: number; y: number }> = { ...positions };
    for (const n of nodes) pos[n.id] = n.position;
    setPositions(pos);
  };
  const onConnect = (c: Connection) => {
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

  const valider = () => {
    const v = validateGame(game);
    setRapport(v.layers.flatMap((l) => (l.errors.length ? l.errors.map(erreurFR) : [`Couche ${l.layer} : OK`])));
  };
  useEffect(() => {
    const v = validateGame(game);
    setRapport(v.layers.flatMap((l) => (l.errors.length ? l.errors.map(erreurFR) : [`Couche ${l.layer} : OK`])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const ajouterEtape = (preset: "etape" | "tirage" | "fin" | "lieu") => {
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
      setRapport(r.errors.map(erreurFR));
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

  return (
    <div className="flex h-screen flex-col font-sans text-sm text-neutral-900 bg-white">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <strong className="text-base">GeoPlay Studio</strong>
        <input className="border rounded px-2 py-2" value={game.gameId} size={20}
          onChange={(e) => editGame((g) => ({ ...g, gameId: e.target.value }))} aria-label="Nom du jeu" />
        <span className="flex-1" />
        <button className="btn-primaire" onClick={valider}>Valider</button>
        <button className="border rounded px-3" onClick={chargerFixture}>Charger l'exemple</button>
        <button className="btn-primaire" onClick={exporter}>Exporter le pack</button>
        <label className="flex items-center gap-1"><input type="checkbox" checked={animateur} onChange={(e) => setAnimateur(e.target.checked)} /> animateur</label>
        <button className="border rounded px-3" onClick={() => dispatch({ t: "undo" })} disabled={!st.past.length}>Annuler</button>
        <button className="border rounded px-3" onClick={() => dispatch({ t: "redo" })} disabled={!st.future.length}>Rétablir</button>
      </header>
      <div className="flex flex-1 min-h-0">
        <nav className="w-44 shrink-0 border-r p-2 flex flex-col gap-2" aria-label="Blocs">
          <span className="text-xs uppercase text-neutral-500">Ajouter</span>
          <button className="border rounded px-3 text-left" onClick={() => ajouterEtape("etape")}>+ Étape de jeu</button>
          <button className="border rounded px-3 text-left" onClick={() => ajouterEtape("lieu")}>+ Lieu GPS</button>
          <button className="border rounded px-3 text-left" onClick={() => ajouterEtape("tirage")}>+ Tirage au sort</button>
          <button className="border rounded px-3 text-left" onClick={() => ajouterEtape("fin")}>+ Fin du jeu</button>
          <span className="text-xs text-neutral-500">Glisse un lien d'une étape à l'autre pour « après l'étape… ».</span>
        </nav>
        <main className="flex-[3] flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <ReactFlow nodes={noeuds} edges={aretes} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(_, n) => setSel(n.id)} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          </div>
          <footer className="border-t px-3 py-2 text-xs flex gap-4 flex-wrap" aria-label="État du jeu">
            <span>{erreurs.length ? `⚠ ${erreurs.length} problème(s)` : "● Valide" }</span>
            <span>{nbEtapes} étape(s)</span>
            <span>{finPresente ? "Fin présente" : "⚠ Pas de fin (Fin du jeu requise)"}</span>
            {impasses.size > 0 && <span className="text-red-700">⚠ {impasses.size} impasse(s) en rouge : {[...impasses].join(", ")}</span>}
            <span>{manifest.length} fichier(s) au manifest</span>
          </footer>
          {erreurs.length > 0 && (
            <ul className="border-t max-h-28 overflow-auto px-6 py-2 text-xs">{erreurs.map((r, i) => <li key={i}>{r}</li>)}</ul>
          )}
        </main>
        <aside className="flex-[2] border-l overflow-auto p-2 flex flex-col gap-3 min-w-0" aria-label="Inspecteur">
          {etape ? (
            <Inspecteur
              game={game} node={etape} meta={st.present.meta} editGame={editGame} edit={edit}
              nouveauType={nouveauType} setNouveauType={setNouveauType}
            />
          ) : (
            <i>Sélectionne une étape (clic sur le canvas).</i>
          )}
          <ManifestForm manifest={manifest} setManifest={setManifest} />
          <I18nPanel meta={st.present.meta} edit={edit} />
          <ReviewOverlay game={game} meta={st.present.meta} />
          <Apercu
            game={game} sim={sim} setSim={setSim} file={file} activeId={activeId}
            ouvrir={ouvrir} terminer={terminer} draws={draws} forced={forced} setForced={setForced}
            log={log} testAll={testAll} testerBranches={testerBranches} sessionId={sessionId}
            setSessionId={setSessionId} nouvelleSession={nouvelleSession}
          />
        </aside>
      </div>
    </div>
  );
}

function Famille({ titre, aide, children }: { titre: string; aide: string; children: React.ReactNode }) {
  return (
    <details open className="border rounded">
      <summary className="cursor-pointer px-2 py-2 font-semibold">{titre}</summary>
      <div className="px-2 pb-2 flex flex-col gap-2">
        <span className="text-xs text-neutral-500">{aide}</span>
        {children}
      </div>
    </details>
  );
}

function Inspecteur({ game, node, meta, editGame, edit, nouveauType, setNouveauType }: {
  game: Game; node: GameNode; meta: StudioMeta;
  editGame: (fn: (g: Game) => Game) => void;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  nouveauType: string; setNouveauType: (s: string) => void;
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
      <h3 className="font-bold">{node.id}</h3>
      <Famille titre={FAMILLES[0].titre} aide={FAMILLES[0].aide}>
        <label>Mini-jeu <select className="border rounded px-2 py-2" value={node.module.type} onChange={(e) => upd({ module: { ...node.module, type: e.target.value } })}>
          {Object.entries(MODULES_FR).map(([k, v]) => <option key={k} value={k} title={v.aide}>{v.nom}</option>)}
        </select></label>
        {node.module.type === "QUIZ" && (
          <div>
            {(Array.isArray(node.module.data.questions) ? node.module.data.questions as { q?: string }[] : []).map((q, i) => (
              <div key={i} className="flex gap-1">
                <input className="border rounded px-2 py-2 flex-1" value={q.q ?? ""} size={24} placeholder={`Question ${i + 1}`}
                  onChange={(e) => {
                    const questions = [...(node.module.data.questions as { q?: string }[])];
                    questions[i] = { q: e.target.value };
                    upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
                  }} />
                <button className="border rounded px-3" onClick={() => {
                  const questions = (node.module.data.questions as { q?: string }[]).filter((_, j) => j !== i);
                  upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
                }}>x</button>
              </div>
            ))}
            <button className="border rounded px-3" onClick={() => {
              const questions = [...(Array.isArray(node.module.data.questions) ? node.module.data.questions as { q?: string }[] : []), { q: "" }];
              upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
            }}>+ Question</button>
          </div>
        )}
        <details><summary className="cursor-pointer text-xs">Données expertes (JSON)</summary>
          <textarea rows={3} className="w-full border rounded font-mono text-xs" value={JSON.stringify(node.module.data)} onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value) as Record<string, unknown>;
              if (data && typeof data === "object") upd({ module: { ...node.module, data } });
            } catch { /* frappe en cours */ }
          }} />
        </details>
      </Famille>
      <Famille titre={FAMILLES[1].titre} aide={FAMILLES[1].aide}>
        <label>Logique <select className="border rounded px-2 py-2" value={node.activation.operator ?? ""} onChange={(e) => upd({ activation: { ...node.activation, operator: (e.target.value || undefined) as GameNode["activation"]["operator"] } })}>
          <option value="">— (1 seul déclencheur)</option>
          <option value="AND">{OPERATEURS_FR.AND}</option>
          <option value="OR">{OPERATEURS_FR.OR}</option>
        </select></label>
        <div className="flex gap-1">
          <select className="border rounded px-2 py-2" value={nouveauType} onChange={(e) => setNouveauType(e.target.value)}>
            {TYPES_CONDITION.map((c) => <option key={c} value={c} title={CONDITIONS_FR[c]?.aide}>{CONDITIONS_FR[c]?.nom ?? c}</option>)}
          </select>
          <button className="border rounded px-3" onClick={ajoutDecl}>+ Déclencheur</button>
        </div>
        {node.activation.requires.map((c, i) => (
          <div key={i} className="border rounded p-1">
            <b>{CONDITIONS_FR[c.type]?.nom ?? c.type}</b> <button className="border rounded px-2" onClick={() => supprDecl(i)}>x</button>
            <ChampsDecl game={game} c={c} upd={(p) => updDecl(i, p)} />
          </div>
        ))}
      </Famille>
      <Famille titre={FAMILLES[2].titre} aide={FAMILLES[2].aide}>
        <label className="flex items-center gap-1"><input type="checkbox" checked={node.activation.latch ?? true} onChange={(e) => upd({ activation: { ...node.activation, latch: e.target.checked } })} /> Rester ouvert après passage</label>
        <label>Rejouable <select className="border rounded px-2 py-2" value={node.onReentry ?? "ignore"} onChange={(e) => upd({ onReentry: e.target.value as GameNode["onReentry"] })}>
          <option value="ignore">Non (une fois)</option><option value="replay">Oui</option>
        </select></label>
        {node.onReentry === "replay" && (
          <label>Rejouées max <input className="border rounded px-2 py-2 w-16" type="number" min={1} value={node.maxReentries ?? 1} onChange={(e) => upd({ maxReentries: Number(e.target.value) })} /></label>
        )}
        <label className="flex items-center gap-1"><input type="checkbox" checked={!!node.scoreOnReplay} onChange={(e) => upd({ scoreOnReplay: e.target.checked })} /> Les rejouées marquent des points</label>
        <label className="flex items-center gap-1 font-semibold"><input type="checkbox" checked={!!node.isEnding} onChange={(e) => upd({ isEnding: e.target.checked })} /> Fin du jeu</label>
      </Famille>
      <Famille titre={FAMILLES[3].titre} aide={FAMILLES[3].aide}>
        {node.module.type === "RANDOM_POOL" || node.randomPool ? (
          <div className="flex flex-col gap-1">
            <label>Nombre tiré <input className="border rounded px-2 py-2 w-16" type="number" min={1} value={node.randomPool?.drawCount ?? 1}
              onChange={(e) => upd({ randomPool: { candidates: node.randomPool?.candidates ?? [], drawCount: Number(e.target.value), drawTiming: node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION" } })} /></label>
            <label>Moment <select className="border rounded px-2 py-2" value={node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION"} onChange={(e) => upd({ randomPool: { candidates: node.randomPool?.candidates ?? [], drawCount: node.randomPool?.drawCount ?? 1, drawTiming: e.target.value as "ON_POOL_ACTIVATION" | "ON_GAME_START" } })}>
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
          <button className="border rounded px-3" onClick={() => upd({ randomPool: { candidates: [], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" } })}>Transformer en tirage</button>
        )}
      </Famille>
      <Famille titre={FAMILLES[4].titre} aide={FAMILLES[4].aide}>
        <label>Statut <select className="border rounded px-2 py-2" value={st} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, status: { ...s.meta.status, [node.id]: { state: e.target.value as StudioMeta["status"][string]["state"] } } } }))}>
          {Object.entries(ETATS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Fournisseur <input className="border rounded px-2 py-2" size={12} value={meta.provenance[node.id]?.providerId ?? ""} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, provenance: { ...s.meta.provenance, [node.id]: { providerId: e.target.value, license: s.meta.provenance[node.id]?.license ?? "", sourceUrl: s.meta.provenance[node.id]?.sourceUrl ?? "" } } } }))} placeholder="Qui fournit le contenu ?" /></label>
        <label>Milieu <select className="border rounded px-2 py-2" value={milieu} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, milieu: { ...s.meta.milieu, [node.id]: e.target.value as Milieu } } }))}>
          {Object.entries(MILIEUX).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}
        </select></label>
        <i className="text-xs text-neutral-500">Conseil : {MILIEUX[milieu].reco}</i>
        {node.activation.requires.some((c) => c.type === "PROXIMITY_MASTER") && (
          <button className="border rounded px-3" onClick={() => {
            try {
              editGame((g) => addSecoursCode(g, node.id));
            } catch (e) {
              alert(String(e));
            }
          }}>+ Secours par code</button>
        )}
        <details><summary className="cursor-pointer text-xs">Options expertes (JSON)</summary>
          <textarea rows={2} className="w-full border rounded font-mono text-xs" defaultValue={JSON.stringify(meta.overrides[node.id] ?? {})} key={node.id} onBlur={(e) => {
            try {
              const patch = JSON.parse(e.target.value) as Record<string, unknown>;
              if (patch && typeof patch === "object") {
                edit((s) => ({ ...s, meta: { ...s.meta, overrides: { ...s.meta.overrides, [node.id]: patch as StudioMeta["overrides"][string] } } }));
              }
            } catch { alert("Options invalides (JSON)"); }
          }} />
        </details>
      </Famille>
    </div>
  );
}

function ChampsDecl({ game, c, upd }: { game: Game; c: Condition; upd: (p: Partial<Condition>) => void }) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  switch (c.type) {
    case "GEOFENCE":
      return (
        <span className="flex flex-wrap gap-1 items-center">
          lat <input className="border rounded px-1 py-2 w-20" type="number" step="any" value={c.lat ?? ""} onChange={(e) => upd({ lat: num(e.target.value) })} />
          lng <input className="border rounded px-1 py-2 w-20" type="number" step="any" value={c.lng ?? ""} onChange={(e) => upd({ lng: num(e.target.value) })} />
          rayon <input className="border rounded px-1 py-2 w-16" type="number" value={c.radiusMeters ?? ""} onChange={(e) => upd({ radiusMeters: num(e.target.value) })} /> m
          {PRESETS_RAYON.map((p) => (
            <button key={p.nom} title={p.aide} className="border rounded px-2" onClick={() => upd({ radiusMeters: p.metres })}>{p.nom} {p.metres}m</button>
          ))}
          Quand <select className="border rounded px-1 py-2" value={c.predicate ?? "enter"} onChange={(e) => upd({ predicate: e.target.value as Predicate })}>
            <option value="enter">on entre</option><option value="exit">on sort</option><option value="dwell">on reste</option><option value="through">on traverse</option>
          </select>
          rester <input className="border rounded px-1 py-2 w-16" type="number" value={(c.dwellMs ?? "") as number | string} onChange={(e) => upd({ dwellMs: num(e.target.value) })} placeholder="ms" />
        </span>
      );
    case "PROXIMITY_MASTER":
      return (
        <span className="flex flex-wrap gap-1 items-center">
          animateur <input className="border rounded px-1 py-2" value={c.masterId ?? ""} onChange={(e) => upd({ masterId: e.target.value })} size={10} />
          <button className="border rounded px-2" title="Changer d'identifiant (révoque l'ancien)" onClick={() => upd({ masterId: `m-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}` })}>↻</button>
          lien <select className="border rounded px-1 py-2" value={c.transport ?? "ble"} onChange={(e) => upd({ transport: e.target.value as "ble" | "wifi" })}>
            <option value="ble">Bluetooth</option><option value="wifi">Wi-Fi</option>
          </select>
          seuil <input className="border rounded px-1 py-2 w-16" type="number" value={c.minRssiDbm ?? ""} onChange={(e) => upd({ minRssiDbm: num(e.target.value) })} />
        </span>
      );
    case "NODE_COMPLETED":
      return (
        <span>après <select className="border rounded px-1 py-2" value={c.nodeId ?? ""} onChange={(e) => upd({ nodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select> <label><input type="checkbox" checked={!!c.allowCycle} onChange={(e) => upd({ allowCycle: e.target.checked })} /> retour autorisé</label></span>
      );
    case "TIMER":
      return (
        <span>attendre <input className="border rounded px-1 py-2 w-16" type="number" value={c.delaySeconds ?? ""} onChange={(e) => upd({ delaySeconds: num(e.target.value) })} /> s depuis
          <select className="border rounded px-1 py-2" value={c.anchor ?? "GAME_START"} onChange={(e) => upd({ anchor: e.target.value as "GAME_START" | "NODE_COMPLETION" })}>
            <option value="GAME_START">le démarrage</option><option value="NODE_COMPLETION">la fin de…</option>
          </select>
          {c.anchor === "NODE_COMPLETION" && <select className="border rounded px-1 py-2" value={c.anchorNodeId ?? ""} onChange={(e) => upd({ anchorNodeId: e.target.value })}>
            <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>}</span>
      );
    case "POOL_DRAWN":
      return (
        <span>tirée par <select className="border rounded px-1 py-2" value={c.poolNodeId ?? ""} onChange={(e) => upd({ poolNodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.filter((m) => m.randomPool).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select></span>
      );
    default:
      return <i>Réservé (non utilisé pour l'instant)</i>;
  }
}

function ManifestForm({ manifest, setManifest }: { manifest: ManifestFile[]; setManifest: (m: ManifestFile[]) => void }) {
  const [f, setF] = useState({ path: "assets/x.png", version: "1.0.0", size: 1024, sha256: "" });
  return (
    <div>
      <b>Fichiers du pack ({manifest.length})</b>
      <ul>{manifest.map((m) => <li key={m.path}>{m.path} v{m.version} {m.size}o {m.sha256.slice(0, 8)}…</li>)}</ul>
      <div className="flex flex-wrap gap-1">
        <input className="border rounded px-1 py-2" value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} size={14} />
        <input className="border rounded px-1 py-2" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} size={7} />
        <input className="border rounded px-1 py-2 w-20" type="number" value={f.size} onChange={(e) => setF({ ...f, size: Number(e.target.value) })} />
        <input className="border rounded px-1 py-2" value={f.sha256} onChange={(e) => setF({ ...f, sha256: e.target.value })} size={12} placeholder="sha256" />
        <button className="border rounded px-3" onClick={() => { try { setManifest(registerAsset(manifest, f)); } catch (e) { alert(String(e)); } }}>+ Fichier</button>
      </div>
    </div>
  );
}

function I18nPanel({ meta, edit }: {
  meta: StudioMeta;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div>
      <b>Textes et traductions</b>
      {meta.i18n.map((row, i) => (
        <div key={i} className="flex gap-1">
          <input className="border rounded px-1 py-2" value={row.key} size={12} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)) } }))} />
          <input className="border rounded px-1 py-2 flex-1" value={row.value} size={16} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) } }))} />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.locked} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, locked: e.target.checked } : r)) } }))} /> verrou</label>
        </div>
      ))}
      <div className="flex gap-1">
        <button className="border rounded px-3" onClick={() => edit((s) => ({ ...s, meta: { ...s.meta, i18n: [...s.meta.i18n, { key: `texte${s.meta.i18n.length + 1}`, value: "", locked: false }] } }))}>+ Texte</button>
        <button className="border rounded px-3" onClick={() => {
          const kept = meta.i18n.filter((r) => r.locked).map((r) => r.key);
          edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r) => (r.locked ? r : { ...r, value: r.value ? `${r.value} (EN)` : r.value })) } }));
          setNote(`Verrouillés conservés : ${kept.join(", ") || "—"}`);
        }}>Simuler une retraduction</button>
      </div>
      {note && <div className="text-xs">{note}</div>}
    </div>
  );
}

function ReviewOverlay({ game, meta }: { game: Game; meta: StudioMeta }) {
  const diffs = game.nodes.filter((n) => n.module.type === "DIFFERENCE_GAME");
  if (!diffs.length) return null;
  return (
    <div>
      <b>Relecture 7 erreurs (calques)</b>
      {diffs.map((n) => {
        const d = n.module.data as { source?: string; derivee?: string; polygons?: { x: number; y: number; w: number; h: number }[] };
        const polys = d.polygons ?? [];
        const statut = meta.status[n.id]?.state ?? "draft";
        return (
          <div key={n.id} className="border rounded p-1 my-1">
            {n.id} — {ETATS_FR[statut]} — {polys.length} zone(s)
            <div className="relative w-full bg-neutral-800 text-white text-xs" style={{ paddingTop: "56%" }}>
              <span className="absolute top-0 left-1">{String(d.source ?? "image source ?")}</span>
              {polys.map((p, i) => (
                <div key={i} className="absolute border-2 border-yellow-300" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SIGNAUX = [
  { m: 5, nom: "Bon (5 m)", dot: "bg-green-600" },
  { m: 15, nom: "Moyen (15 m)", dot: "bg-orange-500" },
  { m: 40, nom: "Faible (40 m)", dot: "bg-red-600" },
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
    <div className="flex flex-col gap-2">
      <h3 className="font-bold">Essai du parcours (mode triche)</h3>
      <div className="flex gap-1 items-center flex-wrap">
        <span>Signal GPS <span className={`inline-block w-3 h-3 rounded-full ${sig.dot}`} title={sig.nom} /></span>
        <select className="border rounded px-1 py-2" value={props.sim.precision} onChange={(e) => props.setSim((s) => ({ ...s, precision: Number(e.target.value) }))}>
          {SIGNAUX.map((s) => <option key={s.m} value={s.m}>{s.nom}</option>)}
        </select>
        <span>partie <input className="border rounded px-1 py-2" value={props.sessionId} onChange={(e) => props.setSessionId(e.target.value)} size={10} /></span>
        <button className="border rounded px-3" onClick={props.nouvelleSession}>Nouvelle partie</button>
        <span>temps +<input className="border rounded px-1 py-2 w-16" type="number" value={props.sim.dtMin} onChange={(e) => props.setSim((s) => ({ ...s, dtMin: Number(e.target.value) }))} /> min</span>
      </div>
      {pools.map((p) => (
        <div key={p.id}>Tirage {p.id} → [{(props.draws[p.id] ?? []).join(",")}]
          <select className="border rounded px-1 py-2" value={props.forced[p.id] ?? ""} onChange={(e) => props.setForced({ ...props.forced, [p.id]: e.target.value })}>
            <option value="">tirage libre</option>{p.randomPool!.candidates.map((c) => <option key={c} value={c}>forcer {c}</option>)}
          </select></div>
      ))}
      <div>File d'attente : {props.file.length ? props.file.join(", ") : "—"} | Ouverte : {props.activeId ?? "—"}</div>
      {props.activeId && (
        <div className="flex gap-1"><button className="btn-primaire" onClick={() => props.terminer(props.activeId!, false)}>Terminer</button>
          <button className="border rounded px-3" onClick={() => props.terminer(props.activeId!, true)}>Abandonner</button></div>
      )}
      <div className="max-h-32 overflow-auto border rounded">
        {game.nodes.filter((n) => !n.randomPool).map((n) => (
          <div key={n.id} className="flex gap-1 items-center px-1">
            <button className="border rounded px-2" onClick={() => props.ouvrir(n.id)} disabled={!props.file.includes(n.id) && props.activeId !== n.id}>ouvrir</button>
            {" "}{n.id}
            <label className="text-xs"><input type="checkbox" checked={props.sim.present.includes(n.id)} onChange={() => bascule("present", n.id)} /> ici</label>
            <label className="text-xs"><input type="checkbox" checked={props.sim.dwell.includes(n.id)} onChange={() => bascule("dwell", n.id)} /> reste</label>
            <label className="text-xs"><input type="checkbox" checked={props.sim.through.includes(n.id)} onChange={() => bascule("through", n.id)} /> traverse</label>
          </div>
        ))}
      </div>
      <button className="border rounded px-3" onClick={props.testerBranches}>Tout tester en 1 clic</button>
      {props.testAll && <div className="text-xs">{props.testAll}</div>}
      <div className="max-h-24 overflow-auto text-xs"><b>Journal</b><ul>{props.log.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
    </div>
  );
}
