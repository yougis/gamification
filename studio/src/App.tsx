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
import { validateGame } from "./game/validate";
import { evaluate, drawPool, type Sim } from "./game/evaluate";
import { composeNodes, setActivation, registerAsset, exportPack, addSecoursCode, type ManifestFile } from "./game/mcp";
import { emptyMeta, type Condition, type Game, type GameNode, type Predicate, type StudioMeta } from "./game/types";

type Snap = { game: Game; meta: StudioMeta };
interface State {
  past: Snap[];
  present: Snap;
  future: Snap[];
}

const blankGame = (): Game => ({
  gameId: "nouveau-jeu",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  branding: {},
  global: { gpsRadiusMeters: 30 },
  nodes: [],
});

const init: State = { past: [], present: { game: blankGame(), meta: emptyMeta() }, future: [] };

type Action =
  | { t: "set"; snap: Snap }
  | { t: "undo" }
  | { t: "redo" };

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

const MODULES = ["INFO", "QUIZ", "DIFFERENCE_GAME", "PUZZLE", "AR_MARKER", "BOUSSOLE", "RANDOM_POOL"];
const CONDS = ["GEOFENCE", "NODE_COMPLETED", "TIMER", "POOL_DRAWN", "PROXIMITY_MASTER", "CONDITIONAL", "WINDOW"];

