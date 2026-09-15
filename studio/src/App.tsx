import { useEffect, useMemo, useState, useReducer, useRef } from "react";
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
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { validateGame, deadEnds } from "./game/validate";
import { evaluate, drawPool, type Sim } from "./game/evaluate";
import { composeNodes, setActivation, registerAsset, exportPackFull, canExport, addSecoursCode, importGame, addObject, setObjects, setReview, type ManifestFile } from "./game/mcp";
import { emptyMeta, type Condition, type Game, type GameNode, type Predicate, type StudioMeta, type ExperienceStyle, type Branding, type GameMode, type Difficulty } from "./game/types";
import {
  MODULES_FR, CONDITIONS_FR, FAMILLES, PRESETS_RAYON, MILIEUX, ETATS_FR,
  OPERATEURS_FR, erreurFR, IMPORTER, type Milieu,
} from "./game/i18n-ui";
import registre from "./game/schema/registry.json";
import { MODULE_REGISTRY } from "./game/modules";

const TYPES_MODULE = ["INFO", ...Object.keys(registre), "RANDOM_POOL"];

// Mise en page par défaut (change studio-layout-revamp) : largeurs en px,
// bornées à l'usage (droite 280–640, liste 220–520), sections dépliées.
const LAYOUT_DEFAUT = {
  droite: 400,
  liste: 340,
  repliees: { graphe: false, liste: false, detail: false, essai: false },
};
type SectionPliable = keyof typeof LAYOUT_DEFAUT.repliees;

// Drill-down workflow → section (change studio-layout-revamp) :
// 1 Graphe → graphe, 2 Épreuves → détail, 3 Relecture → liste,
// 4 Validation → pied/rapport, 5 Export → essai (manifest avant export).
const SECTION_PAR_ETAPE: Record<EtapeWorkflow, string> = {
  1: "graphe",
  2: "detail",
  3: "liste",
  4: "validation",
  5: "essai",
};
import { Icon, type IconName } from "./components/icons";
import Splitter from "./components/Splitter";
import { WorkflowStepper, type EtapeWorkflow } from "./components/WorkflowStepper";
import { NodeList } from "./components/NodeList";

type Snap = { game: Game; meta: StudioMeta };
// Entrée d'historique : l'instantané + l'opération MCP nommée qui l'a produit
// (spec studio-onepage-spec §2.5 : pas de diff JSON opaque).
type Entree = { snap: Snap; op: string };
interface State { past: Entree[]; present: Snap; future: Entree[]; }

const jeuVide = (): Game => ({
  gameId: "nouvelle-enquete",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  branding: { name: "", primaryColor: "#1a7f37", secondaryColor: "#5f3dc4", fontFamily: "system-ui" },
  global: { gpsRadiusMeters: 30, navigationModel: "BASIC", presentation: ["MAP"], gameMode: "NORMAL", difficulty: "FAMILLE", experienceStyle: { preset: "BASIC" } },
  nodes: [],
});

const init: State = { past: [], present: { game: jeuVide(), meta: emptyMeta() }, future: [] };

type Action = { t: "set"; snap: Snap; op: string } | { t: "undo" } | { t: "redo" };

const reduce = (s: State, a: Action): State => {
  if (a.t === "undo") {
    if (!s.past.length) return s;
    const prev = s.past[s.past.length - 1];
    return { past: s.past.slice(0, -1), present: prev.snap, future: [{ snap: s.present, op: prev.op }, ...s.future] };
  }
  if (a.t === "redo") {
    if (!s.future.length) return s;
    const [next, ...rest] = s.future;
    return { past: [...s.past, { snap: s.present, op: next.op }], present: next.snap, future: rest };
  }
  return { past: [...s.past, { snap: s.present, op: a.op }], present: a.snap, future: [] };
};

const TYPES_CONDITION = ["GEOFENCE", "NODE_COMPLETED", "TIMER", "POOL_DRAWN", "PROXIMITY_MASTER", "CONDITIONAL", "WINDOW", "ITEM_REQUIRED", "ITEM_USED", "CODE_INPUT", "CLUE_RESOLVED"];

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
    case "ITEM_REQUIRED":
      return { type: "ITEM_REQUIRED", itemId: "" };
    case "ITEM_USED":
      return { type: "ITEM_USED", itemId: "", consumed: true };
    case "CODE_INPUT":
      return { type: "CODE_INPUT", code: "" };
    case "CLUE_RESOLVED":
      return { type: "CLUE_RESOLVED", clueId: "" };
    default:
      return { type: type as Condition["type"] };
  }
};

const refDe = (c: Condition): string | undefined =>
  c.type === "NODE_COMPLETED" ? c.nodeId : c.type === "POOL_DRAWN" ? c.poolNodeId : c.type === "TIMER" && c.anchor === "NODE_COMPLETION" ? c.anchorNodeId : undefined;

const discoverySourceDe = (n: GameNode): string | undefined => n.discovery?.sourceNode;

const effectRevealNodes = (n: GameNode): string[] =>
  (n.effects ?? []).filter((e) => e.type === "REVEAL_NODE").map((e) => e.nodeId).filter(Boolean) as string[];

// Icône par type de condition, partagée entre inspecteur et arêtes du graphe.
const iconeCondition = (type: string): "zone" | "apres" | "delai" | "tiree" | "animateur" | "package" | "engrenage" | "detail" =>
  type === "GEOFENCE" ? "zone" : type === "NODE_COMPLETED" ? "apres" : type === "TIMER" ? "delai" : type === "POOL_DRAWN" ? "tiree" : type === "PROXIMITY_MASTER" ? "animateur" : type === "ITEM_REQUIRED" || type === "ITEM_USED" ? "package" : type === "CODE_INPUT" || type === "CLUE_RESOLVED" ? "engrenage" : "detail";

type Onglet = "graphe" | "liste" | "detail" | "essai";

// Écrans du Studio (spec studio-onepage-spec) : navigation sur un état partagé,
// sans état par écran (hors simulateur de Prévisualiser).
type Ecran = "composer" | "importer" | "relire" | "valider" | "previsualiser" | "exporter" | "config";

const ECRANS: { id: Ecran; nom: string; icone: IconName }[] = [
  { id: "composer", nom: "Composer", icone: "graphe" },
  { id: "importer", nom: "Importer", icone: "importer" },
  { id: "relire", nom: "Relire", icone: "oeil" },
  { id: "valider", nom: "Valider", icone: "valider" },
  { id: "previsualiser", nom: "Prévisualiser", icone: "essai" },
  { id: "exporter", nom: "Exporter", icone: "exporter" },
  { id: "config", nom: "Configuration", icone: "engrenage" },
];

