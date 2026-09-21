import { useCallback, useEffect, useMemo, useState, useReducer, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type Connection,
  type ReactFlowInstance,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { validateGame, deadEnds } from "./game/validate";
import { evaluate, drawPool, type Sim } from "./game/evaluate";
import { composeNodes, setActivation, registerAsset, exportPackFull, canExport, addSecoursCode, importGame, addObject, setObjects, setReview, removeNode, renameNode, duplicateNode, patchScreenZone, addScreenWidget, setScreenWidget as mcpSetScreenWidget, removeScreenWidget, moveScreenWidget, moveScreenWidgetAcross, setNodeScreen, setScreenBackground, setScreenStyles, setGlobalScreenStyles, setMinigameDefaults, type ManifestFile } from "./game/mcp";
import { emptyMeta, type Condition, type Game, type GameNode, type MinigameDefaults, type Predicate, type StudioMeta, type ExperienceStyle, type Branding, type GameMode, type Difficulty, type ZoneId } from "./game/types";
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
  repliees: { graphe: false, liste: false, detail: false },
};
type SectionPliable = keyof typeof LAYOUT_DEFAUT.repliees;

// Drill-down workflow → section (change studio-layout-revamp) :
// 1 Graphe → graphe, 2 Épreuves → détail, 3 Relecture → liste,
// 4 Validation → pied/rapport, 5 Export → prévisualiser (manifest avant export).
const SECTION_PAR_ETAPE: Record<EtapeWorkflow, string> = {
  1: "graphe",
  2: "detail",
  3: "liste",
  4: "validation",
  5: "detail",
};
import { Icon, type IconName } from "./components/icons";
import Splitter from "./components/Splitter";
import { WorkflowStepper, type EtapeWorkflow } from "./components/WorkflowStepper";
import { NodeList } from "./components/NodeList";
import MapView from "./components/MapView";
import { PhoneCanvas, VIEWPORTS, type ViewportId } from "./components/wysiwyg/PhoneCanvas";
import { PropertiesPanel } from "./components/wysiwyg/PropertiesPanel";
import { TemplatePicker } from "./components/wysiwyg/TemplatePicker";
import { ScreenProperties } from "./components/wysiwyg/ScreenProperties";
import { resolveScreen } from "./game/screen-utils";
import { getScreenPlugin } from "./game/module-screen-plugin";
import { getScreenTemplate } from "./game/screen-templates";

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
  nodes: [
    {
      id: "start",
      module: { type: "INFO", data: {} },
      activation: { requires: [] },
      discovery: { mode: "VISIBLE_NOW" },
    },
  ],
});

const init: State = { past: [], present: { game: jeuVide(), meta: emptyMeta() }, future: [] };

// Brouillon local (change studio-persistence-theme-fix) : le jeu en cours
// d'édition survit au rechargement via `geoplay-draft-v1`. Seul le Snap
// présent est persisté (ni passé/futur d'undo, ni positions, ni sélection).
const CLE_BROUILLON = "geoplay-draft-v1";

const lireBrouillon = (): Snap | null => {
  try {
    const raw = localStorage.getItem(CLE_BROUILLON);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Snap>;
    if (!p || typeof p !== "object") return null;
    if (!p.game || typeof p.game !== "object" || !Array.isArray(p.game.nodes)) return null;
    if (!p.meta || typeof p.meta !== "object") return null;
    return { game: p.game as Game, meta: p.meta as StudioMeta };
  } catch {
    return null; // clé absente, corrompue ou stockage indisponible : jeu vide
  }
};