const blankCond = (type: string): Condition => {
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

const refOf = (c: Condition): string | undefined =>
  c.type === "NODE_COMPLETED" ? c.nodeId : c.type === "POOL_DRAWN" ? c.poolNodeId : undefined;

export default function App() {
  const [st, dispatch] = useReducer(reduce, init);
  const { game } = st.present;
  const [sel, setSel] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [report, setReport] = useState<string[]>([]);
  const [animator, setAnimator] = useState(false);
  const [manifest, setManifest] = useState<ManifestFile[]>([]);
  const [newCondType, setNewCondType] = useState("GEOFENCE");
  // --- preview ---
  const [sessionId, setSessionId] = useState("session-1");
  const [sim, setSim] = useState({ present: [] as string[], dwell: [] as string[], through: [] as string[], dtMin: 0 });
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
  const selNode: GameNode | undefined = game.nodes.find((n) => n.id === sel);

  const flowNodes: Node[] = useMemo(
    () =>
      game.nodes.map((n, i) => ({
        id: n.id,
        position: positions[n.id] ?? { x: (i % 4) * 220, y: Math.floor(i / 4) * 140 },
        data: { label: `${n.id}${n.isEnding ? " (FIN)" : ""} [${n.module.type}]` },
        style: n.isEnding ? { border: "2px solid #1a7f37" } : n.module.type === "RANDOM_POOL" ? { border: "2px dashed #8250df" } : {},
      })),
    [game.nodes, positions],
  );
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (const n of game.nodes) {
      for (const c of n.activation.requires) {
        const from = refOf(c) ?? (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" ? c.anchorNodeId : undefined);
        if (from && game.nodes.some((m) => m.id === from)) {
          edges.push({ id: `${from}->${n.id}:${c.type}`, source: from, target: n.id, label: c.type });
        }
      }
    }
    return edges;
  }, [game.nodes]);

  const onNodesChange = (changes: NodeChange[]) => {
    const nodes = applyNodeChanges(changes, flowNodes);
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
          ...n.activation,
          requires,
          operator: n.activation.operator ?? (requires.length > 1 ? "AND" : undefined),
        }).nodes.find((m) => m.id === n.id)!;
      });
      return { ...g, nodes };
    });
  };

  const runValidate = () => {
    const v = validateGame(game);
    setReport(v.layers.flatMap((l) => (l.errors.length ? l.errors : [`couche ${l.layer} : OK`])));
  };
  useEffect(() => {
    const v = validateGame(game);
    setReport(v.layers.flatMap((l) => (l.errors.length ? l.errors : [`couche ${l.layer} : OK`])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const simObj = (): Sim => ({
    present: new Set(sim.present),
    dwellOk: new Set(sim.dwell),
    throughOk: new Set(sim.through),
    nowMs: sim.dtMin * 60000,
    completedAt: new Map(Object.entries(done)),
  });

  const doEval = (s: Sim) =>
    evaluate(game, s, draws, new Map(Object.entries(done)), new Map(Object.entries(counts)), new Set());

  const ev = doEval(simObj());
  const queue = activeId ? ev.unlocked.filter((id) => id !== activeId) : ev.unlocked;

  const addLog = (msg: string) => setLog((l) => [...l, `[${sessionId}] ${msg} (triche)`]);

  const openNode = (id: string) => {
    setActiveId(id);
    addLog(`ouverture ${id}`);
  };
  const completeNode = (id: string, abandon: boolean) => {
    const n = game.nodes.find((m) => m.id === id)!;
    const times = (counts[id] ?? 0) + 1;
    if (times > 1) {
      const used = replays[id] ?? 0;
      if (n.onReentry !== "replay" || used >= (n.maxReentries ?? 0)) {
        addLog(`${id} : retrigger ignore`);
        setActiveId(null);
        return;
      }
      setReplays((r) => ({ ...r, [id]: used + 1 }));
      if (!n.scoreOnReplay) addLog(`${id} : rejou sans score`);
    }
    setCounts((c) => ({ ...c, [id]: times }));
    if (!abandon) {
      setDone((d) => ({ ...d, [id]: sim.dtMin * 60000 }));
      addLog(`${id} : COMPLETED`);
      // tirages des pools devenus UNLOCKED : auto en preview
      const g = { ...game };
      const nextDraws = { ...draws };
      for (const p of g.nodes) {
        if (!p.randomPool || nextDraws[p.id]) continue;
        const poolOk = evalNodeActive(g, p.id);
        if (poolOk) {
          const f = forced[p.id] ? [forced[p.id]] : undefined;
          nextDraws[p.id] = drawPool(p, sessionId, f);
          addLog(`tirage ${p.id} -> ${nextDraws[p.id].join(",")}${f ? " (force)" : ""}`);
        }
      }
      setDraws(nextDraws);
    } else addLog(`${id} : abandon`);
    setActiveId(null);
  };

  // pool UNLOCKED ? (requires vrais hors GEOFENCE/PROXIMITY, simules par les boutons)
  const evalNodeActive = (g: Game, id: string): boolean => {
    const n = g.nodes.find((m) => m.id === id)!;
    const s = simObj();
    return n.activation.requires.every((c) => {
      if (c.type === "TIMER") return s.nowMs >= (c.delaySeconds ?? 0) * 1000;
      if (c.type === "NODE_COMPLETED") return (done[c.nodeId!] ?? -1) >= 0;
      if (c.type === "POOL_DRAWN") return (draws[c.poolNodeId!] ?? []).length > 0;
      return true; // GEOFENCE/PROXIMITY : le tirage suit l'UNLOCKED, la presence vient apres
    });
  };

  const newSession = () => {
    setDraws({});
    setDone({});
    setCounts({});
    setReplays({});
    setActiveId(null);
    setSim({ present: [], dwell: [], through: [], dtMin: 0 });
    addLog("nouvelle session");
  };

  const testBranches = () => {
    const pools = game.nodes.filter((n) => n.randomPool);
    if (!pools.length) {
      setTestAll("aucun pool : rien a tester");
      return;
    }
    const out: string[] = [];
    for (const p of pools) {
      for (const cand of p.randomPool!.candidates) {
        // session fraiche, tirage force, geofences simulees, completion en cascade
        let steps = 0;
        const s: Sim = {
          present: new Set(game.nodes.map((n) => n.id)),
          dwellOk: new Set(game.nodes.map((n) => n.id)),
          throughOk: new Set(game.nodes.map((n) => n.id)),
          nowMs: 3600000,
          completedAt: new Map(),
        };
        const localDone = new Map<string, number>();
        const localCount = new Map<string, number>();
        let progressed = true;
        while (progressed && steps < game.nodes.length * 3) {
          progressed = false;
          steps++;
          const r = evaluate(game, s, { [p.id]: [cand] }, localDone, localCount, new Set());
          const target = r.auto[0] ?? r.choice[0];
          if (!target) break;
          localDone.set(target, steps);
          localCount.set(target, 1);
          s.completedAt = localDone;
          progressed = true;
        }
        const fin = game.nodes.some((n) => n.isEnding && localDone.has(n.id));
        out.push(`${p.id}->${cand} : ${fin ? "FIN atteinte" : "BLOQUE"}`);
      }
    }
    setTestAll(out.join(" | "));
  };

  const doExport = async () => {
    const r = await exportPack(game, st.present.meta, manifest, animator);
    if (!r.ok) {
      setReport(r.errors);
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
    setReport([`export OK : game.json + manifest (${r.manifest!.files.length} fichiers) + studio-meta.json`]);
  };

  const loadFixture = async () => {
    const mod = await import("./game/game-5poi.json");
    const g = (mod as { default: Game }).default;
    edit((s) => ({ game: g, meta: { ...s.meta } }));
    setSel(null);
    newSession();
  };

  const toggleSim = (key: "present" | "dwell" | "through", id: string) =>
    setSim((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", fontSize: 13 }}>
      <div style={{ flex: 3, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 8, display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #ccc" }}>
          <button onClick={() => { const id = `n${game.nodes.length + 1}`; editGame((g) => composeNodes(g, [{ id, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } }, activation: { requires: [] } }])); setSel(id); }}>+ Nœud</button>
          <button onClick={() => dispatch({ t: "undo" })} disabled={!st.past.length}>Undo</button>
          <button onClick={() => dispatch({ t: "redo" })} disabled={!st.future.length}>Redo</button>
          <button onClick={runValidate}>Valider (C1+C2)</button>
          <button onClick={loadFixture}>Charger fixture 5 POI</button>
          <button onClick={doExport}>Exporter pack</button>
          <label><input type="checkbox" checked={animator} onChange={(e) => setAnimator(e.target.checked)} /> animateur</label>
          <span>session <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} size={10} /></span>
          <button onClick={newSession}>Nouvelle session</button>
        </div>
        <div style={{ flex: 1 }}>
          <ReactFlow nodes={flowNodes} edges={flowEdges} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(_, n) => setSel(n.id)} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <div style={{ borderTop: "1px solid #ccc", maxHeight: 140, overflow: "auto", padding: 8 }}>
          <b>Validation</b>
          <ul>{report.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      </div>
      <div style={{ flex: 2, borderLeft: "1px solid #ccc", overflow: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 12 }}>
        {selNode ? (
          <NodeForm game={game} node={selNode} meta={st.present.meta} editGame={editGame} edit={edit} newCondType={newCondType} setNewCondType={setNewCondType} />
        ) : (
          <i>Sélectionne un nœud (clic canvas). Glisse un lien pour ajouter NODE_COMPLETED.</i>
        )}
        <ManifestForm manifest={manifest} setManifest={setManifest} />
        <I18nPanel meta={st.present.meta} edit={edit} />
        <ReviewOverlay game={game} meta={st.present.meta} />
        <Preview
          game={game} sim={sim} toggleSim={toggleSim} setSim={setSim} queue={queue} activeId={activeId}
          openNode={openNode} completeNode={completeNode} draws={draws} forced={forced} setForced={setForced}
          log={log} testAll={testAll} testBranches={testBranches}
        />
      </div>
    </div>
  );
}

function NodeForm({ game, node, meta, editGame, edit, newCondType, setNewCondType }: {
  game: Game; node: GameNode; meta: StudioMeta;
  editGame: (fn: (g: Game) => Game) => void;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  newCondType: string; setNewCondType: (s: string) => void;
}) {
  const upd = (patch: Partial<GameNode>) => editGame((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)) }));
  const updCond = (i: number, patch: Partial<Condition>) =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== node.id) return n;
        const requires = n.activation.requires.map((c, j) => (j === i ? { ...c, ...patch } : c));
        return { ...n, activation: { ...n.activation, requires } };
      }),
    }));
  const delCond = (i: number) =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, activation: { ...n.activation, requires: n.activation.requires.filter((_, j) => j !== i) } } : n)),
    }));
  const addCond = () =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== node.id) return n;
        const requires = [...n.activation.requires, blankCond(newCondType)];
        return { ...n, activation: { ...n.activation, requires, operator: n.activation.operator ?? (requires.length > 1 ? "AND" : undefined) } };
      }),
    }));
  const st = meta.status[node.id]?.state ?? "draft";
  return (
    <div>
      <h3 style={{ margin: "4px 0" }}>{node.id}</h3>
      <label>module <select value={node.module.type} onChange={(e) => upd({ module: { ...node.module, type: e.target.value } })}>
        {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select></label>{" "}
      <label>isEnding <input type="checkbox" checked={!!node.isEnding} onChange={(e) => upd({ isEnding: e.target.checked })} /></label>{" "}
      <label>latch <input type="checkbox" checked={node.activation.latch ?? true} onChange={(e) => upd({ activation: { ...node.activation, latch: e.target.checked } })} /></label>
      <div>
        <label>operator <select value={node.activation.operator ?? ""} onChange={(e) => upd({ activation: { ...node.activation, operator: (e.target.value || undefined) as GameNode["activation"]["operator"] } })}>
          <option value="">—</option><option value="AND">AND</option><option value="OR">OR</option>
        </select></label>{" "}
        <label>onReentry <select value={node.onReentry ?? "ignore"} onChange={(e) => upd({ onReentry: e.target.value as GameNode["onReentry"] })}>
          <option value="ignore">ignore</option><option value="replay">replay</option>
        </select></label>{" "}
        {node.onReentry === "replay" && (
          <label>maxReentries <input type="number" min={1} value={node.maxReentries ?? 1} onChange={(e) => upd({ maxReentries: Number(e.target.value) })} style={{ width: 50 }} /></label>
        )}{" "}
        <label>scoreOnReplay <input type="checkbox" checked={!!node.scoreOnReplay} onChange={(e) => upd({ scoreOnReplay: e.target.checked })} /></label>
      </div>
      <div>
        <b>data module (JSON)</b>
        {node.module.type === "QUIZ" && (
          <div>
            {(Array.isArray(node.module.data.questions) ? node.module.data.questions as { q?: string }[] : []).map((q, i) => (
              <div key={i}>
                <input value={q.q ?? ""} size={30} placeholder={`question ${i + 1}`}
                  onChange={(e) => {
                    const questions = [...(node.module.data.questions as { q?: string }[])];
                    questions[i] = { q: e.target.value };
                    upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
                  }} />
                <button onClick={() => {
                  const questions = (node.module.data.questions as { q?: string }[]).filter((_, j) => j !== i);
                  upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
                }}>x</button>
              </div>
            ))}
            <button onClick={() => {
              const questions = [...(Array.isArray(node.module.data.questions) ? node.module.data.questions as { q?: string }[] : []), { q: "" }];
              upd({ module: { ...node.module, data: { ...node.module.data, questions } } });
            }}>+ question</button>
          </div>
        )}
        <textarea rows={3} style={{ width: "100%" }} value={JSON.stringify(node.module.data)} onChange={(e) => {
          try {
            const data = JSON.parse(e.target.value) as Record<string, unknown>;
            if (data && typeof data === "object") upd({ module: { ...node.module, data } });
          } catch { /* frappe en cours */ }
        }} />
      </div>
      <div>
        <b>requires ({node.activation.requires.length})</b>{" "}
        <select value={newCondType} onChange={(e) => setNewCondType(e.target.value)}>
          {CONDS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select> <button onClick={addCond}>+ condition</button>
        {node.activation.requires.map((c, i) => (
          <div key={i} style={{ border: "1px solid #ddd", margin: "4px 0", padding: 4 }}>
            <b>{c.type}</b> <button onClick={() => delCond(i)}>x</button>
            <CondFields game={game} nodeId={node.id} c={c} upd={(p) => updCond(i, p)} />
          </div>
        ))}
      </div>
      {node.module.type === "RANDOM_POOL" || node.randomPool ? (
        <div>
          <b>randomPool</b> drawCount <input type="number" min={1} value={node.randomPool?.drawCount ?? 1} style={{ width: 50 }}
            onChange={(e) => upd({ randomPool: { candidates: node.randomPool?.candidates ?? [], drawCount: Number(e.target.value), drawTiming: node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION" } })} />{" "}
          <select value={node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION"} onChange={(e) => upd({ randomPool: { candidates: node.randomPool?.candidates ?? [], drawCount: node.randomPool?.drawCount ?? 1, drawTiming: e.target.value as "ON_POOL_ACTIVATION" | "ON_GAME_START" } })}>
            <option value="ON_POOL_ACTIVATION">ON_POOL_ACTIVATION</option><option value="ON_GAME_START">ON_GAME_START</option>
          </select>
          <div>candidats : {game.nodes.filter((m) => m.id !== node.id).map((m) => (
            <label key={m.id} style={{ marginRight: 6 }}><input type="checkbox" checked={node.randomPool?.candidates.includes(m.id) ?? false}
              onChange={(e) => {
                const cur = node.randomPool?.candidates ?? [];
                const candidates = e.target.checked ? [...cur, m.id] : cur.filter((x) => x !== m.id);
                upd({ randomPool: { candidates, drawCount: node.randomPool?.drawCount ?? 1, drawTiming: node.randomPool?.drawTiming ?? "ON_POOL_ACTIVATION" } });
              }} />{m.id}</label>
          ))}</div>
        </div>
      ) : (
        <button onClick={() => upd({ randomPool: { candidates: [], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" } })}>+ randomPool</button>
      )}
      <div>
        <b>Studio</b> statut <select value={st} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, status: { ...s.meta.status, [node.id]: { state: e.target.value as StudioMeta["status"][string]["state"] } } } }))}>
          <option value="draft">draft</option><option value="reviewed">reviewed</option><option value="published">published</option>
        </select>{" "}
        provider <input size={10} value={meta.provenance[node.id]?.providerId ?? ""} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, provenance: { ...s.meta.provenance, [node.id]: { providerId: e.target.value, license: s.meta.provenance[node.id]?.license ?? "", sourceUrl: s.meta.provenance[node.id]?.sourceUrl ?? "" } } } }))} placeholder="providerId" />
      </div>
      <div>
        <b>Milieu</b> <select value={meta.milieu[node.id] ?? "exterieur"} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, milieu: { ...s.meta.milieu, [node.id]: e.target.value as StudioMeta["milieu"][string] } } }))}>
          <option value="exterieur">extérieur</option><option value="foret">forêt dense</option><option value="batiment-cave">bâtiment / cave</option>
        </select>{" "}
        <i>reco : {{
          exterieur: "GEOFENCE r=15-30m, dwell court",
          foret: "GEOFENCE élargi r=40-60m + dwell long, latch:true",
          "batiment-cave": "PROXIMITY_MASTER puis QR/code/AR/animateur en secours",
        }[meta.milieu[node.id] ?? "exterieur"]}</i>{" "}
        {node.activation.requires.some((c) => c.type === "PROXIMITY_MASTER") && (
          <button onClick={() => {
            try {
              editGame((g) => addSecoursCode(g, node.id));
            } catch (e) {
              alert(String(e));
            }
          }}>+ secours code</button>
        )}
      </div>
      <div>
        <b>overrides difficultés/modes (JSON)</b>
        <textarea rows={2} style={{ width: "100%" }} defaultValue={JSON.stringify(meta.overrides[node.id] ?? {})} key={node.id} onBlur={(e) => {
          try {
            const patch = JSON.parse(e.target.value) as Record<string, unknown>;
            if (patch && typeof patch === "object") {
              edit((s) => ({ ...s, meta: { ...s.meta, overrides: { ...s.meta.overrides, [node.id]: patch as StudioMeta["overrides"][string] } } }));
            }
          } catch { alert("JSON overrides invalide"); }
        }} />
      </div>
    </div>
  );
}