export default function App() {
  const [st, dispatch] = useReducer(reduce, init);
  const { game } = st.present;
  const [sel, setSel] = useState<string | null>(null);
  // Sélection multiple (Shift+clic, native ReactFlow) + recherche dans le graphe.
  const [selMulti, setSelMulti] = useState<string[]>([]);
  const [recherche, setRecherche] = useState("");
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [rapport, setRapport] = useState<string[]>([]);
  const [brut, setBrut] = useState<string[]>([]);
  const [animateur, setAnimateur] = useState(false);
  const [manifest, setManifest] = useState<ManifestFile[]>([]);
  const [nouveauType, setNouveauType] = useState("GEOFENCE");
  const [etapeWorkflow, setEtapeWorkflow] = useState<EtapeWorkflow>(1);
  const [onglet, setOnglet] = useState<Onglet>("graphe");
  const [ecran, setEcran] = useState<Ecran>("composer");
  // Verdicts C1/C2 pour la barre globale (null = couche non exécutée).
  const [couches, setCouches] = useState<{ c1: boolean; c2: boolean | null }>({ c1: true, c2: true });
  // Détail par couche pour l'écran Valider (erreurs brutes, groupées au rendu).
  const [detailCouches, setDetailCouches] = useState<{ layer: number; errors: string[] }[]>([]);
  // Calque transverse superposé (null = fermé) : i18n ou difficultés/modes.
  const [calque, setCalque] = useState<null | "i18n" | "modes">(null);
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
  const inputImportRef = useRef<HTMLInputElement>(null);
  const [historique, setHistorique] = useState<{ nom: string; date: string; resultat: "chargé" | "rejeté"; raison?: string }[]>(() => {
    try {
      const raw = localStorage.getItem("geoplay-import-history");
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((x): { nom: string; date: string; resultat: "chargé" | "rejeté"; raison?: string }[] => {
        if (typeof x === "string") return [{ nom: x, date: "", resultat: "chargé" }];
        if (x && typeof x === "object" && typeof (x as { nom?: unknown }).nom === "string") {
          const e = x as { nom: string; date?: unknown; resultat?: unknown; raison?: unknown };
          return [{ nom: e.nom, date: typeof e.date === "string" ? e.date : "", resultat: e.resultat === "rejeté" ? "rejeté" : "chargé", raison: typeof e.raison === "string" ? e.raison : undefined }];
        }
        return [];
      }).slice(0, 10);
    } catch {
      return [];
    }
  });
  const memoriserImport = (e: { nom: string; date: string; resultat: "chargé" | "rejeté"; raison?: string }) => {
    setHistorique((h) => {
      const recents = [e, ...h.filter((x) => x.nom !== e.nom)].slice(0, 10);
      try {
        localStorage.setItem("geoplay-import-history", JSON.stringify(recents));
      } catch {
        /* stockage indisponible : l'historique reste en mémoire */
      }
      return recents;
    });
  };
  // Dernier import en échec : la raison brute (couche 1) reste affichée sur l'écran Importer.
  const [importEchoue, setImportEchoue] = useState<string | null>(null);
  // Menu de gauche repliable (change studio-layout-revamp), état persisté.
  const [menuReplie, setMenuReplie] = useState<boolean>(() => {
    try {
      return localStorage.getItem("geoplay-menu-replie") === "1";
    } catch {
      return false;
    }
  });
  const basculerMenu = () => {
    setMenuReplie((v) => {
      const nv = !v;
      try {
        localStorage.setItem("geoplay-menu-replie", nv ? "1" : "0");
      } catch {
        /* stockage indisponible : état en mémoire seulement */
      }
      return nv;
    });
  };
  // Largeurs des panneaux + sections pliées (change studio-layout-revamp), persistées ensemble.
  const [mep, setMep] = useState(() => {
    try {
      const raw = localStorage.getItem("geoplay-layout-v1");
      if (!raw) return { ...LAYOUT_DEFAUT, repliees: { ...LAYOUT_DEFAUT.repliees } };
      const p = JSON.parse(raw) as Partial<{ droite: number; liste: number; repliees: Partial<Record<SectionPliable, boolean>> }>;
      const borne = (v: unknown, def: number, min: number, max: number) =>
        typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
      return {
        droite: borne(p.droite, 400, 280, 640),
        liste: borne(p.liste, 340, 220, 520),
        repliees: {
          graphe: p.repliees?.graphe === true,
          liste: p.repliees?.liste === true,
          detail: p.repliees?.detail === true,
          essai: p.repliees?.essai === true,
        },
      };
    } catch {
      return { ...LAYOUT_DEFAUT, repliees: { ...LAYOUT_DEFAUT.repliees } };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("geoplay-layout-v1", JSON.stringify(mep));
    } catch {
      /* stockage indisponible : mise en page en mémoire seulement */
    }
  }, [mep]);
  const basculerSection = (s: SectionPliable) => {
    setMolette(null);
    setMep((m) => ({ ...m, repliees: { ...m.repliees, [s]: !m.repliees[s] } }));
  };
  // Panneau « molette » ouvert (change studio-layout-revamp) : une seule section à la fois.
  const [molette, setMolette] = useState<SectionPliable | null>(null);
  const basculerMolette = (s: SectionPliable) => setMolette((m) => (m === s ? null : s));
  // Instance ReactFlow pour « Recentrer » (fitView à la demande).
  const rfRef = useRef<ReactFlowInstance | null>(null);
  // Section surlignée après un drill-down (anneau temporaire, sans décalage de mise en page).
  const [sectionSurlignee, setSectionSurlignee] = useState<string | null>(null);
  const surlignageTimer = useRef<number | undefined>(undefined);
  const surlignage = (s: string) =>
    sectionSurlignee === s ? { outline: "3px solid var(--focus)", outlineOffset: 2 } : undefined;
  const allerEtape = (e: EtapeWorkflow) => {
    setEtapeWorkflow(e);
    const cible = SECTION_PAR_ETAPE[e];
    const pliable = (["graphe", "detail", "liste", "essai"] as const).includes(cible as SectionPliable)
      ? (cible as SectionPliable)
      : null;
    if (pliable) setMep((m) => ({ ...m, repliees: { ...m.repliees, [pliable]: false } }));
    window.clearTimeout(surlignageTimer.current);
    setSectionSurlignee(cible);
    surlignageTimer.current = window.setTimeout(() => setSectionSurlignee(null), 1600);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(`section-${cible}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }),
    );
  };
  const reinitialiserMiseEnPage = () => {
    setMep({ ...LAYOUT_DEFAUT, repliees: { ...LAYOUT_DEFAUT.repliees } });
    setMenuReplie(false);
    try {
      localStorage.setItem("geoplay-menu-replie", "0");
    } catch {
      /* ignore */
    }
  };

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

  const edit = (fn: (s: Snap) => Snap, op = "modifier") => {
    if (relecture) return;
    dispatch({ t: "set", snap: fn(st.present), op });
    setExportOk(false);
  };
  const editGame = (fn: (g: Game) => Game, op = "modifier") => edit((s) => ({ ...s, game: fn(s.game) }), op);
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

const RAIL_PAR_TYPE: Record<string, string> = {
  INFO: "#6b7280", QUIZ: "#1a7f37", DIFFERENCE_GAME: "#5f3dc4", PUZZLE: "#8a5a00",
  AR_MARKER: "#0077b6", BOUSSOLE: "#d4a017", RANDOM_POOL: "#5f3dc4",
  CODE_INPUT: "#b42318", CLUE_RESOLVED: "#1a7f37", ITEM_DROPPER: "#8a5a00", ITEM_CONSUMER: "#b42318",
};

const noeuds: Node[] = useMemo(
  () =>
    game.nodes.map((n, i) => {
      const estSel = sel === n.id;
      const enErreur = (erreursParNoeud.get(n.id) ?? []).length > 0;
      const statut = st.present.meta.status[n.id]?.state ?? "draft";
      const nom = MODULES_FR[n.module.type]?.nom ?? n.module.type;
      const q = recherche.trim().toLowerCase();
      const match = q ? n.id.toLowerCase().includes(q) || nom.toLowerCase().includes(q) || n.module.type.toLowerCase().includes(q) : false;
      const railColor = RAIL_PAR_TYPE[n.module.type] ?? "#b9c1ca";
      return {
        id: n.id,
        position: positions[n.id] ?? { x: (i % 4) * 250, y: Math.floor(i / 4) * 160 },
        selected: estSel,
        data: {
          label: `${n.isEnding ? "FIN · " : ""}${n.id} · ${nom}${statut === "draft" ? " · Brouillon" : ""}${enErreur ? " · À corriger" : ""}`,
          nodeType: n.module.type,
          nodeStatus: statut,
        },
        style: {
          border: estSel
            ? "3px solid #0b5fff"
            : enErreur
              ? "2px solid #b42318"
              : statut === "draft"
                ? "2px dotted #8a5a00"
                : n.isEnding
                  ? "2px solid #8a5a00"
                  : n.module.type === "RANDOM_POOL"
                    ? "2px dashed #5f3dc4"
                    : "1px solid #b9c1ca",
          borderLeft: `4px solid ${railColor}`,
          background: estSel
            ? "#e8efff"
            : enErreur
              ? "#fdecea"
              : statut === "draft"
                ? "#fffdf3"
                : n.isEnding
                  ? "#fff4d6"
                  : n.module.type === "RANDOM_POOL"
                    ? "#ede9fe"
                    : "#ffffff",
          borderRadius: 12,
          padding: 8,
          fontWeight: estSel || enErreur ? 700 : 500,
          boxShadow: estSel ? "0 0 0 3px #fff, 0 0 0 5px #0b5fff" : undefined,
          outline: match && !estSel ? "3px solid #0b5fff" : undefined,
          outlineOffset: match && !estSel ? 2 : undefined,
        },
      };
    }),
  [game.nodes, positions, erreursParNoeud, sel, st.present.meta.status, recherche],
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
            label: (<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={iconeCondition(c.type)} size={12} />{CONDITIONS_FR[c.type]?.nom ?? c.type}</span>),
            animated: impasse,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            style: impasse ? { stroke: "#b42318", strokeWidth: 2.5 } : { stroke: "#6b7280", strokeWidth: 1.6 },
            labelStyle: { fill: impasse ? "#b42318" : "#374151", fontWeight: 600 },
            labelBgStyle: { fill: "#fff", fillOpacity: 0.92 },
          });
        }
      }
    }
    for (const n of game.nodes) {
      const discSource = discoverySourceDe(n);
      if (discSource && game.nodes.some((m) => m.id === discSource)) {
          edges.push({
            id: `${discSource}->${n.id}:discovery`, source: discSource, target: n.id,
            label: (<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="oeil" size={12} />Discovery</span>),
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            style: { stroke: "#0b5fff", strokeWidth: 1.6, strokeDasharray: "6 3" },
            labelStyle: { fill: "#0b5fff", fontWeight: 600 },
            labelBgStyle: { fill: "#e8efff", fillOpacity: 0.92 },
          });
      }
      for (const revealNode of effectRevealNodes(n)) {
        if (game.nodes.some((m) => m.id === revealNode)) {
          edges.push({
            id: `${n.id}->${revealNode}:effect`, source: n.id, target: revealNode,
            label: (<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="engrenage" size={12} />Effet</span>),
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            style: { stroke: "#2b8a3e", strokeWidth: 1.6, strokeDasharray: "3 3" },
            labelStyle: { fill: "#2b8a3e", fontWeight: 600 },
            labelBgStyle: { fill: "#eafff0", fillOpacity: 0.92 },
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
    if (!etroite) { setOnglet("graphe"); setEcran("valider"); }
  };
  useEffect(() => {
    const v = validateGame(game);
    setBrut(v.layers.flatMap((l) => l.errors));
    setRapport(v.layers.flatMap((l) => (l.errors.length ? l.errors.map(erreurFR) : [`Couche ${l.layer} : OK`])));
    setCouches({
      c1: (v.layers[0]?.errors.length ?? 1) === 0,
      c2: v.layers[1] ? v.layers[1].errors.length === 0 : null,
    });
    setDetailCouches(v.layers.map((l) => ({ layer: l.layer, errors: [...l.errors] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Création d'étapes via l'opération MCP nommée (historique lisible).
  const composerEtapes = (nodes: GameNode[]) => editGame((g) => composeNodes(g, nodes), "composeNodes");
  const ajouterEtape = (preset: "etape" | "tirage" | "fin" | "lieu") => {
    if (relecture) return;
    const id = `etape-${game.nodes.length + 1}`;
    if (preset === "tirage") {
      composerEtapes([{
        id, module: { type: "RANDOM_POOL", data: {} },
        activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
        randomPool: { candidates: [], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" },
      }]);
    } else if (preset === "fin") {
      composerEtapes([{
        id, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } },
        activation: { requires: [] }, isEnding: true,
      }]);
    } else if (preset === "lieu") {
      composerEtapes([{
        id, module: { type: "INFO", data: {} },
        activation: { requires: [{ type: "GEOFENCE", lat: 48.0, lng: 2.0, radiusMeters: 30, predicate: "enter" }] },
      }]);
    } else {
      composerEtapes([{
        id, module: { type: "QUIZ", data: { schemaVersion: "1.0.0", questions: [] } },
        activation: { requires: [] },
      }]);
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

  const journal = (msg: string) => setLog((l) => [...l, `[${sessionId}] ${msg} (triche, hold=${game.global?.holdMode ?? "none"})`]);
  // HOLD simulé (prévisualisation uniquement, jamais écrit dans le JSON).
  const [holdSim, setHoldSim] = useState<"none" | "locked">("none");
  const forcerHoldLock = () => {
    setHoldSim("locked");
    journal("forceHoldLock : verrouillage kiosque simulé");
  };
  const forcerHoldExit = () => {
    setHoldSim("none");
    journal("forceHoldExit : sortie animateur simulée");
  };
  // Reculer d'un pas : rouvre la dernière étape terminée de la simulation.
  const reculerSim = () => {
    const ids = Object.keys(done);
    if (!ids.length) return;
    const last = ids[ids.length - 1];
    setDone((d) => { const n = { ...d }; delete n[last]; return n; });
    setCounts((c) => {
      const n = { ...c };
      if ((n[last] ?? 1) <= 1) delete n[last]; else n[last]--;
      return n;
    });
    journal(`retour ${last} : étape rouverte`);
  };
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
    setEcran("exporter");
    const r = await exportPackFull(game, st.present.meta, manifest, animateur);
    if (!r.ok) {
      setBrut(r.errors);
      setRapport(r.errors.map(erreurFR));
      setEtapeWorkflow(4);
      const m = r.errors.join(" ");
      const fautif = game.nodes.find((n) => m.includes(n.id));
      if (fautif) setSel(fautif.id);
      if (!etroite) setEcran("composer");
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
    setDernierExport({ date: new Date().toISOString(), files: r.manifest!.files });
    setExportOk(true);
    setEtapeWorkflow(5);
  };

  // Import d'un fichier JSON de jeu (change import-game-studio) :
  // parse via le MCP, validation bi-couche, chargement seulement si OK.
  const importerFichier = async (file: File | undefined) => {
    if (!file || relecture) return;
    try {
      const g = await importGame(file);
      const v = validateGame(g);
      if (!v.ok) {
        const premier = v.layers.flatMap((l) => l.errors)[0] ?? "validation échouée";
        setBrut(v.layers.flatMap((l) => l.errors));
        setRapport(v.layers.flatMap((l) => (l.errors.length ? l.errors.map(erreurFR) : [`Couche ${l.layer} : OK`])));
        setImportEchoue(file.name);
        memoriserImport({ nom: file.name, date: new Date().toISOString(), resultat: "rejeté", raison: premier });
        return;
      }
      edit((s) => ({ game: g, meta: emptyMeta() }), "importer");
      setSel(null);
      nouvelleSession();
      setImportEchoue(null);
      memoriserImport({ nom: file.name, date: new Date().toISOString(), resultat: "chargé" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBrut([msg]);
      setRapport([msg]);
      setImportEchoue(file.name);
      memoriserImport({ nom: file.name, date: new Date().toISOString(), resultat: "rejeté", raison: msg });
    }
  };

  const importer = async () => {
    if (relecture) return;
    setEcran("importer");
    const w = window as unknown as {
      showOpenFilePicker?: (opts?: unknown) => Promise<{ getFile: () => Promise<File> }[]>;
    };
    if (w.showOpenFilePicker) {
      try {
        const [handle] = await w.showOpenFilePicker({
          types: [{ description: "JSON GeoPlay", accept: { "application/json": [".json"] } }],
          multiple: false,
        });
        await importerFichier(await handle.getFile());
        return;
      } catch {
        return; // annulation par l'utilisateur : on ne fait rien
      }
    }
    inputImportRef.current?.click();
  };

  const erreurs = rapport.filter((r) => !r.includes(": OK"));
  const nbEtapes = game.nodes.length;
  const finPresente = game.nodes.some((n) => n.isEnding);
  const nbBrouillons = game.nodes.filter((n) => (st.present.meta.status[n.id]?.state ?? "draft") === "draft").length;
  // Règle centrale "export possible" (spec studio-onepage-spec, décision 1.1),
  // consommée par la barre globale, Relire et Exporter.
  const blocage = useMemo(() => canExport(game, st.present.meta, animateur), [game, st.present.meta, animateur]);
  const bloqueExport = !blocage.ok;
  const raisonsBlocage = blocage.raisons;
  const [dernierExport, setDernierExport] = useState<{ date: string; files: ManifestFile[] } | null>(null);
  // Statut global du jeu pour la barre globale (spec studio-onepage-spec).
  const statutJeu = nbEtapes === 0 || nbBrouillons > 0 ? "draft" : "reviewed";
  const fait = {
    1: nbEtapes > 0,
    2: nbEtapes > 0,
    3: nbEtapes > 0 && nbBrouillons === 0,
    4: erreurs.length === 0 && nbEtapes > 0,
    5: exportOk,
  } as Record<EtapeWorkflow, boolean>;

  const choisirNoeud = (id: string) => {
    setSel(id);
    if (etroite) {
      setOnglet("detail");
      return;
    }
    // Drill-down desktop (change studio-layout-revamp) : déplie, surligne et
    // fait défiler la section détail vers le nœud choisi.
    setMep((m) => ({ ...m, repliees: { ...m.repliees, detail: false } }));
    setEcran("composer");
    window.clearTimeout(surlignageTimer.current);
    setSectionSurlignee("detail");
    surlignageTimer.current = window.setTimeout(() => setSectionSurlignee(null), 1600);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById("section-detail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }),
    );
    if (etapeWorkflow === 1) setEtapeWorkflow(2);
  };

  // Position effective d'un nœud (placée ou grille par défaut) pour l'alignement.
  const posEffective = (id: string) => {
    const i = game.nodes.findIndex((n) => n.id === id);
    return positions[id] ?? { x: (i % 4) * 250, y: Math.floor(i / 4) * 160 };
  };
  // Aligne la sélection multiple (≥2 nœuds) sur la moyenne d'un axe.
  const aligner = (axe: "x" | "y") => {
    const ids = selMulti.filter((id) => game.nodes.some((n) => n.id === id));
    if (ids.length < 2 || relecture) return;
    const moy = ids.reduce((s, id) => s + posEffective(id)[axe], 0) / ids.length;
    setPositions((p) => {
      const n = { ...p };
      for (const id of ids) {
        const base = posEffective(id);
        n[id] = axe === "x" ? { x: moy, y: base.y } : { x: base.x, y: moy };
      }
      return n;
    });
  };
  // Recherche par nom/type : Entrée sélectionne le 1er résultat et le centre.
  const allerRecherche = () => {
    const q = recherche.trim().toLowerCase();
    if (!q) return;
    const m = game.nodes.find((n) =>
      n.id.toLowerCase().includes(q) ||
      n.module.type.toLowerCase().includes(q) ||
      (MODULES_FR[n.module.type]?.nom ?? "").toLowerCase().includes(q));
    if (!m) return;
    choisirNoeud(m.id);
    const p = posEffective(m.id);
    rfRef.current?.setCenter(p.x, p.y, { zoom: 1, duration: 300 });
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
      <button className="btn" style={{ justifyContent: "flex-start" }} onClick={reinitialiserMiseEnPage} title="Restaurer les largeurs et le menu par défaut">
        <Icon name="retablir" size={15} /> Mise en page par défaut
      </button>
    </nav>
  );

  const zoneGraphe = (
    <div className="carte studio-flow relative min-h-0 flex-1 overflow-hidden" style={{ minHeight: 320 }}>
      <ReactFlow nodes={noeuds} edges={aretes} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(_, n) => choisirNoeud(n.id)} onSelectionChange={({ nodes: ns }) => setSelMulti(ns.map((n) => n.id))} multiSelectionKeyCode="Shift" onInit={(instance) => { rfRef.current = instance; }} fitView={nbEtapes > 0} fitViewOptions={{ padding: 0.2 }} minZoom={0.3} maxZoom={2} nodesConnectable={!relecture} nodesDraggable={!relecture} elementsSelectable style={{ width: "100%", height: "100%" }}>
        <Background gap={22} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable style={{ borderRadius: 10 }} aria-label="Mini-carte du graphe" />
        <Panel position="top-left">
          <span className="puce">
            <Icon name="graphe" size={13} /> {nbEtapes} étape{nbEtapes > 1 ? "s" : ""} · glisser pour relier
          </span>
          <input className="champ" style={{ minHeight: 32, marginTop: 4 }} value={recherche} size={14}
            placeholder="Rechercher (nom, type) — Entrée"
            aria-label="Rechercher un nœud par nom ou type"
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") allerRecherche(); }} />
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
          onAllerConfig={() => setEcran("config")}
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
      <ModePanel game={game} edit={edit} lectureSeule={relecture} />
      <ExperienceStylePanel game={game} edit={edit} lectureSeule={relecture} />
      <BrandingPanel game={game} edit={edit} lectureSeule={relecture} />
      <I18nPanel meta={st.present.meta} edit={edit} lectureSeule={relecture} />
      <ReviewOverlay game={game} meta={st.present.meta} />
      <Apercu
        game={game} sim={sim} setSim={setSim} file={file} activeId={activeId}
        ouvrir={ouvrir} terminer={terminer} draws={draws} forced={forced} setForced={setForced}
        log={log} testAll={testAll} testerBranches={testerBranches} sessionId={sessionId}
        setSessionId={setSessionId} nouvelleSession={nouvelleSession}
        reculer={reculerSim} nbTermines={Object.keys(done).length}
        holdSim={holdSim} onHoldLock={forcerHoldLock} onHoldExit={forcerHoldExit}
      />
    </aside>
  );

  // Contenus des écrans (spec studio-onepage-spec) : tous branchés sur le même
  // état { game, meta } + historique, sans état par écran (hors simulateur).
  const ecranCourant = (
    <>
      {ecran === "importer" && (
        <div className="carte flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3" aria-label="Écran Importer">
          <h2 className="text-base font-bold">Importer un jeu</h2>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            Charge un fichier JSON de jeu : il rejoint exactement le même état que Composer
            (même undo/redo, mêmes écrans). Tu peux aussi déposer le fichier n'importe où dans la fenêtre.
          </p>
          <div>
            <button className="btn-primaire" onClick={importer} disabled={relecture} title={IMPORTER.aide}>
              <Icon name="importer" size={16} /> {IMPORTER.nom}
            </button>
          </div>
          <h3 className="text-sm font-bold">Imports récents ({historique.length})</h3>
          {historique.length ? (
            <ul className="text-xs">
              {historique.map((h) => (
                <li key={h.nom} style={{ padding: "4px 0" }}>
                  <b>{h.nom}</b> — {h.resultat}{h.date ? ` · ${new Date(h.date).toLocaleString()}` : ""}
                  {h.raison ? <><br /><span style={{ color: "var(--ink-2)" }}>{h.raison}</span></> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>Aucun import enregistré sur cet appareil.</p>
          )}
          {importEchoue && (
            <div>
              <h3 className="text-sm font-bold">Erreur brute du schéma — {importEchoue}</h3>
              <ul className="text-xs font-mono">{brut.map((b, i) => <li key={i} style={{ padding: "2px 0" }}>{b}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {ecran === "relire" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto" aria-label="Écran Relire">
          <FileRelire game={game} meta={st.present.meta} edit={edit} manifest={manifest} lectureSeule={relecture} onChoisir={choisirNoeud} estAnimateur={animateur} exportPret={!bloqueExport || animateur} />
          <ReviewOverlay game={game} meta={st.present.meta} />
        </div>
      )}
      {ecran === "valider" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto" aria-label="Écran Valider">
          <div>
            <button className="btn-primaire" onClick={valider} title="Valider couches 1+2">
              <Icon name="valider" size={16} /> Valider
            </button>
          </div>
          <BlocValidation couches={detailCouches} game={game} onVoir={choisirNoeud} />
        </div>
      )}
      {ecran === "previsualiser" && (
        <div className="carte min-h-0 flex-1 overflow-auto p-2" aria-label="Écran Prévisualiser">
          <Apercu
            game={game} sim={sim} setSim={setSim} file={file} activeId={activeId}
            ouvrir={ouvrir} terminer={terminer} draws={draws} forced={forced} setForced={setForced}
            log={log} testAll={testAll} testerBranches={testerBranches} sessionId={sessionId}
            setSessionId={setSessionId} nouvelleSession={nouvelleSession}
            reculer={reculerSim} nbTermines={Object.keys(done).length}
            holdSim={holdSim} onHoldLock={forcerHoldLock} onHoldExit={forcerHoldExit}
          />
        </div>
      )}
      {ecran === "exporter" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto" aria-label="Écran Exporter">
          <ManifestForm manifest={manifest} setManifest={setManifest} lectureSeule={relecture} />
          <div className="carte p-3">
            <h3 className="text-sm font-bold">Résumé pré-export</h3>
            <p className="text-xs" style={{ color: "var(--ink-2)" }}>
              Seront générés : game.json, manifest.json ({manifest.length} fichier{manifest.length > 1 ? "s" : ""} au manifest), studio-meta.json.
            </p>
            <div style={{ marginTop: 8 }}>
              <button className="btn-primaire" onClick={exporter} disabled={bloqueExport && !animateur} title={bloqueExport && !animateur ? `Export bloqué : ${erreurFR(raisonsBlocage[0] ?? "validation en cours")}` : "Exporter game.json + manifest + studio-meta.json"}>
                <Icon name="exporter" size={16} /> Exporter
              </button>
            </div>
            {bloqueExport && !animateur && (
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>Bloqué : {erreurFR(raisonsBlocage[0] ?? "validation en cours")}{raisonsBlocage.length > 1 ? ` (+${raisonsBlocage.length - 1} autre(s), voir Valider)` : ""}</p>
            )}
          </div>
          {dernierExport && (
            <div className="carte p-3">
              <h3 className="text-sm font-bold">Dernier export — {new Date(dernierExport.date).toLocaleString()}</h3>
              <ul className="text-xs font-mono">
                {dernierExport.files.map((f) => (
                  <li key={f.path} style={{ padding: "2px 0" }}>{f.path} v{f.version} {f.size}o<br />sha256:{f.sha256}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {ecran === "config" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto" aria-label="Écran Configuration globale">
          <ModePanel game={game} edit={edit} lectureSeule={relecture} />
          <ExperienceStylePanel game={game} edit={edit} lectureSeule={relecture} />
          <BrandingPanel game={game} edit={edit} lectureSeule={relecture} />
          <ObjetsPanel game={game} editGame={editGame} lectureSeule={relecture} onChoisir={choisirNoeud} />
          {(() => {
            const holdMode = game.global?.holdMode ?? "none";
            const verrous = game.nodes.filter((n) => MODULE_REGISTRY[n.module.type]?.needsLock);
            if (!verrous.length) return null;
            return (
              <div className="carte p-3">
                <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
                  <Icon name="animateur" size={15} /> Verrouillage HOLD
                </h3>
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>holdMode actuel : <b>{holdMode}</b> — recalculé à chaque changement.</p>
                <ul className="text-xs">
                  {verrous.map((n) => (
                    <li key={n.id}>{n.id} — {holdMode === "none"
                      ? (<span className="puce puce-erreur">bloqué (HOLD requis)</span>)
                      : (<span className="puce puce-ok">jouable</span>)}</li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen flex-col text-sm" style={{ background: "var(--surface-2)", color: "var(--ink)", paddingBottom: "env(safe-area-inset-bottom)" }}
      onDragOver={(e) => { if (!relecture) e.preventDefault(); }}
      onDrop={(e) => {
        if (relecture) return;
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.type !== "application/json" && !file.name.endsWith(".json")) {
          setBrut([`Fichier refusé : ${file.name} n'est pas un JSON (.json attendu)`]);
          setRapport([`Fichier refusé : ${file.name} n'est pas un JSON (.json attendu)`]);
          return;
        }
        void importerFichier(file);
      }}>
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
              onChange={(e) => editGame((g) => ({ ...g, gameId: e.target.value }), "renommerJeu")} aria-label="Nom du jeu" />
          </label>
          <span className="puce" title={statutJeu === "draft" ? "Des éléments sont encore en brouillon" : "Jeu relu"}>
            <Icon name="statut" size={13} /> {statutJeu === "draft" ? "Brouillon" : "Relu"}
          </span>
          <span className={couches.c1 ? "puce puce-ok" : "puce puce-erreur"} title="Couche 1 — conformité AJV Draft-07">
            C1 {couches.c1 ? "OK" : "KO"}
          </span>
          <span className={couches.c2 == null ? "puce" : couches.c2 ? "puce puce-ok" : "puce puce-erreur"} title="Couche 2 — validateur applicatif (non exécutée si C1 échoue)">
            C2 {couches.c2 == null ? "–" : couches.c2 ? "OK" : "KO"}
          </span>
          <span className="flex-1" />
          <button className="btn" onClick={valider} title="Valider couches 1+2">
            <Icon name="valider" size={16} /> Valider
          </button>
          <button className="btn" onClick={importer} disabled={relecture} title={historique.length ? `${IMPORTER.aide} — Récents : ${historique.map((h) => h.nom).join(", ")}` : IMPORTER.aide}>
            <Icon name="importer" size={16} /> {IMPORTER.nom}
          </button>
          <input ref={inputImportRef} type="file" accept="application/json,.json" className="sr-only" aria-label={IMPORTER.nom}
            onChange={(e) => { void importerFichier(e.target.files?.[0]); e.target.value = ""; }} />
          <button className="btn-primaire" onClick={exporter} disabled={bloqueExport && !animateur} title={bloqueExport && !animateur ? `Export bloqué : ${erreurFR(raisonsBlocage[0] ?? "validation en cours")}` : "Exporter game.json + manifest + studio-meta.json"}>
            <Icon name="exporter" size={16} /> Exporter
          </button>
          <label className="puce" style={{ cursor: "pointer" }} title="Mode animateur : brouillons jouables, triche tracée">
            <input type="checkbox" checked={animateur} onChange={(e) => setAnimateur(e.target.checked)} aria-label="Mode animateur" />
            <Icon name="animateur" size={14} /> Animateur
          </label>
          <button className="btn" style={{ padding: "0 10px" }} onClick={() => setCalque(calque === "i18n" ? null : "i18n")} aria-expanded={calque === "i18n"} title="Calque traductions (i18n) en surimpression">
            <Icon name="detail" size={15} /> <span className="hidden xl:inline">Traductions</span>
          </button>
          <button className="btn" style={{ padding: "0 10px" }} onClick={() => setCalque(calque === "modes" ? null : "modes")} aria-expanded={calque === "modes"} title="Calque difficultés et modes en surimpression">
            <Icon name="exemple" size={15} /> <span className="hidden xl:inline">Modes</span>
          </button>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => dispatch({ t: "undo" })} disabled={!st.past.length || relecture} title="Annuler la dernière modification">
              <Icon name="annuler" size={16} /> <span className="hidden xl:inline">Annuler</span>
            </button>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => dispatch({ t: "redo" })} disabled={!st.future.length || relecture} title="Rétablir">
              <Icon name="retablir" size={16} /> <span className="hidden xl:inline">Rétablir</span>
            </button>
            <details title="Historique des opérations (nommées, pas de diff opaque)">
              <summary className="btn" style={{ padding: "0 10px", cursor: "pointer", listStyle: "none" }}>
                <Icon name="liste" size={16} /> <span className="hidden xl:inline">Historique ({st.past.length})</span>
              </summary>
              <div className="carte" style={{ position: "fixed", zIndex: 50, maxHeight: "50vh", overflow: "auto", padding: 8, minWidth: 220 }} role="dialog" aria-label="Historique des opérations">
                <ol className="text-xs">
                  {[...st.past].reverse().map((e, i) => <li key={i} style={{ padding: "2px 0" }}>{e.op}</li>)}
                  <li style={{ padding: "2px 0", fontWeight: 700 }}>(actuel)</li>
                </ol>
              </div>
            </details>
          </span>
        </div>
        <WorkflowStepper courant={etapeWorkflow} onAller={allerEtape} fait={fait} bloqueExport={bloqueExport && !animateur} nbErreurs={erreurs.length} nbBrouillons={nbBrouillons} />
        {relecture && (
          <p className="puce" style={{ alignSelf: "flex-start" }}>
            <Icon name="statut" size={13} /> Petit écran : relecture — visualisation, statuts et validation. Retouche sur grand écran.
          </p>
        )}
      </header>
      {calque && (
        <div className="carte" style={{ position: "fixed", top: 64, right: 12, zIndex: 50, width: 380, maxWidth: "calc(100vw - 24px)", maxHeight: "80vh", overflow: "auto", padding: 12 }} role="dialog" aria-label={calque === "i18n" ? "Calque traductions" : "Calque difficultés et modes"}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} onClick={() => setCalque(null)} aria-label="Fermer le calque">
              <Icon name="fermer" size={14} />
            </button>
          </div>
          {calque === "i18n" ? (
            <I18nPanel meta={st.present.meta} edit={edit} lectureSeule={relecture} />
          ) : (
            <>
              <ModePanel game={game} edit={edit} lectureSeule={relecture} />
              <p className="text-xs" style={{ color: "var(--ink-2)" }}>HOLD est un mode système : il se configure dans Configuration globale, pas ici.</p>
            </>
          )}
        </div>
      )}

      {/* Grand écran : 3 volets sobres. Petit écran : onglets + barre basse. */}
      <div className="hidden min-h-0 flex-1 gap-3 p-3 lg:flex">
        {menuReplie ? (
          <div className="carte flex w-14 shrink-0 flex-col items-center gap-2 overflow-auto p-2" aria-label="Menu replié">
            <button className="btn" style={{ padding: "0 10px" }} onClick={basculerMenu} title="Déplier le menu" aria-label="Déplier le menu">
              <Icon name="liste" size={17} />
            </button>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => ajouterEtape("etape")} disabled={relecture} title="Créer une étape Quiz / jeu" aria-label="Étape de jeu">
              <Icon name="etape" size={17} />
            </button>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => ajouterEtape("lieu")} disabled={relecture} title="Créer un lieu avec zone GPS" aria-label="Lieu GPS">
              <Icon name="lieu" size={17} />
            </button>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => ajouterEtape("tirage")} disabled={relecture} title="Créer un tirage au sort parmi des étapes" aria-label="Tirage au sort">
              <Icon name="tirage" size={17} />
            </button>
            <button className="btn" style={{ padding: "0 10px" }} onClick={() => ajouterEtape("fin")} disabled={relecture} title="Créer l'étape de fin du jeu" aria-label="Fin du jeu">
              <Icon name="fin" size={17} />
            </button>
            {ECRANS.map((e) => (
              <button key={e.id} className="btn" style={{ padding: "0 10px", fontWeight: ecran === e.id ? 700 : 500 }} onClick={() => setEcran(e.id)} title={e.nom} aria-label={e.nom} aria-current={ecran === e.id ? "page" : undefined}>
                <Icon name={e.icone} size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="carte w-60 shrink-0 overflow-auto p-3" style={{ maxWidth: 260 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
              <button className="btn" style={{ padding: "0 10px" }} onClick={basculerMenu} title="Replier le menu" aria-label="Replier le menu">
                <Icon name="liste" size={15} />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Écrans du Studio" style={{ marginBottom: 8 }}>
              <span className="text-xs font-bold uppercase" style={{ color: "var(--ink-2)" }}>Écrans</span>
              {ECRANS.map((e) => (
                <button key={e.id} className="btn" style={{ justifyContent: "flex-start", fontWeight: ecran === e.id ? 700 : 500 }} onClick={() => setEcran(e.id)} aria-current={ecran === e.id ? "page" : undefined} title={`Aller à l'écran ${e.nom}`}>
                  <Icon name={e.icone} size={17} /> {e.nom}
                </button>
              ))}
            </nav>
            {ecran === "composer" && palette}
          </div>
        )}
        {ecran === "composer" ? (<>
        <main className="flex min-h-0 min-w-0 flex-[3] flex-col gap-2" aria-label="Graphe et liste">
          <div className="flex min-h-0 flex-1 gap-3">
            {mep.repliees.graphe ? (
              <div className="carte flex w-12 shrink-0 flex-col items-center p-2" aria-label="Graphe replié">
                <button className="btn" style={{ padding: "0 10px" }} onClick={() => basculerSection("graphe")} title="Déplier le graphe" aria-label="Déplier le graphe">
                  <Icon name="graphe" size={17} />
                </button>
              </div>
            ) : (
              <div id="section-graphe" className="relative flex min-h-0 min-w-0 flex-1 flex-col" style={surlignage("graphe")}>
                {zoneGraphe}
                <div style={{ position: "absolute", top: 8, right: 8, zIndex: 5, display: "flex", gap: 4 }}>
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} onClick={() => basculerMolette("graphe")} title="Réglages du graphe" aria-label="Réglages du graphe" aria-expanded={molette === "graphe"}>
                    <Icon name="engrenage" size={15} />
                  </button>
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("graphe")} title="Replier le graphe">
                    Replier
                  </button>
                </div>
                {molette === "graphe" && (
                  <div className="carte" style={{ position: "absolute", top: 48, right: 8, zIndex: 6, padding: 8, display: "flex", flexDirection: "column", gap: 6 }} role="dialog" aria-label="Réglages du graphe">
                    <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => { rfRef.current?.fitView({ padding: 0.2 }); setMolette(null); }} title="Recentrer le graphe">
                      Recentrer
                    </button>
                    <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => { aligner("y"); }} disabled={selMulti.length < 2 || relecture} title={selMulti.length < 2 ? "Sélectionne au moins 2 nœuds (Shift+clic)" : `Aligner horizontalement (${selMulti.length} sélectionnés)`}>
                      Aligner H
                    </button>
                    <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => { aligner("x"); }} disabled={selMulti.length < 2 || relecture} title={selMulti.length < 2 ? "Sélectionne au moins 2 nœuds (Shift+clic)" : `Aligner verticalement (${selMulti.length} sélectionnés)`}>
                      Aligner V
                    </button>
                    <button className="btn" style={{ justifyContent: "flex-start" }} onClick={() => basculerSection("graphe")} title="Replier le graphe">
                      Replier
                    </button>
                  </div>
                )}
              </div>
            )}
            <Splitter label="Ajuster la largeur de la liste" onDelta={(dx) => setMep((m) => ({ ...m, liste: Math.min(520, Math.max(220, m.liste - dx)) }))} />
            {mep.repliees.liste ? (
              <div className="carte flex w-12 shrink-0 flex-col items-center p-2" aria-label="Liste repliée">
                <button className="btn" style={{ padding: "0 10px" }} onClick={() => basculerSection("liste")} title="Déplier la liste" aria-label="Déplier la liste">
                  <Icon name="liste" size={17} />
                </button>
              </div>
            ) : (
              <div id="section-liste" className="flex min-w-0 flex-col" style={{ width: mep.liste, ...surlignage("liste") }}>
                <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} onChoisir={choisirNoeud} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} boutonPlier={<button className="btn" style={{ minHeight: 32, padding: "0 8px", fontSize: 12 }} onClick={() => basculerSection("liste")} title="Replier la liste">Replier</button>} boutonMolette={<button className="btn" style={{ minHeight: 32, padding: "0 8px" }} onClick={() => basculerMolette("liste")} title="Réglages de la liste" aria-label="Réglages de la liste" aria-expanded={molette === "liste"}><Icon name="engrenage" size={14} /></button>} panneauMolette={molette === "liste" && (
                  <div className="flex gap-2 px-2 pb-2" role="dialog" aria-label="Réglages de la liste">
                    <button className="btn" style={{ minHeight: 32, padding: "0 8px", fontSize: 12 }} onClick={() => basculerSection("liste")} title="Replier la liste">Replier</button>
                    <button className="btn" style={{ minHeight: 32, padding: "0 8px", fontSize: 12 }} onClick={() => { setMep((m) => ({ ...m, liste: 340 })); setMolette(null); }} title="Restaurer la largeur par défaut de la liste">Largeur 340</button>
                  </div>
                )} />
              </div>
            )}
          </div>
          <div id="section-validation" style={surlignage("validation")}>
            {pied}
            {listeErreurs}
          </div>
        </main>
        <Splitter label="Ajuster la largeur du panneau latéral" onDelta={(dx) => setMep((m) => ({ ...m, droite: Math.min(640, Math.max(280, m.droite - dx)) }))} />
        <div className="flex min-w-0 flex-col gap-3 overflow-auto" style={{ width: mep.droite }}>
          {mep.repliees.detail ? (
            <div className="carte flex shrink-0 items-center gap-2 p-2" aria-label="Détail replié">
              <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("detail")} title="Déplier le détail">
                Détail
              </button>
            </div>
          ) : (
            <div id="section-detail" className="flex min-h-0 flex-1 flex-col gap-1" style={surlignage("detail")}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} onClick={() => basculerMolette("detail")} title="Réglages du détail" aria-label="Réglages du détail" aria-expanded={molette === "detail"}>
                  <Icon name="engrenage" size={15} />
                </button>
                <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("detail")} title="Replier le détail">
                  Replier
                </button>
              </div>
              {molette === "detail" && (
                <div className="flex gap-2" role="dialog" aria-label="Réglages du détail">
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("detail")} title="Replier le détail">Replier</button>
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => { setMep((m) => ({ ...m, droite: 400 })); setMolette(null); }} title="Restaurer la largeur par défaut du panneau">Panneau 400</button>
                </div>
              )}
              {detail}
            </div>
          )}
          {mep.repliees.essai ? (
            <div className="carte flex shrink-0 items-center gap-2 p-2" aria-label="Essai replié">
              <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("essai")} title="Déplier l'essai">
                Essai
              </button>
            </div>
          ) : (
            <div id="section-essai" className="flex flex-col gap-1" style={surlignage("essai")}>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} onClick={() => basculerMolette("essai")} title="Réglages de l'essai" aria-label="Réglages de l'essai" aria-expanded={molette === "essai"}>
                  <Icon name="engrenage" size={15} />
                </button>
                <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("essai")} title="Replier l'essai">
                  Replier
                </button>
              </div>
              {molette === "essai" && (
                <div className="flex gap-2" role="dialog" aria-label="Réglages de l'essai">
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => basculerSection("essai")} title="Replier l'essai">Replier</button>
                </div>
              )}
              {essai}
            </div>
          )}
        </div>
        </>) : (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-auto p-3" aria-label="Écran courant">
          {ecranCourant}
        </main>
        )}
      </div>

      {/* Mobile : navigation unifiée sur les écrans ECRANS + onglets dans composer */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:hidden">
        <main className="flex min-h-0 flex-1 flex-col" aria-label="Vue courante">
          {ecran === "composer" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
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
            </div>
          ) : (
            <>{ecranCourant}</>
          )}
        </main>
        {ecran === "composer" ? (
          <>
            {pied}
            {listeErreurs}
            <nav className="carte flex shrink-0 items-stretch gap-1 p-1" aria-label="Sections du Composer" style={{ position: "sticky", bottom: 0 }}>
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
          </>
        ) : (
          <nav className="carte flex shrink-0 items-stretch gap-1 p-1 flex-wrap" aria-label="Écrans du Studio" style={{ position: "sticky", bottom: 0 }}>
            {ECRANS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEcran(e.id)}
                aria-current={ecran === e.id ? "page" : undefined}
                style={{
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  minHeight: 48,
                  justifyContent: "center",
                  borderRadius: 10,
                  border: ecran === e.id ? "2px solid var(--focus)" : "1px solid transparent",
                  background: ecran === e.id ? "var(--surface)" : "transparent",
                  fontWeight: ecran === e.id ? 700 : 500,
                  fontSize: 11,
                  padding: "4px 6px",
                }}
              >
                <Icon name={e.icone} size={18} />
                {e.nom}
              </button>
            ))}
          </nav>
        )}
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