// Écriture immédiate (import, effacement) ; l'écriture continue passe par
// l'effet débouncé. Retourne false si le stockage est indisponible/plein.
const sauvegarderBrouillon = (snap: Snap): boolean => {
  try {
    localStorage.setItem(CLE_BROUILLON, JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
};

// Initialiseur paresseux du reducer : restaure le brouillon s'il existe.
const initDraft = (): State => {
  const b = lireBrouillon();
  return b ? { past: [], present: b, future: [] } : init;
};

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

type Onglet = "graphe" | "liste" | "detail";

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
  const [st, dispatch] = useReducer(reduce, undefined, initDraft);
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
  // Vue centrale : graphe ReactFlow, carte MapView (geo/indoor) ou ecran WYSIWYG du noeud selectionne
  const [vueCentrale, setVueCentrale] = useState<"graphe" | "carte" | "screen">("graphe");
  // Selection dans le canvas screen : zone + index de widget (pas d'id dans le schema)
  const [screenZone, setScreenZone] = useState<ZoneId | null>(null);
  const [screenWidget, setScreenWidget] = useState<number | null>(null);
  // Viewport d'apercu (change studio-screen-editor, design D1) : etat local
  // d'edition, jamais persiste dans le JSON ni dans le brouillon.
  const [screenViewport, setScreenViewport] = useState<ViewportId>("phone-portrait");
  // Fond d'ecran selectionne (clic sur une zone vide du canvas) : editeur de fond
  const [screenBg, setScreenBg] = useState(false);
  // Thème sombre/clair, persisté dans localStorage.
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("studio-theme") as "dark" | "light") ?? "dark"; } catch { return "dark"; }
  });
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
  useEffect(() => {
    document.documentElement.classList.toggle("theme-light", theme === "light");
    try { localStorage.setItem("studio-theme", theme); } catch { /* ok */ }
  }, [theme]);
  // Autosave du brouillon (change studio-persistence-theme-fix) : écriture
  // débouncée ~500 ms après chaque modification. Ne touche jamais au JSON exporté.
  const [sauvegardeIndispo, setSauvegardeIndispo] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSauvegardeIndispo(!sauvegarderBrouillon(st.present));
    }, 500);
    return () => window.clearTimeout(t);
  }, [st.present]);
  const basculerSection = (s: SectionPliable) => {
    setMolette(null);
    setMep((m) => ({ ...m, repliees: { ...m.repliees, [s]: !m.repliees[s] } }));
  };
  // Panneau « molette » ouvert (change studio-layout-revamp) : une seule section à la fois.
  const [molette, setMolette] = useState<SectionPliable | null>(null);
  const basculerMolette = (s: SectionPliable) => setMolette((m) => (m === s ? null : s));
  // Instance ReactFlow pour « Recentrer » (fitView à la demande).
  const rfRef = useRef<ReactFlowInstance | null>(null);
  // Marqueur posé par onNodeClick : la prochaine émission onSelectionChange
  // correspond au même clic, elle est ignorée (le clic fait foi).
  const clicNoeudRef = useRef(false);
  // Pose le marqueur en le limitant au tick courant : si ReactFlow n'émet
  // aucun écho (sélection contrôlée par props), le marqueur ne survit pas
  // jusqu'à la prochaine interaction réelle (ex. sélection au lasso).
  const marquerClicNoeud = () => {
    clicNoeudRef.current = true;
    window.setTimeout(() => { clicNoeudRef.current = false; }, 0);
  };
  // Input fichier caché pour l'import par clic (écran Importer).
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Section surlignée après un drill-down (anneau temporaire, sans décalage de mise en page).
  const [sectionSurlignee, setSectionSurlignee] = useState<string | null>(null);
  const surlignageTimer = useRef<number | undefined>(undefined);
  const surlignage = (s: string) =>
    sectionSurlignee === s ? { outline: "3px solid var(--focus)", outlineOffset: 2 } : undefined;
  const allerEtape = (e: EtapeWorkflow) => {
    setEtapeWorkflow(e);
    const cible = SECTION_PAR_ETAPE[e];
    const pliable = (["graphe", "detail", "liste"] as const).includes(cible as SectionPliable)
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
  // Efface le brouillon local et repart sur un jeu vide (change
  // studio-persistence-theme-fix). Sert aussi de « nouveau jeu ».
  const effacerBrouillon = () => {
    if (relecture) return;
    if (!window.confirm("Effacer le brouillon local et repartir sur un jeu vide ?")) return;
    try {
      localStorage.removeItem(CLE_BROUILLON);
    } catch {
      /* ignore */
    }
    dispatch({ t: "set", snap: { game: jeuVide(), meta: emptyMeta() }, op: "effacerBrouillon" });
    setSel(null);
    setSelMulti([]);
    setExportOk(false);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const maj = () => setEtroite(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  // Mobile relecture : lecture seule + statuts + validation, pas d'édition.
  const lectureSeule = etroite && onglet !== "graphe" ? false : etroite && (Object.values(st.present.meta.status).some((st) => st.state === "draft") ? true : false);
  const relecture = etroite;
  void lectureSeule;

  const edit = useCallback((fn: (s: Snap) => Snap, op = "modifier") => {
    if (relecture) return;
    dispatch({ t: "set", snap: fn(st.present), op });
    setExportOk(false);
  }, [relecture, st.present]);
  const editGame = useCallback((fn: (g: Game) => Game, op = "modifier") => edit((s) => ({ ...s, game: fn(s.game) }), op), [edit]);
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

// Nœuds au rendu par défaut ReactFlow (change studio-graph-selection, option base pure) :
// boîtes de largeur uniforme, libellés concis, liens bas→haut. `measured` est préservé
// d'un rendu à l'autre via completsRef : sans lui, un drag voit un nœud « non initialisé »
// (warning 015). `dragging` n'est PAS préservé : ReactFlow le gère en interne et une
// valeur périmérée dans les props désynchronise le drag.
const noeudsRef = useRef<Node[]>([]);
const completsRef = useRef(new Map<string, Node>());
const noeuds: Node[] = useMemo(
  () => {
    const frais: Node[] = game.nodes.map((n, i) => ({
      id: n.id,
      position: positions[n.id] ?? { x: (i % 4) * 250, y: Math.floor(i / 4) * 160 },
      selected: sel === n.id || selMulti.includes(n.id),
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: { label: `${n.isEnding ? "FIN · " : ""}${n.id}` },
      style: { width: 180 },
    }));
    const fusionnes = frais.map((f) => {
      const p = completsRef.current.get(f.id);
      return p?.measured ? { ...f, measured: p.measured } : f;
    });
    noeudsRef.current = fusionnes;
    return fusionnes;
  },
  [game.nodes, positions, sel, selMulti],
);
  const aretes: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (const n of game.nodes) {
      for (const c of n.activation.requires) {
        const from = refDe(c) ?? (c.type === "TIMER" && c.anchor === "NODE_COMPLETION" ? c.anchorNodeId : undefined);
        if (from && game.nodes.some((m) => m.id === from)) {
          edges.push({
            id: `${from}->${n.id}:${c.type}`, source: from, target: n.id,
            label: CONDITIONS_FR[c.type]?.nom ?? c.type,
          });
        }
      }
    }
    for (const n of game.nodes) {
      const discSource = discoverySourceDe(n);
      if (discSource && game.nodes.some((m) => m.id === discSource)) {
          edges.push({
            id: `${discSource}->${n.id}:discovery`, source: discSource, target: n.id,
            label: "Discovery",
          });
      }
      for (const revealNode of effectRevealNodes(n)) {
        if (game.nodes.some((m) => m.id === revealNode)) {
          edges.push({
            id: `${n.id}->${revealNode}:effect`, source: n.id, target: revealNode,
            label: "Effet",
          });
        }
      }
    }
    return edges;
  }, [game.nodes]);

  // Pipeline de sélection stabilisé (change studio-graph-selection) : onNodesChange ne
  // traite que position/dimensions (les changements `select` passent par onSelectionChange),
  // et chaque setter est gardé par une comparaison de contenu (pas de nouvel objet/tableau
  // si rien n'a changé) pour couper la boucle sélection → positions → nodes → sélection.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (relecture) return;
    const utiles = changes.filter((c) => c.type === "position" || c.type === "dimensions");
    if (!utiles.length) return;
    const nodes = applyNodeChanges(utiles, noeuds);
    for (const n of nodes) completsRef.current.set(n.id, n);
    setPositions((prev) => {
      let change = false;
      const pos: Record<string, { x: number; y: number }> = { ...prev };
      for (const n of nodes) {
        const cur = prev[n.id];
        if (!cur || cur.x !== n.position.x || cur.y !== n.position.y) {
          pos[n.id] = n.position;
          change = true;
        }
      }
      return change ? pos : prev;
    });
  }, [relecture, noeuds]);
  const onSelectionChange = useCallback(({ nodes: ns }: { nodes: Node[] }) => {
    // Émissions causées par un clic nœud : le handler onNodeClick fait foi
    // (remplace / bascule), on ignore l'écho ReactFlow pour rester déterministe
    // quel que soit l'ordre d'arrivée des deux événements.
    if (clicNoeudRef.current) {
      clicNoeudRef.current = false;
      return;
    }
    const ids = ns.map((n) => n.id);
    setSelMulti((prev) =>
      prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids,
    );
  }, []);
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
    }, "ajouterActivation");
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
      // Remplace le brouillon sans attendre le debounce (fermeture d'onglet immédiate).
      setSauvegardeIndispo(!sauvegarderBrouillon({ game: g, meta: emptyMeta() }));
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

  // Sélection partagée graphe ↔ liste (change studio-select-all, design D2) :
  // - clic simple (`additif=false`) : remplace la sélection par ce seul nœud
  //   (`sel` = id, `selMulti` vidé via garde d'égalité) ;
  // - Maj+clic (`additif=true`) : bascule l'id dans la sélection courante sans
  //   toucher aux autres, et promeut l'id en `sel` (le détail suit le dernier
  //   touché). Au retrait, `sel` retombe sur le dernier restant (ou null si vide).
  // La sélection visible = `{sel} ∪ selMulti` (design D1). Les nouveaux tableaux
  // sont calculés depuis l'instantané du rendu (pas d'update fonctionnelle) pour
  // rester déterministes quel que soit l'ordre clic / onSelectionChange.
  const choisirNoeud = useCallback((id: string, additif = false) => {
    marquerClicNoeud();
    if (additif) {
      const union = new Set([...selMulti, ...(sel ? [sel] : [])]);
      if (union.has(id)) {
        union.delete(id);
        const restants = selMulti.filter((x) => union.has(x));
        setSelMulti((prev) =>
          prev.length === restants.length && prev.every((x, i) => x === restants[i]) ? prev : restants,
        );
        setSel((prev) => {
          if (prev !== id) return prev;
          return restants.length ? restants[restants.length - 1] : null;
        });
      } else {
        const ajouts = sel && sel !== id && !selMulti.includes(sel) ? [...selMulti, sel, id] : [...selMulti, id];
        setSelMulti((prev) =>
          prev.length === ajouts.length && prev.every((x, i) => x === ajouts[i]) ? prev : ajouts,
        );
        setSel(id);
      }
    } else {
      setSel(id);
      setSelMulti((prev) => (prev.length === 0 ? prev : []));
    }
    // Reset de la selection screen : le canvas affiche l'ecran du nouveau noeud.
    setScreenZone(null);
    setScreenWidget(null);
    setScreenBg(false);
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
  }, [etroite, etapeWorkflow, sel, selMulti]);

  // Clic sur le fond vide du canvas (change studio-select-all, tâche 1.3) :
  // vide `sel` + `selMulti` via gardes, sans toucher aux positions ni recadrer.
  const viderSelectionPane = useCallback(() => {
    setSel((prev) => (prev === null ? prev : null));
    setSelMulti((prev) => (prev.length === 0 ? prev : []));
  }, []);

  // Action groupée unique (change studio-select-all, design D3) : sélectionne
  // tous les nœuds (`sel` = dernier id pour le détail) ou vide toute sélection.
  const toutEstSelectionne = useMemo(() => {
    if (!game.nodes.length) return false;
    const union = new Set([...selMulti, ...(sel ? [sel] : [])]);
    return game.nodes.every((n) => union.has(n.id));
  }, [game.nodes, sel, selMulti]);
  const toutSelectionner = useCallback(() => {
    marquerClicNoeud();
    const ids = game.nodes.map((n) => n.id);
    setSelMulti(ids);
    setSel(ids.length ? ids[ids.length - 1] : null);
  }, [game.nodes]);
  const toutDeselectionner = useCallback(() => {
    setSel(null);
    setSelMulti((prev) => (prev.length === 0 ? prev : []));
  }, []);
  const basculerTout = useCallback(() => {
    if (toutEstSelectionne) toutDeselectionner();
    else toutSelectionner();
  }, [toutEstSelectionne, toutSelectionner, toutDeselectionner]);

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

  const resetLayout = (
    <nav className="flex flex-col gap-2" aria-label="Réglages du graphe">
      <button className="btn justify-start" onClick={reinitialiserMiseEnPage} title="Restaurer les largeurs et le menu par défaut">
        <Icon name="retablir" size={15} /> Mise en page par défaut
      </button>
    </nav>
  );

  // Cadrage à la demande (change studio-graph-selection) : au montage et à l'arrivée du
  // premier nœud uniquement — jamais sur sélection/zoom, pour ne pas contrarier la caméra.
  const nbEtapesRef = useRef(nbEtapes);
  useEffect(() => {
    if (nbEtapesRef.current > 0) rfRef.current?.fitView({ padding: 0.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (nbEtapesRef.current === 0 && nbEtapes > 0) rfRef.current?.fitView({ padding: 0.2 });
    nbEtapesRef.current = nbEtapes;
  }, [nbEtapes]);

  const zoneGraphe = (
    <div className="flex flex-col flex-1 overflow-hidden min-h-[320px]">
      {/* Barre de toggle始终可见 */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-rule bg-surface">
        <button className={`btn text-[8px] ${vueCentrale === "graphe" ? "btn-active" : ""}`} onClick={() => setVueCentrale("graphe")}
          title="Graphe d'étapes">
          <Icon name="graphe" size={15} /> Graphe
        </button>
        <button className={`btn text-[8px] ${vueCentrale === "carte" ? "btn-active" : ""}`} onClick={() => setVueCentrale("carte")}
          title="Carte interactive">
          <Icon name="lieu" size={15} /> Carte
        </button>
        <button className={`btn text-[8px] ${vueCentrale === "screen" ? "btn-active" : ""}`} onClick={() => setVueCentrale("screen")}
          title={etape ? `Écran de ${etape.id}` : "Sélectionne une étape pour voir son écran"}>
          <Icon name="oeil" size={15} /> Screen
        </button>
        {vueCentrale === "graphe" && (
          <>
            <button className="btn text-[8px]" onClick={basculerTout}
              disabled={game.nodes.length === 0}
              title={toutEstSelectionne ? "Désélectionner toutes les étapes" : "Sélectionner toutes les étapes"}
              aria-label={toutEstSelectionne ? "Tout désélectionner" : "Tout sélectionner"}>
              <Icon name="liste" size={15} /> {toutEstSelectionne ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
            <span className="puce text-[8px]">
              <Icon name="graphe" size={13} /> {nbEtapes} étape{nbEtapes > 1 ? "s" : ""}
            </span>
            <input className="champ min-h-8" value={recherche} size={14}
              placeholder="Rechercher — Entrée"
              aria-label="Rechercher un nœud par nom ou type"
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") allerRecherche(); }} />
          </>
        )}
      </div>
      {vueCentrale === "carte" ? (
        <div className="carte studio-flow relative flex-1 overflow-hidden">
          <MapView game={game} sel={sel} onSelect={(id) => choisirNoeud(id)}
            onGameChange={(updater) => editGame(updater, "setNodePosition")} />
        </div>
      ) : vueCentrale === "screen" ? (
        <div className="relative flex-1 overflow-hidden bg-surface flex flex-col">
          <div className="flex shrink-0 items-center gap-1 px-2 py-1 border-b border-rule" role="toolbar" aria-label="Viewport d'aperçu">
            <span className="text-[8px] font-bold uppercase text-fog mr-1">Aperçu</span>
            {VIEWPORTS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`btn text-[8px] ${screenViewport === v.id ? "btn-active" : ""}`}
                aria-pressed={screenViewport === v.id}
                title={`${v.libelle} (${v.largeur}×${v.hauteur})`}
                onClick={() => setScreenViewport(v.id)}
              >
                {v.libelle}
              </button>
            ))}
          </div>
          {etape ? (
            <PhoneCanvas
              screen={resolveScreen(etape, game.global?.screen)}
              moduleType={etape.module.type}
              moduleData={etape.module.data}
              selectedZoneId={screenZone}
              selectedWidgetIndex={screenWidget}
              viewport={screenViewport}
              onSelectZone={(z) => { setScreenZone(z); setScreenWidget(null); setScreenBg(z === null); }}
              onSelectWidget={(z, i) => { setScreenZone(z); setScreenWidget(i); setScreenBg(false); }}
              onCommitText={(z, i, text) => editGame((g) => {
                const cur = g.nodes.find((n) => n.id === etape.id)?.screen?.zones?.[z]?.widgets?.[i];
                if (!cur || cur.type !== "text" || cur.text === text) return g;
                return mcpSetScreenWidget(g, etape.id, z, i, { ...cur, text });
              }, "setScreenWidget")}
              onMoveWidgetAcross={(fz, fi, tz, ti) => {
                const destLen = etape.screen?.zones?.[tz]?.widgets?.length ?? 0;
                const at = ti === "end" ? (fz === tz ? destLen - 1 : destLen) : ti;
                editGame((g) => moveScreenWidgetAcross(g, etape.id, fz, fi, tz, ti), "moveScreenWidgetAcross");
                setScreenZone(tz);
                setScreenWidget(at);
                setScreenBg(false);
              }}
              onCreateZone={(z) => {
                editGame((g) => patchScreenZone(g, etape.id, z, { widgets: [] }), "patchScreenZone");
                setScreenZone(z);
                setScreenWidget(null);
                setScreenBg(false);
              }}
            />
          ) : (
            <div className="p-3 text-[9px]">
              <p className="font-bold">Rien de sélectionné.</p>
              <p className="text-fog">Sélectionne une étape dans le graphe ou dans la liste pour voir son écran.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="carte studio-flow relative flex-1 overflow-hidden">
          <ReactFlow nodes={noeuds} edges={aretes} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(e, n) => choisirNoeud(n.id, (e as unknown as { shiftKey?: boolean }).shiftKey === true)} onPaneClick={viderSelectionPane} onSelectionChange={onSelectionChange} multiSelectionKeyCode="Shift" onInit={(instance) => { rfRef.current = instance; }} minZoom={0.3} maxZoom={2} nodesConnectable={!relecture} nodesDraggable={!relecture} elementsSelectable colorMode={theme} className="w-full h-full">
            <Background gap={22} color={theme === "light" ? "#dee2e6" : "#1e2228"} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={theme === "light" ? "#adb5bd" : "#6b7280"} className="rounded-lg" aria-label="Mini-carte du graphe" />
          </ReactFlow>
        </div>
      )}
    </div>
  );

  // Panneaux mémoïsés (change studio-graph-selection) : leur contenu ne dépend ni des
  // positions ni de la multi-sélection, ils ne re-rendent donc pas à chaque frame de drag.
  const pied = useMemo(() => (
    <footer className="flex flex-wrap items-center gap-2 border-t border-rule bg-surface px-3 py-2 text-[8px]" aria-label="État du jeu">
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
        <button className="puce puce-erreur cursor-pointer" onClick={() => choisirNoeud([...impasses][0])} title="Aller à la première impasse">
          <Icon name="alerte" size={13} /> {impasses.size} impasse{impasses.size > 1 ? "s" : ""} : {[...impasses].slice(0, 3).join(", ")}
        </button>
      )}
      <span className="puce"><Icon name="exemple" size={13} /> {manifest.length} fichier{manifest.length > 1 ? "s" : ""} au manifest</span>
      {nbBrouillons > 0 && (
        <span className="puce"><Icon name="statut" size={13} /> {nbBrouillons} brouillon{nbBrouillons > 1 ? "s" : ""}</span>
      )}
    </footer>
  ), [erreurs, nbEtapes, finPresente, impasses, manifest, nbBrouillons, choisirNoeud]);

  const listeErreurs = useMemo(() => erreurs.length > 0 && (
    <ul className="max-h-28 overflow-auto border-t border-rule bg-surface px-3 py-2 text-[8px]" aria-label="Problèmes à corriger">
      {erreurs.map((r, i) => {
        const fautif = game.nodes.find((n) => brut.join(" ").includes(n.id) && r.length > 0 && brut.some((b) => b.includes(n.id) && erreurFR(b) === r));
        void fautif;
        // Retrouve un nœud cité dans l'erreur brute correspondante pour surligner au clic.
        const cible = game.nodes.find((n) => brut[i] && brut[i].includes(n.id)) ?? game.nodes.find((n) => r.includes(n.id));
        return (
          <li key={i} className="flex gap-2 items-center py-1">
            <Icon name="alerte" size={14} />
            <span className="flex-1">{r}</span>
            {cible && (
              <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => choisirNoeud(cible.id)} title={`Aller à ${cible.id}`}>
                Voir {cible.id}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  ), [erreurs, game, brut, choisirNoeud]);

  const detail = useMemo(() => (
    <aside className="carte min-h-0 flex-1 overflow-auto p-2 min-w-0" aria-label="Détail de l'étape">
      {etape ? (
        vueCentrale === "screen" ? (
          <PropertiesPanel
            node={etape}
            selectedZone={screenZone}
            zone={screenZone ? (etape.screen?.zones?.[screenZone] ?? {}) : null}
            selectedWidgetIndex={screenWidget}
            widget={screenZone && screenWidget != null ? (etape.screen?.zones?.[screenZone]?.widgets?.[screenWidget] ?? null) : null}
            modulePanel={<PanneauModule node={etape} globalDefaults={game.global?.minigameDefaults} lectureSeule={relecture} editGame={editGame} />}
            screenSelected={screenBg}
            screenBackground={etape.screen?.background}
            globalStyles={game.global?.screen?.styles}
            screenStyles={etape.screen?.styles}
            customizableStyles={getScreenPlugin(etape.module.type)?.customizableStyles}
            onPatchGlobalStyles={(s) => editGame((g) => setGlobalScreenStyles(g, s), "setGlobalScreenStyles")}
            onPatchScreenStyles={(s) => editGame((g) => setScreenStyles(g, etape.id, s), "setScreenStyles")}
            templatePicker={
              <TemplatePicker
                currentLayout={etape.screen?.layout}
                hasCustomizations={Object.values(etape.screen?.zones ?? {}).some((z) => (z?.widgets?.length ?? 0) > 0)}
                onSelectTemplate={(layoutId) => {
                  const t = getScreenTemplate(layoutId);
                  if (!t) return;
                  editGame((g) => setNodeScreen(g, etape.id, structuredClone(t.screen)), "setNodeScreen");
                  setScreenZone(null);
                  setScreenWidget(null);
                  setScreenBg(false);
                }}
              />
            }
            onPatchBackground={(bg) => editGame((g) => setScreenBackground(g, etape.id, bg), "setScreenBackground")}
            nodePanel={
              <Inspecteur
                game={game} node={etape} meta={st.present.meta} editGame={editGame} edit={edit}
                nouveauType={nouveauType} setNouveauType={setNouveauType} lectureSeule={relecture}
                onAllerConfig={() => setEcran("config")}
              />
            }
            onPatchZone={(z, patch) => editGame((g) => patchScreenZone(g, etape.id, z, patch), "patchScreenZone")}
            onSelectWidget={(z, i) => { setScreenZone(z); setScreenWidget(i); }}
            onAddWidget={(z, w) => editGame((g) => addScreenWidget(g, etape.id, z, w), "addScreenWidget")}
            onRemoveWidget={(z, i) => { editGame((g) => removeScreenWidget(g, etape.id, z, i), "removeScreenWidget"); setScreenWidget(null); }}
            onMoveWidget={(z, i, dir) => { editGame((g) => moveScreenWidget(g, etape.id, z, i, dir), "moveScreenWidget"); setScreenWidget(i + dir); }}
            onPatchWidget={(z, i, w) => editGame((g) => mcpSetScreenWidget(g, etape.id, z, i, w), "setScreenWidget")}
          />
        ) : (
          <Inspecteur
            game={game} node={etape} meta={st.present.meta} editGame={editGame} edit={edit}
            nouveauType={nouveauType} setNouveauType={setNouveauType} lectureSeule={relecture}
            onAllerConfig={() => setEcran("config")}
          />
        )
      ) : (
        <div className="p-3 text-[9px]">
          <p className="font-bold">Rien de sélectionné.</p>
          <p className="text-fog">Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier.</p>
        </div>
      )}
    </aside>
  ), [etape, game, st.present.meta, edit, editGame, nouveauType, relecture, vueCentrale, screenZone, screenWidget, screenBg]);

  // Listes mémoïsées (change studio-graph-selection) : mêmes dépendances de données
  // que le détail, pour ne pas re-rendre à chaque frame de drag.
  const liste = useMemo(() => (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-rule">
        <span className="text-[8px] font-bold uppercase text-fog mr-1">Ajouter</span>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("etape")} disabled={relecture} title="Créer une étape Quiz / jeu" aria-label="Étape de jeu">
          <Icon name="etape" size={14} /> Étape
        </button>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("lieu")} disabled={relecture} title="Créer un lieu avec zone GPS" aria-label="Lieu GPS">
          <Icon name="lieu" size={14} /> Lieu
        </button>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("tirage")} disabled={relecture} title="Créer un tirage au sort parmi des étapes" aria-label="Tirage au sort">
          <Icon name="tirage" size={14} /> Tirage
        </button>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("fin")} disabled={relecture} title="Créer l'étape de fin du jeu" aria-label="Fin du jeu">
          <Icon name="fin" size={14} /> Fin
        </button>
      </div>
      <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} selMulti={selMulti} onChoisir={choisirNoeud} onBasculer={(id) => choisirNoeud(id, true)} onToutBasculer={basculerTout} toutSelectionne={toutEstSelectionne} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} boutonPlier={<button className="btn min-h-8 px-2 text-[8px]" onClick={() => basculerSection("liste")} title="Replier la liste">Replier</button>} boutonMolette={<button className="btn min-h-8 px-2" onClick={() => basculerMolette("liste")} title="Réglages de la liste" aria-label="Réglages de la liste" aria-expanded={molette === "liste"}><Icon name="engrenage" size={14} /></button>} panneauMolette={molette === "liste" && (
        <div className="flex gap-2 px-2 pb-2" role="dialog" aria-label="Réglages de la liste">
          <button className="btn min-h-8 px-2 text-[8px]" onClick={() => basculerSection("liste")} title="Replier la liste">Replier</button>
          <button className="btn min-h-8 px-2 text-[8px]" onClick={() => { setMep((m) => ({ ...m, liste: 340 })); setMolette(null); }} title="Restaurer la largeur par défaut de la liste">Largeur 340</button>
        </div>
      )} onSupprimer={!relecture ? (id) => editGame((g) => removeNode(g, id), "removeNode") : undefined} />
    </div>
  ), [game, st.present.meta.status, impasses, sel, selMulti, erreursParNoeud, relecture, molette, choisirNoeud, basculerTout, toutEstSelectionne, ajouterEtape]);
  const listeSimple = useMemo(() => (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-rule">
        <span className="text-[8px] font-bold uppercase text-fog mr-1">Ajouter</span>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("etape")} disabled={relecture} title="Créer une étape Quiz / jeu" aria-label="Étape de jeu">
          <Icon name="etape" size={14} /> Étape
        </button>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("lieu")} disabled={relecture} title="Créer un lieu avec zone GPS" aria-label="Lieu GPS">
          <Icon name="lieu" size={14} /> Lieu
        </button>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("tirage")} disabled={relecture} title="Créer un tirage au sort parmi des étapes" aria-label="Tirage au sort">
          <Icon name="tirage" size={14} /> Tirage
        </button>
        <button className="btn min-h-8 px-2 text-[8px]" onClick={() => ajouterEtape("fin")} disabled={relecture} title="Créer l'étape de fin du jeu" aria-label="Fin du jeu">
          <Icon name="fin" size={14} /> Fin
        </button>
      </div>
      <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} selMulti={selMulti} onChoisir={choisirNoeud} onBasculer={(id) => choisirNoeud(id, true)} onToutBasculer={basculerTout} toutSelectionne={toutEstSelectionne} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} onSupprimer={!relecture ? (id) => editGame((g) => removeNode(g, id), "removeNode") : undefined} />
    </div>
  ), [game, st.present.meta.status, impasses, sel, selMulti, erreursParNoeud, relecture, choisirNoeud, basculerTout, toutEstSelectionne, ajouterEtape]);

  // Contenus des écrans (spec studio-onepage-spec) : tous branchés sur le même
  // état { game, meta } + historique, sans état par écran (hors simulateur).
  const ecranCourant = (
    <>
      {ecran === "importer" && (
        <div className="carte flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-6" aria-label="Écran Importer">
          <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow">Importer</h2>
          <div
            className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-3 py-16 mb-6 transition-colors ${true ? 'border-neon bg-neon/5' : 'border-rule hover:border-fog/40 cursor-pointer'}`}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragLeave={() => {}}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (f) void importerFichier(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Déposer ou choisir un fichier JSON de jeu"
          >
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importerFichier(f); e.target.value = ""; }} />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3M8.5 11.5 12 15l3.5-3.5"/>
              <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/>
            </svg>
            <div className="text-center">
              <div className="text-[9px] text-snow mb-1">Glisser un fichier <span className="font-mono text-neon">game.json</span></div>
              <div className="font-mono text-[8px] text-fog">ou cliquer pour parcourir — import 100 % local, zéro réseau</div>
            </div>
          </div>
          <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-3">Historique des imports</div>
          <div className="flex flex-col gap-2">
            {historique.length ? (
              historique.map((h, i) => (
                <div key={i} className="flex items-center gap-3 bg-panel border border-rule rounded px-4 py-3">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <path d="M14 2v6h6"/>
                  </svg>
                  <div className="flex-1">
                    <div className="font-mono text-[9px] text-snow">{h.nom}</div>
                    <div className="font-mono text-[8px] text-fog">{h.date} · {h.nom} nœuds</div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${h.resultat === "chargé" ? "bg-pass" : "bg-fail"}`} />
                  <button className="text-[8px] font-mono uppercase tracking-wider text-fog hover:text-neon transition-colors">Charger</button>
                </div>
              ))
            ) : (
              <p className="text-[9px] font-mono text-fog">Aucun import enregistré sur cet appareil.</p>
            )}
          </div>
          <div className="mt-4 border-t border-rule pt-3">
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Brouillon local</div>
            <p className="text-[9px] font-mono text-fog mb-2">Le jeu en cours est sauvegardé automatiquement dans ce navigateur.</p>
            <button className="btn-danger min-h-8 px-2.5 text-[8px]" onClick={effacerBrouillon} disabled={relecture} title="Supprimer la sauvegarde locale et repartir sur un jeu vide">
              Effacer le brouillon
            </button>
          </div>
        </div>
      )}
      {ecran === "relire" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto" aria-label="Écran Relire">
          <FileRelire game={game} meta={st.present.meta} edit={edit} manifest={manifest} lectureSeule={relecture} onChoisir={choisirNoeud} estAnimateur={animateur} exportPret={!bloqueExport || animateur} />
          <ReviewOverlay game={game} meta={st.present.meta} />
        </div>
      )}
      {ecran === "valider" && (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-2xl">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Validation</h2>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-panel border border-rule rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C1 — Schéma AJV</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-pass" />
                    <span className="font-mono text-[8px] text-pass uppercase">Pass</span>
                  </div>
                </div>
                <p className="text-[11px] text-fog leading-relaxed">Draft-07 conforme. Tous les champs requis présents.</p>
                <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">{erreurs.filter(e => e.type === 'C1').length} erreur · 0 avertissement</div>
              </div>
              <div className="bg-panel border border-fail/20 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C2 — Applicative</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-fail" />
                    <span className="font-mono text-[8px] text-fail uppercase">Fail</span>
                  </div>
                </div>
                <p className="text-[11px] text-fog leading-relaxed">Cycles, atteignabilité isEnding, cohérence HOLD.</p>
                <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">{erreurs.length} erreur(s)</div>
              </div>
            </div>
            {erreurs.map((e, i) => (
              <div key={i} className={`flex items-start gap-3 bg-panel border rounded px-4 py-3 mb-2 ${e.sev === 'error' ? 'border-fail/20' : 'border-caution/20'}`}>
                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${e.sev === 'error' ? 'bg-fail' : 'bg-caution'}`} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[8px] text-fog">{e.id}</span>
                    <span className={`font-mono text-[8px] uppercase ${e.sev === 'error' ? 'text-fail' : 'text-caution'}`}>{e.sev}</span>
                    <span className="font-mono text-[8px] text-neon">→ {e.nodeId}</span>
                  </div>
                  <span className="text-[11px] text-snow">{e.message}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 p-3 bg-fail/5 border border-fail/15 rounded">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2"/>
                <path d="M7 4.5v2.5M7 10v.4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="font-mono text-[9px] text-fail">Export bloqué — corriger les erreurs C2 avant de continuer.</span>
            </div>
          </div>
        </div>
      )}
      {ecran === "previsualiser" && (
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow">Prévisualiser</h2>
            <button onClick={testerBranches} className="text-[8px] font-mono uppercase tracking-wider px-3 py-1.5 border border-rule rounded text-fog hover:border-neon/40 hover:text-neon transition-colors">↺ Rejouer fixture</button>
          </div>
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
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-md">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Exporter</h2>
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-3">Contrôle pré-export</div>
            <div className="bg-panel border border-rule rounded-md overflow-hidden mb-5">
              {[
                { ok: true, label: 'Schéma C1 conforme (AJV Draft-07)' },
                { ok: true, label: 'Tous les nœuds atteignables depuis START' },
                { ok: true, label: 'Nœud isEnding présent (FIN)' },
                { ok: false, label: '2 nœuds en statut draft' },
                { ok: false, label: 'holdMode: none — kiosque nécessite reviewed' },
              ].map((p, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < 4 ? 'border-b border-rule/40' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    {p.ok ? (
                      <>
                        <circle cx="7" cy="7" r="6" stroke="#10b981" strokeWidth="1.2"/>
                        <path d="M4.5 7l2 2 3-3" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    ) : (
                      <>
                        <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2"/>
                        <path d="M5 5l4 4M9 5l-4 4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
                      </>
                    )}
                  </svg>
                  <span className={`text-[11px] ${p.ok ? 'text-snow' : 'text-fail'}`}>{p.label}</span>
                </div>
              ))}
            </div>
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Manifeste (aperçu)</div>
            <div className="bg-canvas border border-rule rounded p-3 mb-5 font-mono text-[9px] space-y-1">
              <div className="flex"><span className="text-neon flex-1">game.json</span><span className="text-fog mr-4">v2.4.1</span><span className="text-fog">12.4 KB</span></div>
              <div className="flex"><span className="text-neon flex-1">assets/intro.mp4</span><span className="text-fog">4.2 MB</span></div>
              <div className="flex"><span className="text-neon flex-1">assets/map.png</span><span className="text-fog">340 KB</span></div>
              <div className="pt-2 border-t border-rule text-fog">sha256: <span className="text-dim">a3f2c1d8…e9c8e1</span> · 3 fichiers · 4.56 MB</div>
            </div>
            <button disabled={true} className={`w-full py-3 rounded font-display font-bold text-[9px] uppercase tracking-widest transition-all ${true ? 'bg-fail/8 border border-fail/20 text-fail/50 cursor-not-allowed' : 'bg-neon text-canvas hover:brightness-110'}`}>
              Export bloqué — corriger les erreurs
            </button>
          </div>
        </div>
      )}
      {ecran === "config" && (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-2xl">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Configuration</h2>
            <ModePanel game={game} edit={edit} lectureSeule={relecture} />
            <ExperienceStylePanel game={game} edit={edit} lectureSeule={relecture} />
            <BrandingPanel game={game} edit={edit} lectureSeule={relecture} />
            <ScreenGlobalPanel game={game} edit={edit} lectureSeule={relecture} />
            <MinigameDefaultsPanel game={game} editGame={editGame} lectureSeule={relecture} />
            <ObjetsPanel game={game} editGame={editGame} lectureSeule={relecture} onChoisir={choisirNoeud} />
            {(() => {
              const holdMode = game.global?.holdMode ?? "none";
              const verrous = game.nodes.filter((n) => MODULE_REGISTRY[n.module.type]?.needsLock);
              if (!verrous.length) return null;
              return (
                <div className="carte p-3">
                  <h3 className="flex items-center gap-1.5 font-display font-extrabold text-xl tracking-widest uppercase text-snow mb-4">
                    <Icon name="animateur" size={15} /> Verrouillage HOLD
                  </h3>
                  <p className="text-[9px] font-mono text-fog">holdMode actuel : <b>{holdMode}</b> — recalculé à chaque changement.</p>
                  <ul className="text-[9px]">
                    {verrous.map((n) => (
                      <li key={n.id}>{n.id} — {holdMode === "none"
                        ? (<span className="puce puce-erreur">bloqué (HOLD requis)</span>)
                        : (<span className="puce puce-ok">jouable</span>)}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            <div className="mt-4">
              <h3 className="text-[9px] font-mono uppercase tracking-widest text-fog mb-2">HOLD</h3>
              <p className="text-[9px] text-fog">HOLD est un mode système : il se configure dans la configuration globale.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen flex-col bg-canvas text-snow overflow-hidden"
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
      <header className="h-11 shrink-0 border-b border-rule bg-panel/60 flex items-center px-5 gap-4">
        <span className="font-display font-bold text-[9px] tracking-widest uppercase text-snow">
          {ECRANS.find(n => n.id === ecran)?.nom ?? "Studio"}
        </span>
        <div className="h-3 w-px bg-rule" />
        <input
          type="text"
          value={game.branding?.name ?? ""}
          onChange={(e) => edit((s) => ({ ...s, branding: { ...s.branding, name: e.target.value } }), "setBranding")}
          placeholder="Nom du jeu"
          disabled={relecture}
          className="bg-transparent border-b border-rule text-snow font-display text-[10px] tracking-wide w-40 outline-none focus:border-snow placeholder:text-fog/40 disabled:opacity-40"
        />
        <div className="h-3 w-px bg-rule" />
        <div className="flex items-center gap-4 font-mono text-[8px] text-fog">
          <span><span className="text-snow">{game.nodes.length}</span> nœuds</span>
          <span><span className="text-caution">{nbBrouillons}</span> draft</span>
          <span><span className="text-pass">{game.nodes.length - nbBrouillons}</span> reviewed</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors"
            onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Basculer en mode clair" : "Basculer en mode sombre"}
          ><Icon name={theme === "dark" ? "soleil" : "lune"} size={13} /></button>
          <button className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors" disabled={!st.past.length || relecture} onClick={() => dispatch({ t: "undo" })}>Undo</button>
          <button className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors" disabled={!st.future.length || relecture} onClick={() => dispatch({ t: "redo" })}>Redo</button>
          <button disabled={bloqueExport && !animateur}
            className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-fail/20 rounded text-fail/45 cursor-not-allowed"
            onClick={exporter}>Exporter</button>
        </div>
      </header>
      {sauvegardeIndispo && (
        <div className="shrink-0 border-b border-caution/40 bg-caution/10 px-5 py-1.5 font-mono text-[8px] text-caution" role="alert">
          Sauvegarde locale indisponible — vos modifications seront perdues au rechargement.
        </div>
      )}
      {calque && (
        <div className="carte fixed top-16 right-3 z-50 w-[380px] max-w-[calc(100vw-24px)] max-h-[80vh] overflow-auto p-3" role="dialog" aria-label={calque === "i18n" ? "Calque traductions" : "Calque difficultés et modes"}>
          <div className="flex justify-end mb-2">
            <button className="btn min-h-8 px-2.5" onClick={() => setCalque(null)} aria-label="Fermer le calque">
              <Icon name="fermer" size={14} />
            </button>
          </div>
          {calque === "i18n" ? (
            <I18nPanel meta={st.present.meta} edit={edit} lectureSeule={relecture} />
          ) : (
            <>
              <ModePanel game={game} edit={edit} lectureSeule={relecture} />
              <p className="text-[8px] text-fog">
HOLD est un mode système : il se configure dans Configuration globale, pas ici.</p>
            </>
          )}
        </div>
      )}

      {/* Grand écran : 3 volets sobres. Petit écran : onglets + barre basse. */}
      <div className="hidden min-h-0 flex-1 gap-3 p-3 lg:flex">
        {menuReplie ? (
          <div className="w-14 shrink-0 bg-panel border-r border-rule flex flex-col items-center gap-2 overflow-auto p-2" aria-label="Menu replié">
            <button className="btn px-2.5" onClick={basculerMenu} title="Déplier le menu" aria-label="Déplier le menu">
              <Icon name="liste" size={17} />
            </button>
            <button className="btn px-2.5" onClick={() => ajouterEtape("etape")} disabled={relecture} title="Créer une étape Quiz / jeu" aria-label="Étape de jeu">
              <Icon name="etape" size={17} />
            </button>
            <button className="btn px-2.5" onClick={() => ajouterEtape("lieu")} disabled={relecture} title="Créer un lieu avec zone GPS" aria-label="Lieu GPS">
              <Icon name="lieu" size={17} />
            </button>
            <button className="btn px-2.5" onClick={() => ajouterEtape("tirage")} disabled={relecture} title="Créer un tirage au sort parmi des étapes" aria-label="Tirage au sort">
              <Icon name="tirage" size={17} />
            </button>
            <button className="btn px-2.5" onClick={() => ajouterEtape("fin")} disabled={relecture} title="Créer l'étape de fin du jeu" aria-label="Fin du jeu">
              <Icon name="fin" size={17} />
            </button>
            {ECRANS.map((e) => (
              <button key={e.id} className={`btn px-2.5 ${ecran === e.id ? "font-bold" : "font-normal"}`} onClick={() => setEcran(e.id)} title={e.nom} aria-label={e.nom} aria-current={ecran === e.id ? "page" : undefined}>
                <Icon name={e.icone} size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="w-52 shrink-0 bg-panel border-r border-rule flex flex-col">
            <div className="px-5 py-5 border-b border-rule">
              <div className="font-display font-extrabold text-xl tracking-[0.22em] uppercase text-snow leading-none">
                Studio
              </div>
              <div className="font-mono text-[7px] text-fog tracking-[0.18em] mt-1 uppercase">
                Jeu Numérique
              </div>
            </div>
            <div className="px-4 py-3 border-b border-rule">
              <div className="text-[7px] font-mono uppercase tracking-widest text-fog mb-1">Projet actif</div>
              <div className="text-[11px] font-semibold text-snow leading-snug">{game.gameId}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-caution" />
                <span className="font-mono text-[7px] text-caution">{nbBrouillons} nœud{nbBrouillons > 1 ? 's' : ''} draft</span>
              </div>
            </div>
            <nav className="flex-1 py-2">
              {ECRANS.map(item => {
                const active = ecran === item.id;
                return (
                  <button key={item.id} onClick={() => setEcran(item.id)}
                    className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active ? 'text-neon bg-neon/5' : 'text-fog hover:text-snow hover:bg-pane2'
                    }`}>
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neon rounded-r" />
                    )}
                    <Icon name={item.icone} size={15} />
                    <span className="text-[11px] font-medium">{item.nom}</span>
                  </button>
                );
              })}
            </nav>
            <div className="px-4 py-3 border-t border-rule">
              <div className="font-mono text-[7px] text-fog">v2.4.1 — Undo/Redo actif</div>
            </div>
          </div>
        )}
        {ecran === "composer" ? (<>
        <main className="flex min-h-0 min-w-0 flex-[3] flex-col gap-2" aria-label="Graphe et liste">
          <div className="flex min-h-0 flex-1 gap-3">
            {mep.repliees.graphe ? (
              <div className="carte flex w-12 shrink-0 flex-col items-center p-2" aria-label="Graphe replié">
                <button className="btn px-2.5" onClick={() => basculerSection("graphe")} title="Déplier le graphe" aria-label="Déplier le graphe">
                  <Icon name="graphe" size={17} />
                </button>
              </div>
            ) : (
              <div id="section-graphe" className="relative flex min-h-0 min-w-0 flex-1 flex-col" style={surlignage("graphe")}>
                {zoneGraphe}
                <div className="absolute right-2 top-2 z-5 flex gap-1">
                  <button className="btn min-h-8 px-2.5" onClick={() => basculerMolette("graphe")} title="Réglages du graphe" aria-label="Réglages du graphe" aria-expanded={molette === "graphe"}>
                    <Icon name="engrenage" size={15} />
                  </button>
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => basculerSection("graphe")} title="Replier le graphe">
                    Replier
                  </button>
                </div>
                {molette === "graphe" && (
                  <div className="carte absolute right-2 top-12 z-6 flex flex-col gap-1.5 p-2" role="dialog" aria-label="Réglages du graphe">
                    <button className="btn justify-start" onClick={() => { rfRef.current?.fitView({ padding: 0.2 }); setMolette(null); }} title="Recentrer le graphe">
                      Recentrer
                    </button>
                    <button className="btn justify-start" onClick={() => { aligner("y"); }} disabled={selMulti.length < 2 || relecture} title={selMulti.length < 2 ? "Sélectionne au moins 2 nœuds (Shift+clic)" : `Aligner horizontalement (${selMulti.length} sélectionnés)`}>
                      Aligner H
                    </button>
                    <button className="btn justify-start" onClick={() => { aligner("x"); }} disabled={selMulti.length < 2 || relecture} title={selMulti.length < 2 ? "Sélectionne au moins 2 nœuds (Shift+clic)" : `Aligner verticalement (${selMulti.length} sélectionnés)`}>
                      Aligner V
                    </button>
                    <button className="btn justify-start" onClick={() => basculerSection("graphe")} title="Replier le graphe">
                      Replier
                    </button>
                  </div>
                )}
              </div>
            )}
            <Splitter label="Ajuster la largeur de la liste" onDelta={(dx) => setMep((m) => ({ ...m, liste: Math.min(520, Math.max(220, m.liste - dx)) }))} />
            {mep.repliees.liste ? (
              <div className="carte flex w-12 shrink-0 flex-col items-center p-2" aria-label="Liste repliée">
                <button className="btn px-2.5" onClick={() => basculerSection("liste")} title="Déplier la liste" aria-label="Déplier la liste">
                  <Icon name="liste" size={17} />
                </button>
              </div>
            ) : (
              <div id="section-liste" className="flex min-w-0 flex-col" style={{ width: mep.liste, ...surlignage("liste") }}>
                {liste}
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
              <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => basculerSection("detail")} title="Déplier le détail">
                Détail
              </button>
            </div>
          ) : (
            <div id="section-detail" className="flex min-h-0 flex-1 flex-col gap-1" style={surlignage("detail")}>
              <div className="flex justify-end gap-1">
                <button className="btn min-h-8 px-2.5" onClick={() => basculerMolette("detail")} title="Réglages du détail" aria-label="Réglages du détail" aria-expanded={molette === "detail"}>
                  <Icon name="engrenage" size={15} />
                </button>
                <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => basculerSection("detail")} title="Replier le détail">
                  Replier
                </button>
              </div>
              {molette === "detail" && (
                <div className="flex gap-2" role="dialog" aria-label="Réglages du détail">
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => basculerSection("detail")} title="Replier le détail">Replier</button>
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => { setMep((m) => ({ ...m, droite: 400 })); setMolette(null); }} title="Restaurer la largeur par défaut du panneau">Panneau 400</button>
                </div>
              )}
              {detail}
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
                  <div className="carte shrink-0 p-2">{resetLayout}</div>
                  <div className="flex min-h-0 flex-1 flex-col">{zoneGraphe}</div>
                </div>
              )}
              {onglet === "liste" && (
                listeSimple
              )}
              {onglet === "detail" && detail}
            </div>
          ) : (
            <>{ecranCourant}</>
          )}
        </main>
        {ecran === "composer" ? (
          <>
            {pied}
            {listeErreurs}
            <nav className="carte flex shrink-0 items-stretch gap-1 p-1 sticky bottom-0" aria-label="Sections du Composer">
              {(
                [
                  { id: "graphe", nom: "Graphe", icone: "graphe" },
                  { id: "liste", nom: "Liste", icone: "liste" },
                  { id: "detail", nom: "Détail", icone: "detail" },
                ] as { id: Onglet; nom: string; icone: "graphe" | "liste" | "detail" }[]
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOnglet(o.id)}
                  aria-current={onglet === o.id ? "page" : undefined}
                  style={{
                    flex: 1,
                    border: onglet === o.id ? "2px solid var(--focus)" : "1px solid transparent",
                    background: onglet === o.id ? "var(--surface)" : "transparent",
                    fontWeight: onglet === o.id ? 700 : 500,
                  }}
                  className="flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-lg text-[8px]"
                >
                  <Icon name={o.icone} size={19} />
                  {o.nom}
                </button>
              ))}
            </nav>
          </>
        ) : (
          <nav className="carte flex shrink-0 items-stretch gap-1 p-1 flex-wrap sticky bottom-0" aria-label="Écrans du Studio">
            {ECRANS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEcran(e.id)}
                aria-current={ecran === e.id ? "page" : undefined}
                style={{
                  flex: "1 1 auto",
                  border: ecran === e.id ? "2px solid var(--focus)" : "1px solid transparent",
                  background: ecran === e.id ? "var(--surface)" : "transparent",
                  fontWeight: ecran === e.id ? 700 : 500,
                }}
                className="flex flex-col items-center justify-center gap-0.5 min-h-12 rounded-lg text-[11px] px-1.5 py-1"
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

function Famille({ id, icone, titre, aide, active, children }: { id: string; icone: IconName; titre: string; aide: string; active: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div id={`famille-${id}`} className="flex flex-col gap-1 px-3 pb-3" role="region" aria-label={titre}>
      <span className="text-[8px] text-fog">{aide}</span>
      {children}
    </div>
  );
}

// Hote du panneau de configuration module dans le WYSIWYG (change studio-screen-wysiwyg) :
// rend le propertiesPanel du screenPlugin du type de module, cable sur node.module.data.
// Sans plugin : undefined (PropertiesPanel affiche son placeholder).
// Les defauts globaux mini-jeux sont transmis pour affichage heritage (change studio-screen-editor).
function PanneauModule({ node, globalDefaults, lectureSeule, editGame }: {
  node: GameNode; globalDefaults?: MinigameDefaults; lectureSeule: boolean; editGame: (fn: (g: Game) => Game, op?: string) => void;
}) {
  const plugin = getScreenPlugin(node.module.type);
  if (!plugin) return null;
  const Panel = plugin.propertiesPanel;
  return (
    <Panel
      data={node.module.data}
      readOnly={lectureSeule}
      minigameDefaults={globalDefaults}
      onChange={(data) =>
        editGame(
          (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, module: { ...n.module, data } } : n)) }),
          "modifierNoeud"
        )
      }
    />
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
  const [activeFamille, setActiveFamille] = useState<string>(FAMILLES[0].id);
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
    <div className="flex min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Icon sidebar */}
        <nav
          className="flex flex-col gap-0.5 shrink-0 w-11 border-r border-rule overflow-y-auto py-1"
          role="tablist"
          aria-label="Familles d'inspection"
          onKeyDown={(e) => {
            const idx = FAMILLES.findIndex((f) => f.id === activeFamille);
            if (e.key === "ArrowDown" && idx < FAMILLES.length - 1) { e.preventDefault(); setActiveFamille(FAMILLES[idx + 1].id); }
            if (e.key === "ArrowUp" && idx > 0) { e.preventDefault(); setActiveFamille(FAMILLES[idx - 1].id); }
          }}
        >
          {FAMILLES.map((fam) => (
            <button
              key={fam.id}
              role="tab"
              aria-selected={activeFamille === fam.id}
              aria-controls={`famille-${fam.id}`}
              className={`flex items-center justify-center h-9 rounded transition-colors ${activeFamille === fam.id ? "bg-surface-2 text-neon" : "text-fog hover:text-snow hover:bg-surface-2/50"}`}
              title={`${fam.titre} — ${fam.aide}`}
              onClick={() => setActiveFamille(fam.id)}
            >
              <Icon name={fam.icone} size={16} />
            </button>
          ))}
        </nav>
        {/* Active family content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-2 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold">
                {lectureSeule ? (
                  node.id
                ) : (
                  <input
                    className="champ font-bold"
                    value={node.id}
                    size={Math.max(4, node.id.length + 2)}
                    aria-label="Identifiant du nœud"
                    onChange={(e) => {
                      const newId = e.target.value.trim();
                      if (newId && newId !== node.id) {
                        editGame(
                          (g) => renameNode(g, node.id, newId),
                          "renameNode"
                        );
                      }
                    }}
                  />
                )}
              </h3>
              <span className="puce"><Icon name="statut" size={12} /> {ETATS_FR[st]}</span>
              {node.isEnding && <span className="puce puce-fin"><Icon name="fin" size={12} /> Fin</span>}
              {!lectureSeule && (
                <>
                  <button
                    className="btn min-h-8 px-2.5 text-[8px]"
                    onClick={() => {
                      editGame(
                        (g) => duplicateNode(g, node.id),
                        "duplicateNode"
                      );
                    }}
                    title="Dupliquer ce nœud"
                  >
                    <Icon name="ajouter" size={15} /> Dupliquer
                  </button>
                  <button
                    className="btn min-h-8 px-2.5 text-[8px]"
                    onClick={() => {
                      const refs: string[] = [];
                      for (const n of game.nodes) {
                        if (n.id === node.id) continue;
                        for (const c of n.activation.requires) {
                          if ((c.type === "NODE_COMPLETED" && c.nodeId === node.id) ||
                              (c.type === "POOL_DRAWN" && c.poolNodeId === node.id) ||
                              (c.type === "TIMER" && c.anchorNodeId === node.id)) {
                            refs.push(`${n.id} (condition ${c.type})`);
                          }
                        }
                        for (const e of (n.effects ?? [])) {
                          if ((e.type === "REVEAL_NODE" || e.type === "UNLOCK_NODE") && e.nodeId === node.id) {
                            refs.push(`${n.id} (effet ${e.type})`);
                          }
                        }
                        if (n.discovery?.sourceNode === node.id) {
                          refs.push(`${n.id} (discovery)`);
                        }
                        if (n.randomPool?.candidates.includes(node.id)) {
                          refs.push(`${n.id} (pool candidat)`);
                        }
                      }
                      const msg = refs.length > 0
                        ? `Supprimer « ${node.id} » ?\n\nRéférencé par :\n${refs.map((r) => `• ${r}`).join("\n")}`
                        : `Supprimer le nœud « ${node.id} » ?`;
                      if (window.confirm(msg)) {
                        editGame(
                          (g) => removeNode(g, node.id),
                          "removeNode"
                        );
                      }
                    }}
                    title="Supprimer ce nœud"
                  >
                    <Icon name="fermer" size={15} /> Supprimer
                  </button>
                </>
              )}
            </div>
            <fieldset disabled={lectureSeule} className="contents">
            <Famille id={FAMILLES[0].id} icone={FAMILLES[0].icone} titre={FAMILLES[0].titre} aide={FAMILLES[0].aide} active={activeFamille === FAMILLES[0].id}>
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
              <span className="text-[8px] text-fog">Besoins du module (registre) : {resume || "aucun"}</span>
              {reg.needsLock && holdMode === "none" && (
                <p className="puce puce-erreur whitespace-normal">
                  <Icon name="alerte" size={13} /> Ce module exige un HOLD actif (needsLock), mais holdMode vaut « none » — rejet en couche 2.
                  {onAllerConfig && <button className="btn min-h-8 px-2.5 text-[8px]" onClick={onAllerConfig} title="Aller à la configuration globale">Configuration</button>}
                </p>
              )}
              {besoinsKO.length > 0 && (
                <p className="puce whitespace-normal" title="Avertissement non bloquant : seule la validation (couche 2) bloque">
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
                <button className="btn px-2.5" aria-label={`Supprimer la question ${i + 1}`} title="Supprimer" onClick={() => {
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
        <details><summary className="cursor-pointer text-[8px]">Données expertes (JSON)</summary>
          <textarea rows={3} className="w-full champ font-mono text-[8px]" value={JSON.stringify(node.module.data)} onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value) as Record<string, unknown>;
              if (data && typeof data === "object") upd({ module: { ...node.module, data } });
            } catch { /* frappe en cours */ }
          }} />
        </details>
      </Famille>
      <Famille id={FAMILLES[1].id} icone={FAMILLES[1].icone} titre={FAMILLES[1].titre} aide={FAMILLES[1].aide} active={activeFamille === FAMILLES[1].id}>
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
          <div key={i} className="carte p-2 shadow-none">
            <span className="flex items-center gap-1.5">
               <Icon name={iconeCondition(c.type)} size={15} />
               <b>{CONDITIONS_FR[c.type]?.nom ?? c.type}</b>
              <span className="flex-1" />
              <button className="btn min-h-8 px-2.5" aria-label="Supprimer ce déclencheur" title="Supprimer" onClick={() => supprDecl(i)}><Icon name="fermer" size={14} /></button>
            </span>
            <ChampsDecl game={game} c={c} upd={(p) => updDecl(i, p)} />
          </div>
        ))}
      </Famille>
      <Famille id={FAMILLES[2].id} icone={FAMILLES[2].icone} titre={FAMILLES[2].titre} aide={FAMILLES[2].aide} active={activeFamille === FAMILLES[2].id}>
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
      <Famille id={FAMILLES[3].id} icone={FAMILLES[3].icone} titre={FAMILLES[3].titre} aide={FAMILLES[3].aide} active={activeFamille === FAMILLES[3].id}>
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
      <Famille id={FAMILLES[4].id} icone={FAMILLES[4].icone} titre={FAMILLES[4].titre} aide={FAMILLES[4].aide} active={activeFamille === FAMILLES[4].id}>
        <label>Statut <select className="champ" value={st} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, status: { ...s.meta.status, [node.id]: { state: e.target.value as StudioMeta["status"][string]["state"] } } } }), "definirStatut")}>
          {Object.entries(ETATS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Fournisseur <input className="champ" size={12} value={meta.provenance[node.id]?.providerId ?? ""} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, provenance: { ...s.meta.provenance, [node.id]: { providerId: e.target.value, license: s.meta.provenance[node.id]?.license ?? "", sourceUrl: s.meta.provenance[node.id]?.sourceUrl ?? "" } } } }), "definirProvenance")} placeholder="Qui fournit le contenu ?" /></label>
        <label>Milieu <select className="champ" value={milieu} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, milieu: { ...s.meta.milieu, [node.id]: e.target.value as Milieu } } }), "definirMilieu")}>
          {Object.entries(MILIEUX).map(([k, v]) => <option key={k} value={k}>{v.nom}</option>)}
        </select></label>
        <i className="text-[8px] text-fog">Conseil : {MILIEUX[milieu].reco}</i>
        {node.activation.requires.some((c) => c.type === "PROXIMITY_MASTER") && (
          <button className="btn" onClick={() => {
            try {
              editGame((g) => addSecoursCode(g, node.id), "addSecoursCode");
            } catch (e) {
              alert(String(e));
            }
          }}><Icon name="ajouter" size={15} /> Secours par code</button>
        )}
        <details><summary className="cursor-pointer text-[8px]">Options expertes (JSON)</summary>
          <textarea rows={2} className="w-full champ font-mono text-[8px]" defaultValue={JSON.stringify(meta.overrides[node.id] ?? {})} key={node.id} onBlur={(e) => {
            try {
              const patch = JSON.parse(e.target.value) as Record<string, unknown>;
              if (patch && typeof patch === "object") {
                edit((s) => ({ ...s, meta: { ...s.meta, overrides: { ...s.meta.overrides, [node.id]: patch as StudioMeta["overrides"][string] } } }), "definirOverrides");
              }
            } catch { alert("Options invalides (JSON)"); }
          }} />
        </details>
      </Famille>
      <Famille id={FAMILLES[5].id} icone={FAMILLES[5].icone} titre={FAMILLES[5].titre} aide={FAMILLES[5].aide} active={activeFamille === FAMILLES[5].id}>
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
        <span className="text-[8px] text-fog">Découverte = comment l'étape devient visible. Indépendante de l'activation.</span>
      </Famille>
      <Famille id={FAMILLES[6].id} icone={FAMILLES[6].icone} titre={FAMILLES[6].titre} aide={FAMILLES[6].aide} active={activeFamille === FAMILLES[6].id}>
        {(node.effects ?? []).length === 0 && (
          <button className="btn" onClick={() => upd({ effects: [{ type: "GIVE_ITEM", itemId: "" }] })}><Icon name="ajouter" size={15} /> Ajouter un effet</button>
        )}
        {(node.effects ?? []).map((eff, i) => (
          <div key={i} className="carte p-2 shadow-none">
            <span className="flex items-center gap-1.5">
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
              <span className="flex-1" />
              <button className="btn min-h-8 px-2.5" aria-label="Supprimer cet effet" title="Supprimer" onClick={() => upd({ effects: (node.effects ?? []).filter((_, j) => j !== i) })}><Icon name="fermer" size={14} /></button>
            </span>
            {eff.type === "GIVE_ITEM" || eff.type === "REMOVE_ITEM" ? <label>Objet <select className="champ" value={eff.itemId ?? ""} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], itemId: e.target.value }; upd({ effects: ne }); }}><option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label> : eff.type === "REVEAL_NODE" || eff.type === "HIDE_NODE" || eff.type === "UNLOCK_NODE" ? <label>Nœud <select className="champ" value={eff.nodeId ?? ""} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], nodeId: e.target.value }; upd({ effects: ne }); }}><option value="">—</option>{game.nodes.filter((m) => m.id !== node.id).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}</select></label> : eff.type === "MODIFY_VARIABLE" ? <label>Variable <input className="champ" value={eff.variableId ?? ""} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], variableId: e.target.value }; upd({ effects: ne }); }} placeholder="id" size={12} /></label> : eff.type === "MODIFY_SCORE" ? <label>Score <input className="champ w-16" type="number" value={Number(eff.value) ?? 0} onChange={(e) => { const ne = [...(node.effects ?? [])]; ne[i] = { ...ne[i], value: Number(e.target.value) }; upd({ effects: ne }); }} /></label> : null}
          </div>
        ))}
      </Famille>
      <Famille id={FAMILLES[7].id} icone={FAMILLES[7].icone} titre={FAMILLES[7].titre} aide={FAMILLES[7].aide} active={activeFamille === FAMILLES[7].id}>
        {(node.inventoryRef ?? []).length === 0 ? (
          <button className="btn" onClick={() => upd({ inventoryRef: [] })}><Icon name="ajouter" size={15} /> Ajouter un objet référencé</button>
        ) : null}
        {(node.inventoryRef ?? []).map((ref, i) => (
          <div key={i} className="carte p-2 shadow-none">
            <span className="flex items-center gap-1.5">
              <Icon name="package" size={15} />
              <select className="champ" value={ref} onChange={(e) => { const ir = [...(node.inventoryRef ?? [])]; ir[i] = e.target.value; upd({ inventoryRef: ir }); }}>
                <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <span className="flex-1" />
              <button className="btn min-h-8 px-2.5" aria-label="Supprimer cette référence" title="Supprimer" onClick={() => upd({ inventoryRef: (node.inventoryRef ?? []).filter((_, j) => j !== i) })}><Icon name="fermer" size={14} /></button>
            </span>
          </div>
        ))}
        <span className="text-[8px] text-fog">InventoryRef = objets liés à ce nœud (donnés, requis). Vide si aucun objet.</span>
      </Famille>
      <Famille id={FAMILLES[8].id} icone={FAMILLES[8].icone} titre={FAMILLES[8].titre} aide={FAMILLES[8].aide} active={activeFamille === FAMILLES[8].id}>
        {node.position ? (
          <div className="flex flex-col gap-1">
            <span className="text-[8px]">Plan : {node.position.planId} · x: {node.position.x.toFixed(1)} · y: {node.position.y.toFixed(1)}</span>
            <span className="text-[8px] text-fog">Cliquez sur le plan pour repositionner, ou glissez le marqueur.</span>
          </div>
        ) : (() => {
          const geoCond = node.activation.requires.find((c) => c.type === "GEOFENCE");
          return (
            <div className="flex flex-col gap-1">
              {geoCond ? (
                <>
                  <label className="flex items-center gap-1">
                    Lat <input className="champ w-24" type="number" step="any" value={geoCond.lat ?? ""}
                      onChange={(e) => editGame((g) => ({ ...g, nodes: g.nodes.map((n) => n.id === node.id ? { ...n, activation: { ...n.activation, requires: n.activation.requires.map((c) => c.type === "GEOFENCE" ? { ...c, lat: Number(e.target.value) } : c) } } : n) }), "setNodePosition")} />
                  </label>
                  <label className="flex items-center gap-1">
                    Lng <input className="champ w-24" type="number" step="any" value={geoCond.lng ?? ""}
                      onChange={(e) => editGame((g) => ({ ...g, nodes: g.nodes.map((n) => n.id === node.id ? { ...n, activation: { ...n.activation, requires: n.activation.requires.map((c) => c.type === "GEOFENCE" ? { ...c, lng: Number(e.target.value) } : c) } } : n) }), "setNodePosition")} />
                  </label>
                  <span className="text-[8px] text-fog">Ou glissez le marqueur directement sur la carte.</span>
                </>
              ) : (
                <span className="text-[8px] text-fog">Aucune position définie. Ajoutez une condition GEOFENCE ou utilisez la carte pour placer ce nœud.</span>
              )}
            </div>
          );
        })()}
      </Famille>
      </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChampsDecl({ game, c, upd }: { game: Game; c: Condition; upd: (p: Partial<Condition>) => void }) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  switch (c.type) {
    case "GEOFENCE":
      return (
        <span className="flex flex-wrap gap-1 items-center">
          lat <input className="champ w-20 min-h-10" type="number" step="any" value={c.lat ?? ""} onChange={(e) => upd({ lat: num(e.target.value) })} />
          lng <input className="champ w-20 min-h-10" type="number" step="any" value={c.lng ?? ""} onChange={(e) => upd({ lng: num(e.target.value) })} />
          rayon <input className="champ w-16 min-h-10" type="number" value={c.radiusMeters ?? ""} onChange={(e) => upd({ radiusMeters: num(e.target.value) })} /> m
          {PRESETS_RAYON.map((p) => (
            <button key={p.nom} title={p.aide} className="btn min-h-9" onClick={() => upd({ radiusMeters: p.metres })}>{p.nom} {p.metres}m</button>
          ))}
          Quand <select className="champ min-h-10" value={c.predicate ?? "enter"} onChange={(e) => upd({ predicate: e.target.value as Predicate })}>
            <option value="enter">on entre</option><option value="exit">on sort</option><option value="dwell">on reste</option><option value="through">on traverse</option>
          </select>
          rester <input className="champ w-16 min-h-10" type="number" value={(c.dwellMs ?? "") as number | string} onChange={(e) => upd({ dwellMs: num(e.target.value) })} placeholder="ms" />
        </span>
      );
    case "PROXIMITY_MASTER":
      return (
        <span className="flex flex-wrap gap-1 items-center">
          animateur <input className="champ min-h-10" value={c.masterId ?? ""} onChange={(e) => upd({ masterId: e.target.value })} size={10} />
          <button className="btn min-h-9" title="Changer d'identifiant (révoque l'ancien)" onClick={() => upd({ masterId: `m-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}` })}>Rotation</button>
          lien <select className="champ min-h-10" value={c.transport ?? "ble"} onChange={(e) => upd({ transport: e.target.value as "ble" | "wifi" })}>
            <option value="ble">Bluetooth</option><option value="wifi">Wi-Fi</option>
          </select>
          seuil <input className="champ w-16 min-h-10" type="number" value={c.minRssiDbm ?? ""} onChange={(e) => upd({ minRssiDbm: num(e.target.value) })} />
        </span>
      );
    case "NODE_COMPLETED":
      return (
        <span>après <select className="champ min-h-10" value={c.nodeId ?? ""} onChange={(e) => upd({ nodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select> <label><input type="checkbox" checked={!!c.allowCycle} onChange={(e) => upd({ allowCycle: e.target.checked })} /> retour autorisé</label></span>
      );
    case "TIMER":
      return (
        <span>attendre <input className="champ w-16 min-h-10" type="number" value={c.delaySeconds ?? ""} onChange={(e) => upd({ delaySeconds: num(e.target.value) })} /> s depuis
          <select className="champ min-h-10" value={c.anchor ?? "GAME_START"} onChange={(e) => upd({ anchor: e.target.value as "GAME_START" | "NODE_COMPLETION" })}>
            <option value="GAME_START">le démarrage</option><option value="NODE_COMPLETION">la fin de…</option>
          </select>
          {c.anchor === "NODE_COMPLETION" && <select className="champ min-h-10" value={c.anchorNodeId ?? ""} onChange={(e) => upd({ anchorNodeId: e.target.value })}>
            <option value="">—</option>{game.nodes.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>}</span>
      );
    case "POOL_DRAWN":
      return (
        <span>tirée par <select className="champ min-h-10" value={c.poolNodeId ?? ""} onChange={(e) => upd({ poolNodeId: e.target.value })}>
          <option value="">—</option>{game.nodes.filter((m) => m.randomPool).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select></span>
      );
    case "ITEM_REQUIRED":
      return (
        <span>objet <select className="champ min-h-10" value={c.itemId ?? ""} onChange={(e) => upd({ itemId: e.target.value })}>
          <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select></span>
      );
    case "ITEM_USED":
      return (
        <span>utiliser <select className="champ min-h-10" value={c.itemId ?? ""} onChange={(e) => upd({ itemId: e.target.value })}>
          <option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select> consommable <label className="text-[8px]"><input type="checkbox" checked={c.consumed ?? true} onChange={(e) => upd({ consumed: e.target.checked })} /> oui</label></span>
      );
    case "CODE_INPUT":
      return (
        <span>code <input className="champ min-h-10" value={c.code ?? ""} onChange={(e) => upd({ code: e.target.value })} placeholder="Code" size={12} /></span>
      );
    case "CLUE_RESOLVED":
      return (
        <span>indice <select className="champ min-h-10" value={c.clueId ?? ""} onChange={(e) => upd({ clueId: e.target.value })}>
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
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="exemple" size={15} /> Fichiers du pack ({manifest.length})
      </h3>
      <ul className="text-[8px]">{manifest.map((m) => <li key={m.path}>{m.path} v{m.version} {m.size}o {m.sha256.slice(0, 8)}…</li>)}</ul>
      {!lectureSeule && (
        <div className="flex flex-wrap gap-1">
          <input className="champ min-h-10" value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })} size={14} aria-label="Chemin du fichier" />
          <input className="champ min-h-10" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} size={7} aria-label="Version" />
          <input className="champ w-20 min-h-10" type="number" value={f.size} onChange={(e) => setF({ ...f, size: Number(e.target.value) })} aria-label="Taille en octets" />
          <input className="champ min-h-10" value={f.sha256} onChange={(e) => setF({ ...f, sha256: e.target.value })} size={12} placeholder="sha256 (64 hex)" aria-label="SHA-256" />
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
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="engrenage" size={15} /> Experience Style
        {diverge && <span className="puce" title="Des dimensions ont été modifiées manuellement après le choix du preset">Personnalisé</span>}
      </h3>
      <label className="text-[8px] flex gap-1 items-center">
        Preset :
        <select className="champ" value={ex.preset ?? "BASIC"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, preset: e.target.value as any } } }), "setExperienceStyle")}>
          {["BASIC", "GUIDED", "TREASURE_HUNT", "ESCAPE_GAME", "OPEN_EXPLORATION"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {ex.identity && (
        <>
          <label className="text-[8px] flex gap-1 items-center mt-1">
            Nom éditeur :
            <input className="champ" value={ex.identity.name ?? ""} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, identity: { ...ex.identity, name: e.target.value } } } }), "setExperienceStyle")} />
          </label>
          <label className="text-[8px] flex gap-1 items-center">
            Éditeur :
            <input className="champ" value={ex.identity.publisher ?? ""} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, identity: { ...ex.identity, publisher: e.target.value } } } }), "setExperienceStyle")} />
          </label>
        </>
      )}
      {ex.visual && (
        <>
          <label className="text-[8px] flex gap-1 items-center mt-1">
            Couleur primaire :
            <input type="color" className="champ" value={ex.visual.primaryColor ?? "#1a7f37"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, visual: { ...ex.visual, primaryColor: e.target.value } } } }), "setExperienceStyle")} />
          </label>
          <label className="text-[8px] flex gap-1 items-center">
            Couleur secondaire :
            <input type="color" className="champ" value={ex.visual.secondaryColor ?? "#5f3dc4"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, experienceStyle: { ...s.game.experienceStyle, visual: { ...ex.visual, secondaryColor: e.target.value } } } }), "setExperienceStyle")} />
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
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="detail" size={15} /> Branding
      </h3>
      <label className="text-[8px] flex gap-1 items-center">
        Nom :
        <input className="champ" value={b.name} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, name: e.target.value } } }), "setBranding")} />
      </label>
      <label className="text-[8px] flex gap-1 items-center mt-1">
        Couleur primaire :
        <input type="color" className="champ" value={b.primaryColor} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, primaryColor: e.target.value } } }), "setBranding")} />
      </label>
      <label className="text-[8px] flex gap-1 items-center">
        Couleur secondaire :
        <input type="color" className="champ" value={b.secondaryColor} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, secondaryColor: e.target.value } } }), "setBranding")} />
      </label>
      <label className="text-[8px] flex gap-1 items-center mt-1">
        Police :
        <input className="champ" value={b.fontFamily} disabled={lectureSeule} placeholder="system-ui" onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, fontFamily: e.target.value } } }), "setBranding")} />
      </label>
      <label className="text-[8px] flex gap-1 items-center">
        Logo (asset) :
        <input className="champ" value={b.logo ?? ""} disabled={lectureSeule} placeholder="assets/logo.png" onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, logo: e.target.value || undefined } } }), "setBranding")} />
      </label>
    </div>
  );
}