function CondFields({ game, nodeId, c, upd }: { game: Game; nodeId: string; c: Condition; upd: (p: Partial<Condition>) => void }) {
  void nodeId;
  const num = (v: string) => (v === "" ? undefined : Number(v));
  switch (c.type) {
    case "GEOFENCE":
    case "PROXIMITY_MASTER":
      return (
        <span>
          {c.type === "GEOFENCE" ? (
            <>lat <input type="number" step="any" value={c.lat ?? ""} onChange={(e) => upd({ lat: num(e.target.value) })} style={{ width: 70 }} />
              lng <input type="number" step="any" value={c.lng ?? ""} onChange={(e) => upd({ lng: num(e.target.value) })} style={{ width: 70 }} />
              r <input type="number" value={c.radiusMeters ?? ""} onChange={(e) => upd({ radiusMeters: num(e.target.value) })} style={{ width: 55 }} />
              pred <select value={c.predicate ?? "enter"} onChange={(e) => upd({ predicate: e.target.value as Predicate })}>
                <option value="enter">enter</option><option value="exit">exit</option><option value="dwell">dwell</option><option value="through">through</option>
              </select>
              dwellMs <input type="number" value={c.dwellMs ?? ""} onChange={(e) => upd({ dwellMs: num(e.target.value) })} style={{ width: 60 }} /></>
          ) : (
            <>masterId <input value={c.masterId ?? ""} onChange={(e) => upd({ masterId: e.target.value })} size={10} />
              <button title="rotation : révoque l'ancien identifiant" onClick={() => upd({ masterId: `m-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}` })}>↻</button>
              transport <select value={c.transport ?? "ble"} onChange={(e) => upd({ transport: e.target.value as "ble" | "wifi" })}>
                <option value="ble">ble</option><option value="wifi">wifi</option>
              </select>
              minRssi <input type="number" value={c.minRssiDbm ?? ""} onChange={(e) => upd({ minRssiDbm: num(e.target.value) })} style={{ width: 55 }} /></>
          )}
        </span>
      );
    case "NODE_COMPLETED":
      return (
        <span>node <select value={c.nodeId ?? ""} onChange={(e) => upd({ nodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select> <label>allowCycle <input type="checkbox" checked={!!c.allowCycle} onChange={(e) => upd({ allowCycle: e.target.checked })} /></label></span>
      );
    case "TIMER":
      return (
        <span>anchor <select value={c.anchor ?? "GAME_START"} onChange={(e) => upd({ anchor: e.target.value as "GAME_START" | "NODE_COMPLETION" })}>
          <option value="GAME_START">GAME_START</option><option value="NODE_COMPLETION">NODE_COMPLETION</option>
        </select> delay(s) <input type="number" value={c.delaySeconds ?? ""} onChange={(e) => upd({ delaySeconds: num(e.target.value) })} style={{ width: 60 }} />
          {c.anchor === "NODE_COMPLETION" && <> node <select value={c.anchorNodeId ?? ""} onChange={(e) => upd({ anchorNodeId: e.target.value })}>
            <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select></>}</span>
      );
    case "POOL_DRAWN":
      return (
        <span>pool <select value={c.poolNodeId ?? ""} onChange={(e) => upd({ poolNodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.filter((m) => m.randomPool).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select></span>
      );
    default:
      return <i>réserve non outillée</i>;
  }
}

function ManifestForm({ manifest, setManifest }: { manifest: ManifestFile[]; setManifest: (m: ManifestFile[]) => void }) {
  const [f, setF] = useState({ path: "assets/x.png", version: "1.0.0", size: 1024, sha256: "" });
  return (
    <div>
      <b>Manifest ({manifest.length})</b>
      <ul>{manifest.map((m) => <li key={m.path}>{m.path} v{m.version} {m.size}o {m.sha256.slice(0, 8)}…</li>)}</ul>
      <input value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} size={14} />
      <input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} size={7} />
      <input type="number" value={f.size} onChange={(e) => setF({ ...f, size: Number(e.target.value) })} style={{ width: 70 }} />
      <input value={f.sha256} onChange={(e) => setF({ ...f, sha256: e.target.value })} size={12} placeholder="sha256" />
      <button onClick={() => { try { setManifest(registerAsset(manifest, f)); } catch (e) { alert(String(e)); } }}>+ asset</button>
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
      <b>i18n (clés + verrouillage)</b>
      {meta.i18n.map((row, i) => (
        <div key={i}>
          <input value={row.key} size={12} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)) } }))} />
          <input value={row.value} size={18} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) } }))} />
          <label><input type="checkbox" checked={row.locked} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, locked: e.target.checked } : r)) } }))} /> lock</label>
        </div>
      ))}
      <button onClick={() => edit((s) => ({ ...s, meta: { ...s.meta, i18n: [...s.meta.i18n, { key: `k${s.meta.i18n.length + 1}`, value: "", locked: false }] } }))}>+ clé</button>{" "}
      <button onClick={() => {
        const kept = meta.i18n.filter((r) => r.locked).map((r) => r.key);
        edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r) => (r.locked ? r : { ...r, value: r.value ? `${r.value} (EN)` : r.value })) } }));
        setNote(`verrouillées conservées : ${kept.join(", ") || "—"}`);
      }}>Simuler retraduction EN</button>
      {note && <div>{note}</div>}
    </div>
  );
}