function Inspecteur({ game, node, meta, editGame, edit, nouveauType, setNouveauType, lectureSeule, onAllerConfig }: {
  game: Game; node: GameNode; meta: StudioMeta;
  editGame: (fn: (g: Game) => Game) => void;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  nouveauType: string; setNouveauType: (s: string) => void;
  lectureSeule: boolean;
  onAllerConfig?: () => void;
}) {
  const upd = (patch: Partial<GameNode>) => editGame((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)) }), "modifierNoeud");
  const updDecl = (i: number, patch: Partial<Condition>) =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== node.id) return n;
        const requires = n.activation.requires.map((c, j) => (j === i ? { ...c, ...patch } : c));
        return { ...n, activation: { ...n.activation, requires } };
      }),
    }), "setActivation");
  const supprDecl = (i: number) =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, activation: { ...n.activation, requires: n.activation.requires.filter((_, j) => j !== i) } } : n)),
    }), "setActivation");
  const ajoutDecl = () =>
    editGame((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== node.id) return n;
        const requires = [...n.activation.requires, conditionVide(nouveauType)];
        return { ...n, activation: { ...n.activation, requires, operator: n.activation.operator ?? (requires.length > 1 ? "AND" : undefined) } };
      }),
    }), "setActivation");
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
        {(() => {
          const reg = MODULE_REGISTRY[node.module.type];
          if (!reg) return null;
          const holdMode = game.global?.holdMode ?? "none";
          const pres = game.global?.presentation ?? [];
          const expStyle = (game.global?.experienceStyle ?? {}) as Record<string, unknown>;
          const besoinsKO: string[] = [];
          for (const p of reg.presentationNeeds ?? []) if (!pres.includes(p)) besoinsKO.push(`présentation ${p}`);
          for (const e of reg.experienceNeeds ?? []) if (expStyle[e] == null) besoinsKO.push(`experienceStyle.${e}`);
          const resume = [reg.needsLock ? "verrouillage" : null, reg.needsInventory ? "inventaire" : null, ...(reg.presentationNeeds ?? []), ...(reg.experienceNeeds ?? []).map((e) => `style:${e}`)].filter(Boolean).join(" · ");
          return (
            <>
              <span className="text-xs" style={{ color: "var(--ink-2)" }}>Besoins du module (registre) : {resume || "aucun"}</span>
              {reg.needsLock && holdMode === "none" && (
                <p className="puce puce-erreur" style={{ whiteSpace: "normal" }}>
                  <Icon name="alerte" size={13} /> Ce module exige un HOLD actif (needsLock), mais holdMode vaut « none » — rejet en couche 2.
                  {onAllerConfig && <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={onAllerConfig} title="Aller à la configuration globale">Configuration</button>}
                </p>
              )}
              {besoinsKO.length > 0 && (
                <p className="puce" style={{ whiteSpace: "normal" }} title="Avertissement non bloquant : seule la validation (couche 2) bloque">
                  <Icon name="alerte" size={13} /> Besoins non satisfaits : {besoinsKO.join(", ")}.
                </p>
              )}
            </>
          );
        })()}
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
               <Icon name={iconeCondition(c.type)} size={15} />
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
        <label>Statut <select className="champ" value={st} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, status: { ...s.meta.status, [node.id]: { state: e.target.value as StudioMeta["status"][string]["state"] } } } }), "definirStatut")}>
          {Object.entries(ETATS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Fournisseur <input className="champ" size={12} value={meta.provenance[node.id]?.providerId ?? ""} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, provenance: { ...s.meta.provenance, [node.id]: { providerId: e.target.value, license: s.meta.provenance[node.id]?.license ?? "", sourceUrl: s.meta.provenance[node.id]?.sourceUrl ?? "" } } } }), "definirProvenance")} placeholder="Qui fournit le contenu ?" /></label>
        <label>Milieu <select className="champ" value={milieu} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, milieu: { ...s.meta.milieu, [node.id]: e.target.value as Milieu } } }), "definirMilieu")}>
          {Object.entries(MILIEUX).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}
        </select></label>
        <i className="text-xs" style={{ color: "var(--ink-2)" }}>Conseil : {MILIEUX[milieu].reco}</i>
        {node.activation.requires.some((c) => c.type === "PROXIMITY_MASTER") && (
          <button className="btn" onClick={() => {
            try {
              editGame((g) => addSecoursCode(g, node.id), "addSecoursCode");
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
                edit((s) => ({ ...s, meta: { ...s.meta, overrides: { ...s.meta.overrides, [node.id]: patch as StudioMeta["overrides"][string] } } }), "definirOverrides");
              }
            } catch { alert("Options invalides (JSON)"); }
          }} />
        </details>
      </Famille>
      <Famille titre={FAMILLES[5].titre} aide={FAMILLES[5].aide}>
        <label>Mode <select className="champ" value={node.discovery?.mode ?? "VISIBLE_NOW"} onChange={(e) => upd({ discovery: { ...node.discovery, mode: e.target.value as any } })}>
          {["VISIBLE_NOW", "MAP", "ON_COMPLETED", "ON_CLUE", "ON_ITEM", "ON_PUZZLE", "ON_PROXIMITY", "ON_TIME"].map((m) => <option key={m} value={m}>{m}</option>)}
        </select></label>
        {node.discovery?.mode === "ON_COMPLETED" && (
          <label>Source (étape précédente) <select className="champ" value={node.discovery.sourceNode ?? ""} onChange={(e) => upd({ discovery: { ...node.discovery, sourceNode: e.target.value } })}>
            <option value="">—</option>{game.nodes.filter((m) => m.id !== node.id).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select></label>
        )}
        {node.discovery?.mode === "ON_CLUE" && (
          <label>Indice <select className="champ" value={node.discovery.clueId ?? ""} onChange={(e) => upd({ discovery: { ...node.discovery, clueId: e.target.value } })}>
            <option value="">—</option>{game.nodes.filter((m) => m.discovery?.mode === "ON_CLUE").map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select></label>
        )}
        {node.discovery?.mode === "ON_ITEM" && (
          <label>Objet <select className="champ" value={node.discovery.itemId ?? ""} onChange={(e) => upd({ discovery: { ...node.discovery, itemId: e.target.value } })}>
            <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
        )}
        {node.discovery?.mode === "ON_PROXIMITY" && (
          <span>
            <label>Lat <input className="champ w-20" type="number" step="any" value={node.discovery.lat ?? ""} onChange={(e) => upd({ discovery: { ...node.discovery, lat: Number(e.target.value) } })} /></label>
            <label>Lng <input className="champ w-20" type="number" step="any" value={node.discovery.lng ?? ""} onChange={(e) => upd({ discovery: { ...node.discovery, lng: Number(e.target.value) } })} /></label>
            <label>Rayon <input className="champ w-16" type="number" value={node.discovery.radiusMeters ?? ""} onChange={(e) => upd({ discovery: { ...node.discovery, radiusMeters: Number(e.target.value) } })} /></label>
          </span>
        )}
        <span className="text-xs" style={{ color: "var(--ink-2)" }}>Découverte = comment l'étape devient visible. Indépendante de l'activation.</span>
      </Famille>
      <Famille titre={FAMILLES[6].titre} aide={FAMILLES[6].aide}>
        {(node.effects ?? []).length === 0 && (
          <button className="btn" onClick={() => upd({ effects: [{ type: "GIVE_ITEM", itemId: "" }] })}><Icon name="ajouter" size={15} /> Ajouter un effet</button>
        )}
        {(node.effects ?? []).map((eff, i) => (
          <div key={i} className="carte p-2" style={{ boxShadow: "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="engrenage" size={15} />
              <select className="champ" value={eff.type} onChange={(e) => {
                const newEffects = [...(node.effects ?? [])];
                newEffects[i] = { ...eff, type: e.target.value };
                upd({ effects: newEffects });
              }}>
                <option value="GIVE_ITEM">Donner objet</option>
                <option value="REMOVE_ITEM">Retirer objet</option>
                <option value="REVEAL_NODE">Révéler nœud</option>
                <option value="HIDE_NODE">Masquer nœud</option>
                <option value="UNLOCK_NODE">Débloquer nœud</option>
                <option value="MODIFY_VARIABLE">Modifier variable</option>
                <option value="MODIFY_SCORE">Modifier score</option>
                <option value="TRIGGER_EVENT">Déclencher événement</option>
              </select>
              <span style={{ flex: 1 }} />
              <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} aria-label="Supprimer cet effet" title="Supprimer" onClick={() => upd({ effects: (node.effects ?? []).filter((_, j) => j !== i) })}><Icon name="fermer" size={14} /></button>
            </span>
            {eff.type === "GIVE_ITEM" || eff.type === "REMOVE_ITEM" ? <label>Objet <select className="champ" value={eff.itemId ?? ""} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], itemId: e.target.value }; upd({ effects: ne }); }}><option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label> : eff.type === "REVEAL_NODE" || eff.type === "HIDE_NODE" || eff.type === "UNLOCK_NODE" ? <label>Nœud <select className="champ" value={eff.nodeId ?? ""} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], nodeId: e.target.value }; upd({ effects: ne }); }}><option value="">—</option>{game.nodes.filter((m) => m.id !== node.id).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}</select></label> : eff.type === "MODIFY_VARIABLE" ? <label>Variable <input className="champ" value={eff.variableId ?? ""} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], variableId: e.target.value }; upd({ effects: ne }); }} placeholder="id" size={12} /></label> : eff.type === "MODIFY_SCORE" ? <label>Score <input className="champ w-16" type="number" value={Number(eff.value) ?? 0} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], value: Number(e.target.value) }; upd({ effects: ne }); }} /></label> : null}
          </div>
        ))}
      </Famille>
      <Famille titre={FAMILLES[7].titre} aide={FAMILLES[7].aide}>
        {(node.inventoryRef ?? []).length === 0 ? (
          <button className="btn" onClick={() => upd({ inventoryRef: [] })}><Icon name="ajouter" size={15} /> Ajouter un objet référencé</button>
        ) : null}
        {(node.inventoryRef ?? []).map((ref, i) => (
          <div key={i} className="carte p-2" style={{ boxShadow: "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="package" size={15} />
              <select className="champ" value={ref} onChange={(e) => { const ir = [...(node.inventoryRef ?? [])]; ir[i] = e.target.value; upd({ inventoryRef: ir }); }}>
                <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <span style={{ flex: 1 }} />
              <button className="btn" style={{ minHeight: 32, padding: "0 10px" }} aria-label="Supprimer cette référence" title="Supprimer" onClick={() => upd({ inventoryRef: (node.inventoryRef ?? []).filter((_, j) => j !== i) })}><Icon name="fermer" size={14} /></button>
            </span>
          </div>
        ))}
        <span className="text-xs" style={{ color: "var(--ink-2)" }}>InventoryRef = objets liés à ce nœud (donnés, requis). Vide si aucun objet.</span>
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
    case "ITEM_REQUIRED":
      return (
        <span>objet <select className="champ" style={{ minHeight: 40 }} value={c.itemId ?? ""} onChange={(e) => upd({ itemId: e.target.value })}>
          <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select></span>
      );
    case "ITEM_USED":
      return (
        <span>utiliser <select className="champ" style={{ minHeight: 40 }} value={c.itemId ?? ""} onChange={(e) => upd({ itemId: e.target.value })}>
          <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select> consommable <label className="text-xs"><input type="checkbox" checked={c.consumed ?? true} onChange={(e) => upd({ consumed: e.target.checked })} /> oui</label></span>
      );
    case "CODE_INPUT":
      return (
        <span>code <input className="champ" style={{ minHeight: 40 }} value={c.code ?? ""} onChange={(e) => upd({ code: e.target.value })} placeholder="Code" size={12} /></span>
      );
    case "CLUE_RESOLVED":
      return (
        <span>indice <select className="champ" style={{ minHeight: 40 }} value={c.clueId ?? ""} onChange={(e) => upd({ clueId: e.target.value })}>
          <option value="">—</option>{game.nodes.filter((m) => m.discovery?.mode === "ON_CLUE").map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
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

function ExperienceStylePanel({ game, edit, lectureSeule }: {
  game: Game;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  lectureSeule: boolean;
}) {
  const ex = game.experienceStyle ?? { preset: "BASIC" as const };
  const diverge = ex.preset != null && (ex.identity != null || ex.visual != null || ex.components != null || ex.media != null || ex.motion != null || ex.map != null || ex.voice != null);
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="engrenage" size={15} /> Experience Style
        {diverge && <span className="puce" title="Des dimensions ont été modifiées manuellement après le choix du preset">Personnalisé</span>}
      </h3>
      <label className="text-xs flex gap-1 items-center">
        Preset :
        <select className="champ" value={ex.preset ?? "BASIC"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, preset: e.target.value as any } } }))}>
          {["BASIC", "GUIDED", "TREASURE_HUNT", "ESCAPE_GAME", "OPEN_EXPLORATION"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {ex.identity && (
        <>
          <label className="text-xs flex gap-1 items-center mt-1">
            Nom éditeur :
            <input className="champ" value={ex.identity.name ?? ""} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, identity: { ...ex.identity, name: e.target.value } } } }))} />
          </label>
          <label className="text-xs flex gap-1 items-center">
            Éditeur :
            <input className="champ" value={ex.identity.publisher ?? ""} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, identity: { ...ex.identity, publisher: e.target.value } } } }))} />
          </label>
        </>
      )}
      {ex.visual && (
        <>
          <label className="text-xs flex gap-1 items-center mt-1">
            Couleur primaire :
            <input type="color" className="champ" value={ex.visual.primaryColor ?? "#1a7f37"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, visual: { ...ex.visual, primaryColor: e.target.value } } } }))} />
          </label>
          <label className="text-xs flex gap-1 items-center">
            Couleur secondaire :
            <input type="color" className="champ" value={ex.visual.secondaryColor ?? "#5f3dc4"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, visual: { ...ex.visual, secondaryColor: e.target.value } } } }))} />
          </label>
        </>
      )}
    </div>
  );
}