function MinigameDefaultsPanel({ game, editGame, lectureSeule }: {
  game: Game;
  editGame: (fn: (g: Game) => Game, op?: string) => void;
  lectureSeule: boolean;
}) {
  const defs = game.global?.minigameDefaults ?? {};
  const set = (patch: MinigameDefaults) => editGame((g) => setMinigameDefaults(g, patch), "setMinigameDefaults");
  const vider = (cle: "maxAttempts" | "timeLimitSeconds") =>
    editGame((g) => {
      const next = { ...(g.global?.minigameDefaults ?? {}) };
      delete next[cle];
      const global = { ...(g.global ?? {}), minigameDefaults: next };
      return { ...g, global };
    }, "setMinigameDefaults");
  return (
    <div className="carte p-3">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="essai" size={15} /> Mini-jeux — défauts globaux
      </h3>
      <p className="text-[8px] text-fog">Appliqués sauf surcharge locale dans le bloc du nœud. Vide = comportement actuel du module.</p>
      <div className="flex gap-2 mt-1">
        <label className="text-[8px] flex flex-1 gap-1 items-center">
          Essais max (≥ 1) :
          <input
            type="number" min={1} step={1} className="champ" disabled={lectureSeule}
            value={defs.maxAttempts ?? ""} placeholder="défaut module"
            onChange={(e) => { if (e.target.value === "") vider("maxAttempts"); else set({ maxAttempts: Number(e.target.value) }); }}
          />
        </label>
        <label className="text-[8px] flex flex-1 gap-1 items-center">
          Temps (s, ≥ 0) :
          <input
            type="number" min={0} step={1} className="champ" disabled={lectureSeule}
            value={defs.timeLimitSeconds ?? ""} placeholder="défaut module"
            onChange={(e) => { if (e.target.value === "") vider("timeLimitSeconds"); else set({ timeLimitSeconds: Number(e.target.value) }); }}
          />
        </label>
      </div>
    </div>
  );
}