function ReviewOverlay({ game, meta }: { game: Game; meta: StudioMeta }) {
  const diffs = game.nodes.filter((n) => n.module.type === "DIFFERENCE_GAME");
  if (!diffs.length) return null;
  return (
    <div>
      <b>Relecture 7-erreurs (overlay)</b>
      {diffs.map((n) => {
        const d = n.module.data as { source?: string; derivee?: string; polygons?: { x: number; y: number; w: number; h: number }[] };
        const polys = d.polygons ?? [];
        return (
          <div key={n.id} style={{ border: "1px solid #ddd", margin: "4px 0", padding: 4 }}>
            {n.id} — statut {meta.status[n.id]?.state ?? "draft"} — {polys.length} polygone(s)
            <div style={{ position: "relative", width: "100%", paddingTop: "56%", background: "#222", color: "#fff", fontSize: 11 }}>
              <span style={{ position: "absolute", top: 2, left: 4 }}>{String(d.source ?? "source ?")}</span>
              {polys.map((p, i) => (
                <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, border: "2px solid #ff0" }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Preview(props: {
  game: Game; sim: { present: string[]; dwell: string[]; through: string[]; dtMin: number };
  toggleSim: (k: "present" | "dwell" | "through", id: string) => void;
  setSim: (fn: (s: { present: string[]; dwell: string[]; through: string[]; dtMin: number }) => { present: string[]; dwell: string[]; through: string[]; dtMin: number }) => void;
  queue: string[]; activeId: string | null;
  openNode: (id: string) => void; completeNode: (id: string, abandon: boolean) => void;
  draws: Record<string, string[]>; forced: Record<string, string>; setForced: (f: Record<string, string>) => void;
  log: string[]; testAll: string | null; testBranches: () => void;
}) {
  const { game } = props;
  const pools = game.nodes.filter((n) => n.randomPool);
  return (
    <div>
      <h3 style={{ margin: "4px 0" }}>Preview scriptée (triche)</h3>
      <div>temps +<input type="number" value={props.sim.dtMin} onChange={(e) => props.setSim((s) => ({ ...s, dtMin: Number(e.target.value) }))} style={{ width: 60 }} /> min</div>
      {pools.map((p) => (
        <div key={p.id}>pool {p.id} → [{(props.draws[p.id] ?? []).join(",")}]
          <select value={props.forced[p.id] ?? ""} onChange={(e) => props.setForced({ ...props.forced, [p.id]: e.target.value })}>
            <option value="">tirage libre</option>{p.randomPool!.candidates.map((c) => <option key={c} value={c}>forcer {c}</option>)}
          </select></div>
      ))}
      <div>file : {props.queue.length ? props.queue.join(", ") : "—"} | ACTIVE : {props.activeId ?? "—"}</div>
      {props.activeId && (
        <div><button onClick={() => props.completeNode(props.activeId!, false)}>Compléter</button>
          <button onClick={() => props.completeNode(props.activeId!, true)}>Abandonner</button></div>
      )}
      <div style={{ maxHeight: 120, overflow: "auto", border: "1px solid #eee" }}>
        {game.nodes.filter((n) => !n.randomPool).map((n) => (
          <div key={n.id}>
            <button onClick={() => props.openNode(n.id)} disabled={!props.queue.includes(n.id) && props.activeId !== n.id}>ouvrir</button>
            {" "}{n.id}
            <label><input type="checkbox" checked={props.sim.present.includes(n.id)} onChange={() => props.toggleSim("present", n.id)} /> ici</label>
            <label><input type="checkbox" checked={props.sim.dwell.includes(n.id)} onChange={() => props.toggleSim("dwell", n.id)} /> dwell</label>
            <label><input type="checkbox" checked={props.sim.through.includes(n.id)} onChange={() => props.toggleSim("through", n.id)} /> through</label>
          </div>
        ))}
      </div>
      <button onClick={props.testBranches}>Tester les branches (1 clic)</button>
      {props.testAll && <div>{props.testAll}</div>}
      <div style={{ maxHeight: 100, overflow: "auto" }}><b>events</b><ul>{props.log.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
    </div>
  );
}