function BrandingPanel({ game, edit, lectureSeule }: {
  game: Game;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  lectureSeule: boolean;
}) {
  const b = game.branding ?? { name: "", primaryColor: "#1a7f37", secondaryColor: "#5f3dc4", fontFamily: "system-ui" };
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="detail" size={15} /> Branding
      </h3>
      <label className="text-xs flex gap-1 items-center">
        Nom :
        <input className="champ" value={b.name} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, name: e.target.value } } }))} />
      </label>
      <label className="text-xs flex gap-1 items-center mt-1">
        Couleur primaire :
        <input type="color" className="champ" value={b.primaryColor} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, primaryColor: e.target.value } } }))} />
      </label>
      <label className="text-xs flex gap-1 items-center">
        Couleur secondaire :
        <input type="color" className="champ" value={b.secondaryColor} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, secondaryColor: e.target.value } } }))} />
      </label>
      <label className="text-xs flex gap-1 items-center mt-1">
        Police :
        <input className="champ" value={b.fontFamily} disabled={lectureSeule} placeholder="system-ui" onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, fontFamily: e.target.value } } }))} />
      </label>
      <label className="text-xs flex gap-1 items-center">
        Logo (asset) :
        <input className="champ" value={b.logo ?? ""} disabled={lectureSeule} placeholder="assets/logo.png" onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, logo: e.target.value || undefined } } }))} />
      </label>
    </div>
  );
}