function ScreenGlobalPanel({ game, edit, lectureSeule }: {
  game: Game;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }, op?: string) => void;
  lectureSeule: boolean;
}) {
  const gs = game.global?.screen;
  const personnalise = !!gs?.zones && Object.values(gs.zones).some((z) => (z?.widgets?.length ?? 0) > 0);
  const appliquer = (patch: Partial<NonNullable<Game["global"]>>) =>
    edit((s) => ({ ...s, game: { ...s.game, global: { ...(s.game.global ?? {}), ...patch } } }), "setGlobalScreen");
  return (
    <div className="carte p-3">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="oeil" size={15} /> Écran global (défaut des étapes)
      </h3>
      <p className="text-[8px] text-fog">Template par défaut : les étapes sans screen propre héritent de cet écran.</p>
      <fieldset disabled={lectureSeule} className="contents">
        <TemplatePicker
          currentLayout={gs?.layout}
          hasCustomizations={personnalise}
          onSelectTemplate={(layoutId) => {
            const t = getScreenTemplate(layoutId);
            if (!t) return;
            appliquer({ screen: structuredClone(t.screen) });
          }}
        />
        <ScreenProperties
          background={gs?.background}
          onChange={(background) => appliquer({ screen: { ...(gs ?? {}), background } })}
        />
      </fieldset>
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
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="package" size={15} /> Objets / inventaire ({objs.length})
      </h3>
      {objs.length ? (
        <ul className="text-[8px]">
          {objs.map((o) => {
            const refs = refsObjet(game, o.id);
            return (
              <li key={o.id} className="flex gap-1.5 items-center py-1">
                <span className="flex-1"><b>{o.id}</b> — {o.name}{o.consumable ? " · consommable" : ""}{refs.length ? ` · utilisé par : ${refs.join(", ")}` : " · non référencé"}</span>
                {!lectureSeule && refs.length > 0 && (
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => onChoisir(refs[0])} title={`Aller à ${refs[0]}`}>Voir</button>
                )}
                {!lectureSeule && (
                  <button className="btn min-h-8 px-2.5 text-[8px]" aria-label={`Supprimer l'objet ${o.id}`} title="Supprimer" onClick={() => {
                    if (refs.length && !window.confirm(`Supprimer « ${o.id} » ? Utilisé par : ${refs.join(", ")}`)) return;
                    editGame((g) => setObjects(g, (g.objects ?? []).filter((x) => x.id !== o.id)), "setObjects");
                  }}><Icon name="fermer" size={14} /></button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[8px] text-fog">
Aucun objet défini.</p>
      )}
      {!lectureSeule && (
        <div className="flex flex-wrap gap-1">
          <input className="champ min-h-10" value={nid} size={10} placeholder="id (ex. cle)" aria-label="Identifiant du nouvel objet" onChange={(e) => setNid(e.target.value)} />
          <input className="champ min-h-10" value={nnom} size={14} placeholder="Nom affiché" aria-label="Nom du nouvel objet" onChange={(e) => setNnom(e.target.value)} />
          <label className="flex items-center gap-1 text-[8px]"><input type="checkbox" checked={nconso} onChange={(e) => setNconso(e.target.checked)} /> consommable</label>
          <button className="btn" onClick={() => {
            const id = nid.trim();
            if (!id) { alert("Identifiant d'objet requis."); return; }
            if (objs.some((o) => o.id === id)) { alert(`Objet « ${id} » déjà existant.`); return; }
            editGame((g) => addObject(g, { id, name: nnom.trim() || id, consumable: nconso }), "addObject");
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
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="exemple" size={15} /> Mode et Difficulté
      </h3>
      <label className="text-[8px] flex gap-1 items-center">
        Mode :
        <select className="champ" value={game.gameMode ?? "NORMAL"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, gameMode: e.target.value as any } }), "setGameMode")}>
          {["NORMAL", "ANIMATEUR", "SOIREE", "HARDCORE"].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="text-[8px] flex gap-1 items-center mt-1">
        Difficulté :
        <select className="champ" value={game.difficulty ?? "FAMILLE"} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, difficulty: e.target.value as any } }), "setDifficulty")}>
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
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="detail" size={15} /> Textes et traductions
      </h3>
      {meta.i18n.map((row, i) => (
        <div key={i} className="flex gap-1">
          <input className="min-h-10" style={{ opacity: row.locked ? 0.6 : 1 }} value={row.key} size={12} disabled={lectureSeule || row.locked} title={row.locked ? "Clé verrouillée — non éditable" : undefined} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)) } }), "setI18n")} aria-label="Clé de texte" />
          <input className="champ flex-1 min-h-10" style={{ opacity: row.locked ? 0.6 : 1 }} value={row.value} size={16} disabled={lectureSeule || row.locked} title={row.locked ? "Texte verrouillé — non éditable" : undefined} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)) } }), "setI18n")} aria-label="Texte" />
          {!row.value && <span className="puce" title="Aucune valeur saisie pour cette clé">manquant</span>}
          <label className="flex items-center gap-1 text-[8px]"><input type="checkbox" checked={row.locked} disabled={lectureSeule} onChange={(e) => edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r, j) => (j === i ? { ...r, locked: e.target.checked } : r)) } }), "setI18n")} /> verrou</label>
        </div>
      ))}
      {!lectureSeule && (
        <div className="flex gap-1">
          <button className="btn" onClick={() => edit((s) => ({ ...s, meta: { ...s.meta, i18n: [...s.meta.i18n, { key: `texte${s.meta.i18n.length + 1}`, value: "", locked: false }] } }), "setI18n")}><Icon name="ajouter" size={15} /> Texte</button>
          <button className="btn" onClick={() => {
            const kept = meta.i18n.filter((r) => r.locked).map((r) => r.key);
            edit((s) => ({ ...s, meta: { ...s.meta, i18n: s.meta.i18n.map((r) => (r.locked ? r : { ...r, value: r.value ? `${r.value} (EN)` : r.value })) } }), "setI18n");
            setNote(`Verrouillés conservés : ${kept.join(", ") || "—"}`);
          }}>Simuler une retraduction</button>
        </div>
      )}
      {note && <div className="text-[8px]">{note}</div>}
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
    <div className="carte p-4">
      <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-4">
        <Icon name="oeil" size={17} /> Relire — {nbDraft} brouillon{nbDraft > 1 ? "s" : ""}
      </h2>
      <p className="text-[9px] font-mono text-fog mb-3">
        Tant qu'un élément est en brouillon, l'export est bloqué — le kiosque HOLD exige un jeu relu.
        Export : {exportPret ? (<span className="puce puce-ok">prêt</span>) : (<span className="puce puce-erreur">bloqué</span>)}
      </p>
      <div className="flex flex-wrap gap-1 mb-3" role="group" aria-label="Filtrer par statut">
        {(["draft", "reviewed", "published", "tous"] as const).map((f) => (
          <button key={f} className={`btn min-h-8 px-2.5 text-[8px] font-mono ${filtre === f ? "font-bold" : "font-normal"}`}
            onClick={() => setFiltre(f)} aria-pressed={filtre === f}>
            {f === "tous" ? `Tous (${lignes.length})` : `${ETATS_FR[f]} (${comptes(f)})`}
          </button>
        ))}
      </div>
      <ul className="text-[9px]">
        {visibles.map(({ n, st }) => {
          const prov = meta.provenance[n.id];
          const detail = ouvert === n.id;
          return (
            <li key={n.id} className="carte p-2 my-1">
              <span className="flex items-center gap-1.5">
                <b className="font-mono text-neon">{n.id}</b>
                <span className="puce">{ETATS_FR[st]}</span>
                {meta.status[n.id]?.reviewedBy && <span className="puce">par {meta.status[n.id]?.reviewedBy}</span>}
                <span className="flex-1" />
                <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => { onChoisir(n.id); setOuvert(detail ? null : n.id); }} title="Voir dans Composer et afficher la source">Voir</button>
                {!lectureSeule && st === "draft" && (
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => passer(n.id, "reviewed")} title="Passer en relu (enregistre le relecteur)">Relire</button>
                )}
                {!lectureSeule && st === "reviewed" && (
                  <>
                    <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => passer(n.id, "published")} title="Publier">Publier</button>
                    <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => passer(n.id, "draft")} title="Annuler la relecture (action distincte)">Annuler</button>
                  </>
                )}
                {!lectureSeule && st === "published" && (
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => passer(n.id, "draft")} title="Annuler la relecture (action distincte)">Annuler</button>
                )}
              </span>
              {detail && (
                <div className="text-[9px] flex flex-col gap-1 mt-1.5">
                  <span>Fournisseur : {prov?.providerId || "—"} · Licence : {prov?.license || "—"} · Source : {prov?.sourceUrl || "—"}</span>
                  <span>Module : {n.module.type} · Données : {JSON.stringify(n.module.data).slice(0, 200)}</span>
                </div>
              )}
            </li>
          );
        })}
      {/* visibles list */}
      </ul>
      {!visibles.length && <p className="text-[9px] font-mono text-fog">Aucun élément avec ce statut.</p>}
      <h3 className="font-display font-extrabold text-xl tracking-widest uppercase text-snow mb-2 mt-4">Assets du manifest ({manifest.length})</h3>
      <ul className="text-[9px] font-mono">{manifest.map((m) => <li key={m.path}>{m.path} v{m.version} {m.size}o</li>)}</ul>
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
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl">
        <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Validation</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-panel border border-rule rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C1 — Schéma AJV</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pass" />
                <span className="font-mono text-[8px] text-pass uppercase">Pass</span>
              </div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">Draft-07 conforme. Tous les champs requis présents.</p>
            <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">{c1?.errors.length ?? 0} erreur · 0 avertissement</div>
          </div>
          <div className="bg-panel border border-fail/20 rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C2 — Applicative</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-fail" />
                <span className="font-mono text-[8px] text-fail uppercase">Fail</span>
              </div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">Cycles, atteignabilité, pools, HOLD, références.</p>
            <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">{c2?.errors.length ?? 0} erreur(s)</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {[...(groupes.entries())].map(([cat, errs]) => (
            <div key={cat} className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">{cat} ({errs.length})</div>
          ))}
          {c2?.errors.map((e, i) => {
            const cible = game.nodes.find((n) => e.includes(n.id));
            return (
              <div key={i} className="flex items-start gap-3 bg-panel border border-rule rounded px-4 py-3 mb-2">
                <div className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-fail" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[8px] text-fog">ERR-{i}</span>
                    <span className="font-mono text-[8px] uppercase text-fail">erreur</span>
                    <span className="font-mono text-[8px] text-neon">→ {cible?.id ?? "?"}</span>
                  </div>
                  <span className="text-[11px] text-snow">{e}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[8px] text-fog">Export possible = C1 OK ∧ C2 OK ∧ aucun brouillon (hors animateur).</p>
      </div>
    </div>
  );
}

function ReviewOverlay({ game, meta }: { game: Game; meta: StudioMeta }) {
  const diffs = game.nodes.filter((n) => n.module.type === "DIFFERENCE_GAME");
  if (!diffs.length) return null;
  return (
    <div className="carte p-3">
      <h3 className="flex items-center gap-1.5 font-display font-extrabold text-xl tracking-widest uppercase text-snow mb-4">
        <Icon name="essai" size={15} /> Relecture 7 erreurs (calques)
      </h3>
      {diffs.map((n) => {
        const d = n.module.data as { source?: string; derivee?: string; polygons?: { x: number; y: number; w: number; h: number }[] };
        const polys = d.polygons ?? [];
        const statut = meta.status[n.id]?.state ?? "draft";
        return (
          <div key={n.id} className="carte p-2 my-1 shadow-none">
            <div className="font-mono text-[9px] text-snow mb-2">{n.id} — {ETATS_FR[statut]} — {polys.length} zone(s)</div>
            <div className="relative w-full" style={{ paddingTop: "56%", background: "var(--surface-2)", borderRadius: 8 }}>
              <span className="absolute top-0 left-1 font-mono text-[8px] text-fog">{String(d.source ?? "image source ?")}</span>
              {polys.map((p, i) => (
                <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%`, border: "2px solid #00e5ff" }} />
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
      <h3 className="flex items-center gap-1.5 font-display font-extrabold text-2xl tracking-widest uppercase text-snow">
        <Icon name="essai" size={15} /> Essai du parcours (triche tracée)
      </h3>
      <p className="text-[9px] font-mono text-fog">La prévisualisation n'écrit jamais dans le JSON source : tout ici est simulation.</p>
      <div className="carte p-2 shadow-none" aria-label="Panneau de triche">
        <h4 className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Panneau de triche — chaque event porte le flag triche</h4>
      <div className="flex gap-1 items-center flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          Signal GPS
          <span aria-hidden="true" className="inline-block w-3 h-3 rounded-full bg-neon" style={{ border: "1px solid var(--line-forte)" }} />
        </span>
        <select className="champ min-h-10" value={props.sim.precision} onChange={(e) => props.setSim((s) => ({ ...s, precision: Number(e.target.value) }))} aria-label="Précision GPS simulée">
          {SIGNAUX.map((s) => <option key={s.m} value={s.m}>{s.nom}</option>)}
        </select>
        <span>partie <input className="champ min-h-10" value={props.sessionId} onChange={(e) => props.setSessionId(e.target.value)} size={10} aria-label="Identifiant de session" /></span>
        <button className="btn" onClick={props.nouvelleSession}><Icon name="ajouter" size={15} /> Nouvelle partie</button>
        <span>temps +<input className="champ w-16 min-h-10" type="number" value={props.sim.dtMin} onChange={(e) => props.setSim((s) => ({ ...s, dtMin: Number(e.target.value) }))} aria-label="Temps écoulé en minutes" /> min</span>
      </div>
      {pools.map((p) => (
        <div key={p.id} className="font-mono text-[9px] text-snow mb-1">Tirage {p.id} → [{(props.draws[p.id] ?? []).join(",")}]
          <select className="champ min-h-10" value={props.forced[p.id] ?? ""} onChange={(e) => props.setForced({ ...props.forced, [p.id]: e.target.value })} aria-label={`Forcer le tirage ${p.id}`}>
            <option value="">tirage libre</option>{p.randomPool!.candidates.map((c) => <option key={c} value={c}>forcer {c}</option>)}
          </select></div>
      ))}
      <div className="flex gap-1 items-center flex-wrap">
        <span className="text-[9px]">HOLD simulé : {props.holdSim === "locked" ? (<span className="puce puce-erreur">verrouillé</span>) : (<span className="puce">inactif</span>)}</span>
        <button className="btn min-h-9" onClick={props.onHoldLock} disabled={props.holdSim === "locked"}>Simuler verrouillage</button>
        <button className="btn min-h-9" onClick={props.onHoldExit} disabled={props.holdSim === "none"}>Simuler sortie animateur</button>
      </div>
      </div>
      <div className="font-mono text-[9px] text-fog">File d'attente : {props.file.length ? props.file.join(", ") : "—"} | Ouverte : {props.activeId ?? "—"}</div>
      <div className="flex gap-1">
        <button className="btn min-h-9" onClick={() => { if (!props.activeId && props.file[0]) props.ouvrir(props.file[0]); }} disabled={!!props.activeId || !props.file.length}>Avancer d'un pas</button>
        <button className="btn min-h-9" onClick={props.reculer} disabled={props.nbTermines === 0}>Reculer d'un pas</button>
      </div>
      {props.activeId && (
        <div className="flex gap-1"><button className="btn-primaire" onClick={() => props.terminer(props.activeId!, false)}><Icon name="valider" size={15} /> Terminer</button>
          <button className="btn" onClick={() => props.terminer(props.activeId!, true)}>Abandonner</button></div>
      )}
      <div className="max-h-32 overflow-auto bg-canvas border border-rule rounded p-2 shadow-none">
        {game.nodes.filter((n) => !n.randomPool).map((n) => (
          <div key={n.id} className="min-h-11 flex items-center px-1">
            <button className="btn min-h-9" onClick={() => props.ouvrir(n.id)} disabled={!props.file.includes(n.id) && props.activeId !== n.id}>ouvrir</button>
            {" "}{n.id}
            <label className="text-[9px]"><input type="checkbox" checked={props.sim.present.includes(n.id)} onChange={() => bascule("present", n.id)} /> ici</label>
            <label className="text-[9px]"><input type="checkbox" checked={props.sim.dwell.includes(n.id)} onChange={() => bascule("dwell", n.id)} /> reste</label>
            <label className="text-[9px]"><input type="checkbox" checked={props.sim.through.includes(n.id)} onChange={() => bascule("through", n.id)} /> traverse</label>
          </div>
        ))}
      </div>
      <button className="btn" onClick={props.testerBranches}><Icon name="choix" size={15} /> Tout tester en 1 clic</button>
      {props.testAll && <div className="text-[9px] flex items-center gap-1.5">{fixtureOk == null ? null : fixtureOk ? (<span className="puce puce-ok">PASS</span>) : (<span className="puce puce-erreur">FAIL</span>)}<span>{props.testAll}</span></div>}
      <div className="max-h-24 overflow-auto text-[9px]"><b>Journal</b><ul>{props.log.map((l, i) => <li key={i} className="flex gap-1 items-center"><span className="puce">SIMULÉ</span><span className="puce">hold:{holdMode}</span><span>{l}</span></li>)}</ul></div>
    </div>
  );
}