function refsObjet(game: Game, id: string): string[] {
  return game.nodes.filter((n) =>
    n.activation.requires.some((c) => (c.type === "ITEM_REQUIRED" || c.type === "ITEM_USED") && c.itemId === id) ||
    (n.discovery?.mode === "ON_ITEM" && n.discovery.itemId === id) ||
    (n.effects ?? []).some((e) => (e.type === "GIVE_ITEM" || e.type === "REMOVE_ITEM") && e.itemId === id) ||
    (n.inventoryRef ?? []).includes(id),
  ).map((n) => n.id);
}

function ObjetsPanel({ game, editGame, lectureSeule, onChoisir }: {
  game: Game;
  editGame: (fn: (g: Game) => Game) => void;
  lectureSeule: boolean;
  onChoisir: (id: string) => void;
}) {
  const objs = game.objects ?? [];
  const [nid, setNid] = useState("");
  const [nnom, setNnom] = useState("");
  const [nconso, setNconso] = useState(false);
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="package" size={15} /> Objets / inventaire ({objs.length})
      </h3>
      {objs.length ? (
        <ul className="text-xs">
          {objs.map((o) => {
            const refs = refsObjet(game, o.id);
            return (
              <li key={o.id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0" }}>
                <span style={{ flex: 1 }}><b>{o.id}</b> — {o.name}{o.consumable ? " · consommable" : ""}{refs.length ? ` · utilisé par : ${refs.join(", ")}` : " · non référencé"}</span>
                {!lectureSeule && refs.length > 0 && (
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => onChoisir(refs[0])} title={`Aller à ${refs[0]}`}>Voir</button>
                )}
                {!lectureSeule && (
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} aria-label={`Supprimer l'objet ${o.id}`} title="Supprimer" onClick={() => {
                    if (refs.length && !window.confirm(`Supprimer « ${o.id} » ? Utilisé par : ${refs.join(", ")}`)) return;
                    editGame((g) => setObjects(g, (g.objects ?? []).filter((x) => x.id !== o.id)));
                  }}><Icon name="fermer" size={14} /></button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs" style={{ color: "var(--ink-2)" }}>Aucun objet défini.</p>
      )}
      {!lectureSeule && (
        <div className="flex flex-wrap gap-1">
          <input className="champ" style={{ minHeight: 40 }} value={nid} size={10} placeholder="id (ex. cle)" aria-label="Identifiant du nouvel objet" onChange={(e) => setNid(e.target.value)} />
          <input className="champ" style={{ minHeight: 40 }} value={nnom} size={14} placeholder="Nom affiché" aria-label="Nom du nouvel objet" onChange={(e) => setNnom(e.target.value)} />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={nconso} onChange={(e) => setNconso(e.target.checked)} /> consommable</label>
          <button className="btn" onClick={() => {
            const id = nid.trim();
            if (!id) { alert("Identifiant d'objet requis."); return; }
            if (objs.some((o) => o.id === id)) { alert(`Objet « ${id} » déjà existant.`); return; }
            editGame((g) => addObject(g, { id, name: nnom.trim() || id, consumable: nconso }));
            setNid(""); setNnom(""); setNconso(false);
          }}><Icon name="ajouter" size={15} /> Objet</button>
        </div>
      )}
    </div>
  );
}

function ModePanel({ game, edit, lectureSeule }: {
  game: Game;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  lectureSeule: boolean;
}) {
  return (
    <div className="carte p-3">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="exemple" size={15} /> Mode et Difficulté
      </h3>
      <label className="text-xs flex gap-1 items-center">
        Mode :
        <select className="champ" value={game.gameMode ?? "NORMAL"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, gameMode: e.target.value as any } }))}>
          {["NORMAL", "ANIMATEUR", "SOIREE", "HARDCORE"].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="text-xs flex gap-1 items-center mt-1">
        Difficulté :
        <select className="champ" value={game.difficulty ?? "FAMILLE"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, difficulty: e.target.value as any } }))}>
          {["ENFANT", "FAMILLE", "EXPERT"].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
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
          <input className="champ" style={{ minHeight: 40, opacity: row.locked ? 0.6 : 1 }} value={row.key} size={12} disabled={lectureSeule || row.locked} title={row.locked ? "Clé verrouillée — non éditable" : undefined} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)) } }))} aria-label="Clé de texte" />
          <input className="champ flex-1" style={{ minHeight: 40, opacity: row.locked ? 0.6 : 1 }} value={row.value} size={16} disabled={lectureSeule || row.locked} title={row.locked ? "Texte verrouillé — non éditable" : undefined} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) } }))} aria-label="Texte" />
          {!row.value && <span className="puce" title="Aucune valeur saisie pour cette clé">manquant</span>}
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

function FileRelire({ game, meta, edit, manifest, lectureSeule, onChoisir, estAnimateur, exportPret }: {
  game: Game; meta: StudioMeta;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  manifest: ManifestFile[];
  lectureSeule: boolean;
  onChoisir: (id: string) => void;
  estAnimateur: boolean;
  exportPret: boolean;
}) {
  const [filtre, setFiltre] = useState<"draft" | "reviewed" | "published" | "tous">("draft");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const lignes = game.nodes.map((n) => ({ n, st: meta.status[n.id]?.state ?? "draft" as const }));
  const visibles = lignes.filter((l) => filtre === "tous" || l.st === filtre);
  const nbDraft = lignes.filter((l) => l.st === "draft").length;
  const qui = estAnimateur ? "animateur" : "auteur";
  const passer = (id: string, state: "draft" | "reviewed" | "published") =>
    edit((s) => ({ ...s, meta: setReview(s.meta, id, state, state === "draft" ? undefined : qui) }));
  const comptes = (s: "draft" | "reviewed" | "published") => lignes.filter((l) => l.st === s).length;
  return (
    <div className="carte p-3">
      <h2 className="text-base font-bold" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="oeil" size={17} /> Relecture — {nbDraft} brouillon{nbDraft > 1 ? "s" : ""}
      </h2>
      <p className="text-xs" style={{ color: "var(--ink-2)" }}>
        Tant qu'un élément est en brouillon, l'export est bloqué — le kiosque HOLD exige un jeu relu.
        Export : {exportPret ? (<span className="puce puce-ok">prêt</span>) : (<span className="puce puce-erreur">bloqué</span>)}
      </p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer par statut">
        {(["draft", "reviewed", "published", "tous"] as const).map((f) => (
          <button key={f} className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12, fontWeight: filtre === f ? 700 : 500 }}
            onClick={() => setFiltre(f)} aria-pressed={filtre === f}>
            {f === "tous" ? `Tous (${lignes.length})` : `${ETATS_FR[f]} (${comptes(f)})`}
          </button>
        ))}
      </div>
      <ul className="text-xs">
        {visibles.map(({ n, st }) => {
          const prov = meta.provenance[n.id];
          const detail = ouvert === n.id;
          return (
            <li key={n.id} className="carte p-2" style={{ boxShadow: "none", margin: "4px 0" }}>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <b>{n.id}</b>
                <span className="puce">{ETATS_FR[st]}</span>
                {meta.status[n.id]?.reviewedBy && <span className="puce">par {meta.status[n.id]?.reviewedBy}</span>}
                <span style={{ flex: 1 }} />
                <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => { onChoisir(n.id); setOuvert(detail ? null : n.id); }} title="Voir dans Composer et afficher la source">Voir</button>
                {!lectureSeule && st === "draft" && (
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => passer(n.id, "reviewed")} title="Passer en relu (enregistre le relecteur)">Relire</button>
                )}
                {!lectureSeule && st === "reviewed" && (
                  <>
                    <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => passer(n.id, "published")} title="Publier">Publier</button>
                    <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => passer(n.id, "draft")} title="Annuler la relecture (action distincte)">Annuler la relecture</button>
                  </>
                )}
                {!lectureSeule && st === "published" && (
                  <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => passer(n.id, "draft")} title="Annuler la relecture (action distincte)">Annuler la relecture</button>
                )}
              </span>
              {detail && (
                <div className="text-xs" style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span>Fournisseur : {prov?.providerId || "—"} · Licence : {prov?.license || "—"} · Source : {prov?.sourceUrl || "—"}</span>
                  <span>Module : {n.module.type} · Données : {JSON.stringify(n.module.data).slice(0, 200)}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!visibles.length && <p className="text-xs" style={{ color: "var(--ink-2)" }}>Aucun élément avec ce statut.</p>}
      <h3 className="text-sm font-bold">Assets du manifest ({manifest.length})</h3>
      <ul className="text-xs">{manifest.map((m) => <li key={m.path}>{m.path} v{m.version} {m.size}o</li>)}</ul>
    </div>
  );
}

function categorieC2(e: string): string {
  if (/cycle/i.test(e)) return "Cycles";
  if (/isEnding|FIN|atteign/i.test(e)) return "Atteignabilité";
  if (/pool|tirage|drawCount|candidat/i.test(e)) return "Pools";
  if (/hold|needsLock/i.test(e)) return "HOLD";
  if (/ITEM_|CLUE_|inventoryRef|discovery|objet|indice/i.test(e)) return "Références";
  if (/consumable/i.test(e)) return "Consommables";
  return "Autres";
}

function BlocValidation({ couches, game, onVoir }: {
  couches: { layer: number; errors: string[] }[];
  game: Game;
  onVoir: (id: string) => void;
}) {
  const c1 = couches.find((l) => l.layer === 1);
  const c2 = couches.find((l) => l.layer === 2);
  const groupes = new Map<string, string[]>();
  for (const e of c2?.errors ?? []) {
    const c = categorieC2(e);
    groupes.set(c, [...(groupes.get(c) ?? []), e]);
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="carte p-3" aria-label="Verdict couche 1">
        <h3 className="text-sm font-bold" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="valider" size={15} /> Couche 1 — forme AJV Draft-07
          {c1 && (c1.errors.length ? <span className="puce puce-erreur">{c1.errors.length} erreur(s)</span> : <span className="puce puce-ok">OK</span>)}
        </h3>
        {(c1?.errors.length ?? 0) > 0 && (
          <ul className="text-xs font-mono">{c1!.errors.map((e, i) => <li key={i} style={{ padding: "2px 0" }}>{e}</li>)}</ul>
        )}
      </div>
      <div className="carte p-3" aria-label="Verdict couche 2">
        <h3 className="text-sm font-bold" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="valider" size={15} /> Couche 2 — validateur applicatif
          {c2 ? (c2.errors.length ? <span className="puce puce-erreur">{c2.errors.length} erreur(s)</span> : <span className="puce puce-ok">OK</span>) : <span className="puce">non exécutée (C1 en échec)</span>}
        </h3>
        {[...groupes.entries()].map(([cat, errs]) => (
          <div key={cat}>
            <h4 className="text-xs font-bold" style={{ marginTop: 8 }}>{cat} ({errs.length})</h4>
            <ul className="text-xs">
              {errs.map((e, i) => {
                const cible = game.nodes.find((n) => e.includes(n.id));
                return (
                  <li key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                    <Icon name="alerte" size={14} />
                    <span style={{ flex: 1 }} title={e}>{erreurFR(e)}</span>
                    {cible && (
                      <button className="btn" style={{ minHeight: 32, padding: "0 10px", fontSize: 12 }} onClick={() => onVoir(cible.id)} title={`Aller à ${cible.id} dans Composer`}>
                        Voir {cible.id}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color: "var(--ink-2)" }} title="Règle exacte : C1 OK ∧ C2 OK ∧ aucun élément en brouillon (hors mode animateur) ; le kiosque HOLD exige en plus un jeu relu. Cette règle est calculée en un seul point et consommée par la barre globale, Relire et Exporter.">
        Export possible = C1 OK ∧ C2 OK ∧ aucun brouillon (hors animateur).
      </p>
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
  reculer: () => void; nbTermines: number;
  holdSim: "none" | "locked"; onHoldLock: () => void; onHoldExit: () => void;
}) {
  const { game } = props;
  const holdMode = game.global?.holdMode ?? "none";
  const fixtureOk = props.testAll == null || props.testAll.startsWith("aucun") ? null : !props.testAll.includes("BLOQUÉE");
  const pools = game.nodes.filter((n) => n.randomPool);
  const sig = SIGNAUX.find((s) => s.m === props.sim.precision) ?? SIGNAUX[0];
  const bascule = (k: "present" | "dwell" | "through", id: string) =>
    props.setSim((s) => ({ ...s, [k]: s[k].includes(id) ? s[k].filter((x) => x !== id) : [...s[k], id] }));
  return (
    <div className="carte p-3 flex flex-col gap-2">
      <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
        <Icon name="essai" size={15} /> Essai du parcours (triche tracée)
      </h3>
      <p className="text-xs" style={{ color: "var(--ink-2)" }}>La prévisualisation n'écrit jamais dans le JSON source : tout ici est simulation.</p>
      <div className="carte p-2" style={{ boxShadow: "none" }} aria-label="Panneau de triche">
        <h4 className="text-xs font-bold">Panneau de triche — chaque event porte le flag triche</h4>
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
      <div className="flex gap-1 items-center flex-wrap">
        <span className="text-xs">HOLD simulé : {props.holdSim === "locked" ? (<span className="puce puce-erreur">verrouillé</span>) : (<span className="puce">inactif</span>)}</span>
        <button className="btn" style={{ minHeight: 36 }} onClick={props.onHoldLock} disabled={props.holdSim === "locked"} title="Simuler un verrouillage kiosque (forceHoldLock)">Simuler verrouillage</button>
        <button className="btn" style={{ minHeight: 36 }} onClick={props.onHoldExit} disabled={props.holdSim === "none"} title="Simuler une sortie animateur (forceHoldExit)">Simuler sortie animateur</button>
      </div>
      </div>
      <div>File d'attente : {props.file.length ? props.file.join(", ") : "—"} | Ouverte : {props.activeId ?? "—"}</div>
      <div className="flex gap-1">
        <button className="btn" style={{ minHeight: 36 }} onClick={() => { if (!props.activeId && props.file[0]) props.ouvrir(props.file[0]); }} disabled={!!props.activeId || !props.file.length} title="Ouvrir la première étape en file (avancer d'un pas)">Avancer d'un pas</button>
        <button className="btn" style={{ minHeight: 36 }} onClick={props.reculer} disabled={props.nbTermines === 0} title="Rouvrir la dernière étape terminée (reculer d'un pas)">Reculer d'un pas</button>
      </div>
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
      {props.testAll && <div className="text-xs" style={{ display: "flex", gap: 6, alignItems: "center" }}>{fixtureOk == null ? null : fixtureOk ? (<span className="puce puce-ok">PASS</span>) : (<span className="puce puce-erreur">FAIL</span>)}<span>{props.testAll}</span></div>}
      <div className="max-h-24 overflow-auto text-xs"><b>Journal</b><ul>{props.log.map((l, i) => <li key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}><span className="puce">SIMULÉ</span><span className="puce">hold:{holdMode}</span><span>{l}</span></li>)}</ul></div>
    </div>
  );
}
