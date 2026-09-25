import { useCallback, useEffect, useMemo, useState, useReducer, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
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
import { composeNodes, setActivation, registerAsset, exportPackFull, canExport, addSecoursCode, importGame, addObject, setObjects, duplicateObject, setReview, removeNode, renameNode, duplicateNode, patchScreenZone, removeScreenZone, addScreenWidget, setScreenWidget as mcpSetScreenWidget, removeScreenWidget, moveScreenWidget, moveScreenWidgetAcross, setNodeScreen, setScreenBackground, setScreenStyles, setGlobalScreenStyles, setMinigameDefaults, type ManifestFile } from "./game/mcp";
import { emptyMeta, type Condition, type Effect, type Game, type GameNode, type GameObject, type MinigameDefaults, type Predicate, type StudioMeta, type ExperienceStyle, type Branding, type GameMode, type Difficulty, type ZoneContent, type ZoneId } from "./game/types";
import { buildCompatSidecar, canExportToChannel, type ChannelId } from "./game/compat";
import { fetchAsset, fetchPack, getCatalogUrl, listGames, publishGame, setCatalogUrl as sauvegarderCatalogUrl, type CatalogEntry } from "./game/catalog";
import { sha256Hex } from "./game/pack";
import { FONT_OPTIONS, estPoliceConnue } from "./game/fonts";
import {
  MODULES_FR, CONDITIONS_FR, FAMILLES, PRESETS_RAYON, MILIEUX, ETATS_FR,
  OPERATEURS_FR, erreurFR, IMPORTER, type Milieu,
} from "./game/i18n-ui";
import registre from "./game/schema/registry.json";
import { MODULE_REGISTRY } from "./game/modules";

const TYPES_MODULE = ["INFO", ...Object.keys(registre), "RANDOM_POOL"];

// Mise en page par défaut (change studio-composer-3-colonnes) : largeurs en px,
// bornées à l'usage (droite 280–640, liste 220–520), sections latérales dépliées.
// Le panneau central (graphe/carte/screen) n'est jamais repliable.
const LAYOUT_DEFAUT = {
  droite: 400,
  liste: 340,
  repliees: { liste: false, detail: false },
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
import { ChevronRepli, RailReplie } from "./components/Repli";
import { Accordeon, useAccordeon } from "./components/Accordeon";
import MapView from "./components/MapView";
import { PhoneCanvas, VIEWPORTS, type ViewportId } from "./components/wysiwyg/PhoneCanvas";
import { enregistrerAssetSession } from "./components/wysiwyg/image-files";
import { ImagePicker } from "./components/wysiwyg/ImagePicker";
import { PropertiesPanel } from "./components/wysiwyg/PropertiesPanel";
import { TemplatePicker } from "./components/wysiwyg/TemplatePicker";
import { PlayerTerminal } from "./components/wysiwyg/PlayerTerminal";
import { ZoneTracer, ZoneForme, type DiffZone } from "./components/wysiwyg/plugins/difference-game";
import { ScreenProperties } from "./components/wysiwyg/ScreenProperties";
import { resolveScreen } from "./game/screen-utils";
import { donneesDefautModule, ecranDefautModule, getScreenPlugin } from "./game/module-screen-plugin";
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
type Ecran = "composer" | "importer" | "relire" | "valider" | "previsualiser" | "exporter" | "config" | "inventaire" | "modules";

const ECRANS: { id: Ecran; nom: string; icone: IconName }[] = [
  { id: "composer", nom: "Composer", icone: "graphe" },
  { id: "importer", nom: "Importer", icone: "importer" },
  { id: "relire", nom: "Relire", icone: "oeil" },
  { id: "valider", nom: "Valider", icone: "valider" },
  { id: "previsualiser", nom: "Prévisualiser", icone: "essai" },
  { id: "exporter", nom: "Exporter", icone: "exporter" },
  { id: "config", nom: "Configuration", icone: "engrenage" },
  { id: "inventaire", nom: "Inventaire", icone: "package" },
  { id: "modules", nom: "Modules", icone: "zone" },
];

// Barre des viewports d'aperçu (change studio-control-priority) : P2 replié
// avec badge du viewport courant. Enfant dédié car zoneGraphe est un useMemo.
function BarreViewports({ viewport, onChoisir }: { viewport: ViewportId; onChoisir: (v: ViewportId) => void }) {
  const [ouvert, basculer] = useAccordeon("apercu-viewports", false);
  const courant = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[0];
  return (
    <Accordeon
      id="apercu-viewports"
      titre="Aperçu"
      badge={
        courant ? (
          <span className="puce" title={`${courant.libelle} (${courant.largeur}×${courant.hauteur})`}>
            {courant.largeur}×{courant.hauteur}
          </span>
        ) : undefined
      }
      ouvert={ouvert}
      onToggle={basculer}
    >
      <div className="flex shrink-0 items-center gap-1" role="toolbar" aria-label="Viewport d'aperçu">
        {VIEWPORTS.map((v) => {
          const icone =
            v.id === "phone-portrait" ? "tel-portrait"
            : v.id === "phone-landscape" ? "tel-paysage"
            : v.id === "tablet-portrait" ? "tab-portrait"
            : "tab-paysage";
          const etiquette = `${v.libelle} (${v.largeur}×${v.hauteur})`;
          return (
            <button
              key={v.id}
              type="button"
              className={`btn min-h-9 px-2.5 ${viewport === v.id ? "btn-active" : ""}`}
              aria-pressed={viewport === v.id}
              aria-label={etiquette}
              title={etiquette}
              onClick={() => onChoisir(v.id)}
            >
              <Icon name={icone} size={14} />
            </button>
          );
        })}
      </div>
    </Accordeon>
  );
}

export default function App() {  const [st, dispatch] = useReducer(reduce, undefined, initDraft);
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
  // Catalogue des jeux (change studio-game-catalog) : URL du service
  // persistée, liste chargée à la demande, publication et résultat.
  const [catalogUrl, setCatalogUrl] = useState(getCatalogUrl);
  const changerCatalogUrl = (url: string) => {
    setCatalogUrl(url);
    sauvegarderCatalogUrl(url);
  };
  const [catalogue, setCatalogue] = useState<CatalogEntry[] | null>(null);
  const [catalogueErreur, setCatalogueErreur] = useState<string | null>(null);
  const [catalogueRecherche, setCatalogueRecherche] = useState("");
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [publication, setPublication] = useState<{ code: string; gameId: string; version: number } | { erreur: string } | null>(null);
  const [publicationBusy, setPublicationBusy] = useState(false);
  // Octets des images choisies pendant la session (change
  // studio-media-templates, design D1) : chemin manifest -> File, gardés en
  // mémoire pour téléchargement à l'export. Jamais dans le JSON ni le brouillon.
  const assetsSession = useRef(new Map<string, File>());
  // Enregistre un fichier image au manifest et retourne son chemin d'asset.
  // Même contenu (sha) -> chemin existant réutilisé ; collision de nom ->
  // suffixe numérique. Erreur explicite hors contexte sécurisé (WebCrypto).
  const prendreImage = useCallback(async (file: File): Promise<string> => {
    if (typeof crypto?.subtle?.digest !== "function") {
      throw new Error("Empreinte impossible dans ce contexte : ajoutez le fichier via l'écran Exporter (bouton Fichier).");
    }
    const octets = new Uint8Array(await file.arrayBuffer());
    const sha256 = await sha256Hex(octets);
    const deja = manifest.find((m) => m.sha256 === sha256);
    if (deja) {
      assetsSession.current.set(deja.path, file);
      enregistrerAssetSession(deja.path, file);
      return deja.path;
    }
    const base = (file.name.replace(/[^a-zA-Z0-9._-]+/g, "_") || "image.png").slice(0, 80);
    const point = base.lastIndexOf(".");
    const [nom, ext] = point > 0 ? [base.slice(0, point), base.slice(point)] : [base, ""];
    let chemin = `assets/${base}`;
    let i = 2;
    const pris = new Set([...manifest.map((m) => m.path), ...assetsSession.current.keys()]);
    while (pris.has(chemin)) {
      chemin = `assets/${nom}-${i}${ext}`;
      i++;
    }
    setManifest((m) => registerAsset(m, { path: chemin, version: "1.0.0", size: file.size, sha256 }));
    assetsSession.current.set(chemin, file);
    enregistrerAssetSession(chemin, file);
    return chemin;
  }, [manifest]);
  const [nouveauType, setNouveauType] = useState("GEOFENCE");
  // Mini-jeu choisi en premier à la création d'étape (change
  // studio-module-first) : détermine le module, ses données et l'écran
  // initial. Partagé par tous les points d'entrée (liste, rails, menu).
  const [moduleCreation, setModuleCreation] = useState("QUIZ");
  const [etapeWorkflow, setEtapeWorkflow] = useState<EtapeWorkflow>(1);
  const [onglet, setOnglet] = useState<Onglet>("graphe");
  const [ecran, setEcran] = useState<Ecran>("composer");
  // Canal d'export (change player-pwa-shell) : NATIVE par défaut, PWA pour
  // la coquille web. Le verdict de compatibilité est affiché à l'écran
  // Exporter et embarqué (compat.json) ; un canal refusé bloque son export.
  const [canalExport, setCanalExport] = useState<ChannelId>("NATIVE");
  // Verdicts C1/C2 pour la barre globale (null = couche non exécutée).
  const [couches, setCouches] = useState<{ c1: boolean; c2: boolean | null }>({ c1: true, c2: true });
  // Détail par couche pour l'écran Valider (erreurs brutes, groupées au rendu).
  const [detailCouches, setDetailCouches] = useState<{ layer: number; errors: string[] }[]>([]);
  // Calque transverse superposé (null = fermé) : i18n ou difficultés/modes.
  const [calque, setCalque] = useState<null | "i18n" | "modes">(null);
  // Vue centrale : graphe ReactFlow, carte MapView (geo/indoor) ou ecran WYSIWYG du noeud selectionne
  const [vueCentrale, setVueCentrale] = useState<"graphe" | "carte" | "screen">("graphe");
  // Famille active de l'Inspecteur (change studio-action-rails) : remontée ici
  // pour que le rail détail puisse déplier + activer une famille directement.
  const [activeFamille, setActiveFamille] = useState<string>(FAMILLES[0].id);
  // Section Avancé de l'écran Config (change studio-control-priority), fermée.
  const [configAvanceOuvert, basculerConfigAvance] = useAccordeon("config-avance", false);
  // Brouillon local : effacement destructif replié (change studio-control-priority).
  const [brouillonAvanceOuvert, basculerBrouillonAvance] = useAccordeon("importer-avance-brouillon", false);
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
  // Largeurs des panneaux latéraux + sections pliées (change studio-composer-3-colonnes),
  // persistées ensemble. La clé historique `repliees.graphe` est ignorée (centre forcé visible).
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
    setMep((m) => ({ ...m, repliees: { ...m.repliees, [s]: !m.repliees[s] } }));
  };
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
  // Cadre disponible du canvas écran (change studio-apercu-arbre-paysage) :
  // mesuré pour la mise à l'échelle en viewport paysage (plein cadre sans
  // ascenseur). Le portrait garde le défilement natif (scale non renseigné).
  const cadreEcranRef = useRef<HTMLDivElement | null>(null);
  const [tailleCadre, setTailleCadre] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = cadreEcranRef.current;
    if (!el) return;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      setTailleCadre((p) => (Math.abs(p.w - r.width) < 1 && Math.abs(p.h - r.height) < 1 ? p : { w: r.width, h: r.height }));
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
    // Dépend de `sel` (déclaré avant ce hook) plutôt que `etape` (déclaré
    // après) : évaluer `etape` ici lèverait une TDZ au rendu.
  }, [vueCentrale, sel]);
  // Section surlignée après un drill-down (anneau temporaire, sans décalage de mise en page).
  const [sectionSurlignee, setSectionSurlignee] = useState<string | null>(null);
  const surlignageTimer = useRef<number | undefined>(undefined);
  const surlignage = (s: string) =>
    sectionSurlignee === s ? { outline: "3px solid var(--focus)", outlineOffset: 2 } : undefined;
  const allerEtape = (e: EtapeWorkflow) => {
    setEtapeWorkflow(e);
    const cible = SECTION_PAR_ETAPE[e];
    // Seuls les panneaux latéraux sont dépliables (change studio-composer-3-colonnes) :
    // le centre (graphe) est toujours visible, on se contente de le surligner.
    const pliable = (["detail", "liste"] as const).includes(cible as SectionPliable)
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
  // Création module-first (change studio-module-first) : le mini-jeu choisi
  // (`moduleCreation`, premier choix du flux) détermine module, données et
  // écran initial. Seul le tirage impose son type structurel.
  const ajouterEtape = (preset: "etape" | "tirage" | "fin" | "lieu") => {
    if (relecture) return;
    const id = `etape-${game.nodes.length + 1}`;
    if (preset === "tirage") {
      composerEtapes([{
        id, module: { type: "RANDOM_POOL", data: donneesDefautModule("RANDOM_POOL") },
        activation: { requires: [{ type: "TIMER", anchor: "GAME_START", delaySeconds: 0 }] },
        randomPool: { candidates: [], drawCount: 1, drawTiming: "ON_POOL_ACTIVATION" },
        screen: ecranDefautModule("RANDOM_POOL"),
      }]);
    } else if (preset === "fin") {
      composerEtapes([{
        id, module: { type: moduleCreation, data: donneesDefautModule(moduleCreation) },
        activation: { requires: [] }, isEnding: true,
        screen: ecranDefautModule(moduleCreation),
      }]);
    } else if (preset === "lieu") {
      composerEtapes([{
        id, module: { type: moduleCreation, data: donneesDefautModule(moduleCreation) },
        activation: { requires: [{ type: "GEOFENCE", lat: 48.0, lng: 2.0, radiusMeters: 30, predicate: "enter" }] },
        screen: ecranDefautModule(moduleCreation),
      }]);
    } else {
      composerEtapes([{
        id, module: { type: moduleCreation, data: donneesDefautModule(moduleCreation) },
        activation: { requires: [] },
        screen: ecranDefautModule(moduleCreation),
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
  // Mode "Jeux" plein ecran (change studio-player-preview) : vue sur l'etat
  // de simulation existant, jamais reinitialise a l'entree ni a la sortie.
  const [modeJeux, setModeJeux] = useState(false);
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
  // Entrée MODE JEUX (change studio-lot-correctifs) : sans nœud actif, on
  // ouvre la tête de file (premier éligible) au lieu de la salle d'attente ;
  // l'ouverture est journalée comme toute ouverture manuelle. File vide =
  // salle d'attente inchangée. L'enchaînement reste l'avance auto existante.
  const entrerModeJeux = () => {
    if (!activeId && file.length) ouvrir(file[0]);
    setModeJeux(true);
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
      // Avance auto (change studio-correctifs-terrain) : réévalue avec les
      // états frais (done + draws à jour) et rouvre le premier éligible ;
      // sinon retomber sur l'attente existante.
      const base = objetSim();
      const sFrais: Sim = { ...base, completedAt: new Map(base.completedAt).set(id, sim.dtMin * 60000) };
      const fraisDone = new Map(Object.entries(done));
      fraisDone.set(id, sim.dtMin * 60000);
      const fraisCounts = new Map(Object.entries(counts));
      fraisCounts.set(id, fois);
      const suivant = evaluate(game, sFrais, nextDraws, fraisDone, fraisCounts, new Set()).unlocked.find((nid) => nid !== id) ?? null;
      if (suivant) journal(`${suivant} : ouverture auto`);
      setActiveId(suivant);
    } else {
      journal(`${id} : abandonnée`);
      setActiveId(null);
    }
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

  // Porte unique d'export (spec studio-authoring) : la barre globale OUVRE
  // l'écran Exporter, qui seul exécute la génération via genererPack.
  const exporter = () => {
    setEcran("exporter");
  };

  // Génération du pack depuis l'écran Exporter. En échec on RESTE sur
  // l'écran (la checklist reflète l'état) au lieu de repartir au Composer.
  const genererPack = async () => {
    if (bloqueExport && !animateur) return;
    const r = await exportPackFull(game, st.present.meta, manifest, animateur);
    if (!r.ok) {
      setBrut(r.errors);
      setRapport(r.errors.map(erreurFR));
      setEtapeWorkflow(4);
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
    dl("compat.json", JSON.stringify(buildCompatSidecar(game), null, 2));
    // Assets choisis pendant la session (change studio-media-templates) :
    // les octets gardés en mémoire sont proposés au téléchargement avec le pack.
    let nbAssets = 0;
    for (const [chemin, fichier] of assetsSession.current) {
      if (!r.manifest!.files.some((m) => m.path === chemin)) continue;
      const url = URL.createObjectURL(fichier);
      const a = document.createElement("a");
      a.href = url;
      a.download = chemin.split("/").pop() ?? chemin;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      nbAssets++;
    }
    setRapport([`Export OK : game.json + manifest (${r.manifest!.files.length} fichiers) + studio-meta.json${nbAssets ? ` + ${nbAssets} asset(s)` : ""}`]);
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
        return;
      }
      edit((s) => ({ game: g, meta: emptyMeta() }), "importer");
      // Remplace le brouillon sans attendre le debounce (fermeture d'onglet immédiate).
      setSauvegardeIndispo(!sauvegarderBrouillon({ game: g, meta: emptyMeta() }));
      setSel(null);
      nouvelleSession();
      setImportEchoue(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBrut([msg]);
      setRapport([msg]);
      setImportEchoue(file.name);
    }
  };

  // Catalogue des jeux (change studio-game-catalog) : publication, liste,
  // import. Le service n'est qu'un transport — validation et vérification
  // restent les pipelines existants (exportPackFull / importerFichier).
  const publier = async () => {
    if ((bloqueExport && !animateur) || relecture || !catalogUrl || publicationBusy) return;
    setPublicationBusy(true);
    setPublication(null);
    try {
      const r = await exportPackFull(game, st.present.meta, manifest, animateur);
      if (!r.ok) {
        setBrut(r.errors);
        setRapport(r.errors.map(erreurFR));
        setPublication({ erreur: r.errors.map(erreurFR).join(" ; ") });
        return;
      }
      const assets = [...assetsSession.current]
        .filter(([chemin]) => r.manifest!.files.some((m) => m.path === chemin))
        .map(([path, file]) => ({ path, file }));
      const p = await publishGame(catalogUrl, {
        gameId: game.gameId,
        gameJson: r.gameJson!,
        manifest: r.manifest!,
        assets,
      });
      setPublication(p);
      setRapport([`Publié : ${p.gameId} v${p.version} — code ${p.code}`]);
    } catch (e) {
      setPublication({ erreur: e instanceof Error ? e.message : String(e) });
    } finally {
      setPublicationBusy(false);
    }
  };

  const chargerCatalogue = async () => {
    if (relecture || !catalogUrl || catalogueBusy) return;
    setCatalogueBusy(true);
    setCatalogueErreur(null);
    try {
      setCatalogue(await listGames(catalogUrl));
    } catch (e) {
      setCatalogue(null);
      setCatalogueErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setCatalogueBusy(false);
    }
  };

  const importerDepuisCatalogue = async (entry: CatalogEntry) => {
    if (relecture || !catalogUrl) return;
    try {
      const pack = await fetchPack(catalogUrl, entry.code);
      await importerFichier(new File([pack.gameJson], `${pack.gameId}.json`, { type: "application/json" }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBrut([msg]);
      setRapport([msg]);
      setImportEchoue(entry.code);
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

  // Échelle du canvas écran en paysage (change studio-apercu-arbre-paysage) :
  // réduction seule (jamais d'agrandissement) pour un plein cadre sans
  // ascenseur. Portrait : scale non renseigné (défilement natif inchangé).
  const formatEcran = VIEWPORTS.find((v) => v.id === screenViewport) ?? VIEWPORTS[0];
  const echelleEcran =
    (screenViewport === "phone-landscape" || screenViewport === "tablet-landscape") &&
    tailleCadre.w > 0 &&
    tailleCadre.h > 0
      ? Math.min(tailleCadre.w / formatEcran.largeur, tailleCadre.h / formatEcran.hauteur, 1)
      : undefined;
  const scaleEcran = echelleEcran != null && echelleEcran < 1 ? echelleEcran : undefined;

  const zoneGraphe = (
    <div className="flex flex-col flex-1 overflow-hidden min-h-[320px]">
      {/* Barre de toggle始终可见 */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-rule bg-surface">
        <button className={`btn btn-compact text-[8px] ${vueCentrale === "graphe" ? "btn-active" : ""}`} onClick={() => setVueCentrale("graphe")}
          title="Graphe d'étapes">
          <Icon name="graphe" size={15} /> Graphe
        </button>
        <button className={`btn btn-compact text-[8px] ${vueCentrale === "carte" ? "btn-active" : ""}`} onClick={() => setVueCentrale("carte")}
          title="Carte interactive">
          <Icon name="lieu" size={15} /> Carte
        </button>
        <button className={`btn btn-compact text-[8px] ${vueCentrale === "screen" ? "btn-active" : ""}`} onClick={() => setVueCentrale("screen")}
          title={etape ? `Écran de ${etape.id}` : "Sélectionne une étape pour voir son écran"}>
          <Icon name="oeil" size={15} /> Screen
        </button>
        {vueCentrale === "graphe" && (
          <>
            <button className="btn btn-compact text-[8px]" onClick={basculerTout}
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
          <div className="shrink-0 px-2 py-1 border-b border-rule">
            <BarreViewports viewport={screenViewport} onChoisir={setScreenViewport} />
          </div>
          {etape ? (
            <div ref={cadreEcranRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <PhoneCanvas
                screen={resolveScreen(etape, game.global?.screen)}
                moduleType={etape.module.type}
                moduleData={etape.module.data}
                selectedZoneId={screenZone}
                selectedWidgetIndex={screenWidget}
                viewport={screenViewport}
                scale={scaleEcran}
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
            </div>
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
            <Controls showInteractive={false} showFitView={true} fitViewOptions={{ padding: 0.2 }} position="bottom-left">
              <ControlButton
                title={selMulti.length < 2 ? "Sélectionne au moins 2 nœuds (Shift+clic)" : `Aligner horizontalement (${selMulti.length} sélectionnés)`}
                aria-label="Aligner horizontalement"
                disabled={selMulti.length < 2 || relecture}
                onClick={() => { aligner("y"); }}
              >H</ControlButton>
              <ControlButton
                title={selMulti.length < 2 ? "Sélectionne au moins 2 nœuds (Shift+clic)" : `Aligner verticalement (${selMulti.length} sélectionnés)`}
                aria-label="Aligner verticalement"
                disabled={selMulti.length < 2 || relecture}
                onClick={() => { aligner("x"); }}
              >V</ControlButton>
            </Controls>
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
        <button className="puce puce-erreur cursor-pointer" onClick={() => { choisirNoeud([...impasses][0]); setEcran("composer"); }} title="Aller à la première impasse">
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
              <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => { choisirNoeud(cible.id); setEcran("composer"); }} title={`Aller à ${cible.id}`}>
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
            modulePanel={<PanneauModule node={etape} globalDefaults={game.global?.minigameDefaults} onPickFile={prendreImage} lectureSeule={relecture} editGame={editGame} />}
            screenSelected={screenBg}
            screenBackground={etape.screen?.background}
            globalStyles={game.global?.screen?.styles}
            screenStyles={etape.screen?.styles}
            customizableStyles={getScreenPlugin(etape.module.type)?.customizableStyles}
            onPatchGlobalStyles={(s) => editGame((g) => setGlobalScreenStyles(g, s), "setGlobalScreenStyles")}
            onPatchScreenStyles={(s) => editGame((g) => setScreenStyles(g, etape.id, s), "setScreenStyles")}
            onPickFile={prendreImage}
            templatePicker={
              <TemplatePicker
                currentLayout={etape.screen?.layout}
                hasCustomizations={Object.values(etape.screen?.zones ?? {}).some((z) => (z?.widgets?.length ?? 0) > 0)}
                screenCourant={etape.screen}
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
                onAllerConfig={() => setEcran("config")} onPickFile={prendreImage}
                activeFamille={activeFamille} setActiveFamille={setActiveFamille}
              />
            }
            onPatchZone={(z, patch) => editGame((g) => patchScreenZone(g, etape.id, z, patch), "patchScreenZone")}
            onSelectWidget={(z, i) => { setScreenZone(z); setScreenWidget(i); }}
            onAddWidget={(z, w) => editGame((g) => addScreenWidget(g, etape.id, z, w), "addScreenWidget")}
            onRemoveWidget={(z, i) => { editGame((g) => removeScreenWidget(g, etape.id, z, i), "removeScreenWidget"); setScreenWidget(null); }}
            onMoveWidget={(z, i, dir) => { editGame((g) => moveScreenWidget(g, etape.id, z, i, dir), "moveScreenWidget"); setScreenWidget(i + dir); }}
            onRemoveZone={(z) => { editGame((g) => removeScreenZone(g, etape.id, z), "removeScreenZone"); setScreenZone(null); setScreenWidget(null); }}
            onPatchWidget={(z, i, w) => editGame((g) => mcpSetScreenWidget(g, etape.id, z, i, w), "setScreenWidget")}
          />
        ) : (
            <Inspecteur
              game={game} node={etape} meta={st.present.meta} editGame={editGame} edit={edit}
              nouveauType={nouveauType} setNouveauType={setNouveauType} lectureSeule={relecture}
              onAllerConfig={() => setEcran("config")} onPickFile={prendreImage}
              activeFamille={activeFamille} setActiveFamille={setActiveFamille}
            />
        )
      ) : (
        <div className="p-3 text-[9px]">
          <p className="font-bold">Rien de sélectionné.</p>
          <p className="text-fog">Sélectionne une étape dans le graphe ou dans la liste pour la visualiser et la modifier.</p>
        </div>
      )}
    </aside>
  ), [etape, game, st.present.meta, edit, editGame, nouveauType, relecture, vueCentrale, screenZone, screenWidget, screenBg, prendreImage, activeFamille]);

  // Listes mémoïsées (change studio-graph-selection) : mêmes dépendances de données
  // que le détail, pour ne pas re-rendre à chaque frame de drag.
  const liste = useMemo(() => (
    <div className="flex flex-col min-h-0">
      <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} selMulti={selMulti} onChoisir={choisirNoeud} onChoisirZone={(id, z) => { choisirNoeud(id); setScreenZone(z); setScreenWidget(null); setScreenBg(false); setMep((m) => (m.repliees.detail ? { ...m, repliees: { ...m.repliees, detail: false } } : m)); }} onChoisirWidget={(id, z, i) => { choisirNoeud(id); setScreenZone(z); setScreenWidget(i); setScreenBg(false); setMep((m) => (m.repliees.detail ? { ...m, repliees: { ...m.repliees, detail: false } } : m)); }} selZoneId={screenZone} selWidgetIndex={screenWidget} onBasculer={(id) => choisirNoeud(id, true)} onToutBasculer={basculerTout} toutSelectionne={toutEstSelectionne} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} onReplier={() => basculerSection("liste")} onAjouter={(preset) => ajouterEtape(preset)} onSupprimer={!relecture ? (id) => editGame((g) => removeNode(g, id), "removeNode") : undefined} moduleCreation={moduleCreation} onModuleCreation={setModuleCreation} typesModule={TYPES_MODULE} />
    </div>
  ), [game, st.present.meta.status, impasses, sel, selMulti, erreursParNoeud, relecture, choisirNoeud, basculerTout, toutEstSelectionne, ajouterEtape, moduleCreation, screenZone, screenWidget]);
  const listeSimple = useMemo(() => (
    <div className="flex flex-col min-h-0">
      <NodeList game={game} statuts={st.present.meta.status} impasses={impasses} sel={sel} selMulti={selMulti} onChoisir={choisirNoeud} onBasculer={(id) => choisirNoeud(id, true)} onToutBasculer={basculerTout} toutSelectionne={toutEstSelectionne} erreursParNoeud={erreursParNoeud} lectureSeule={relecture} onAjouter={(preset) => ajouterEtape(preset)} onSupprimer={!relecture ? (id) => editGame((g) => removeNode(g, id), "removeNode") : undefined} moduleCreation={moduleCreation} onModuleCreation={setModuleCreation} typesModule={TYPES_MODULE} />
    </div>
  ), [game, st.present.meta.status, impasses, sel, selMulti, erreursParNoeud, relecture, choisirNoeud, basculerTout, toutEstSelectionne, ajouterEtape, moduleCreation]);

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
          <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-3">Catalogue des jeux</div>
          <div className="flex flex-col gap-2 mb-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-fog">Service catalogue</span>
              <span className="flex gap-2">
                <input
                  className="champ min-w-0 flex-1 min-h-10 font-mono"
                  value={catalogUrl}
                  onChange={(e) => changerCatalogUrl(e.target.value)}
                  placeholder="https://catalogue.exemple.fr"
                  type="url"
                />
                <button className="btn min-h-10 px-2.5 text-[8px]" onClick={() => void chargerCatalogue()} disabled={relecture || !catalogUrl || catalogueBusy} title="Charger la liste des jeux publiés">
                  {catalogueBusy ? "…" : "Actualiser"}
                </button>
              </span>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-fog">Rechercher (nom ou code)</span>
              <input
                className="champ min-w-0 flex-1 min-h-10"
                value={catalogueRecherche}
                onChange={(e) => setCatalogueRecherche(e.target.value)}
                placeholder="Nom du jeu ou code à 4 chiffres…"
                type="search"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            {catalogueErreur ? (
              <p className="text-[9px] font-mono text-fail" role="alert">{catalogueErreur}</p>
            ) : catalogue === null ? (
              <p className="text-[9px] font-mono text-fog">Renseignez le service puis actualisez pour voir les jeux publiés.</p>
            ) : (() => {
              const q = catalogueRecherche.trim().toLowerCase();
              const visibles = catalogue.filter((g) =>
                !q || g.nom.toLowerCase().includes(q) || g.code === catalogueRecherche.trim(),
              );
              return visibles.length ? (
                visibles.map((g) => (
                  <div key={g.code} className="flex items-center gap-3 bg-panel border border-rule rounded px-4 py-3">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                      <path d="M14 2v6h6"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-mono text-[9px] text-snow">{g.nom}</div>
                      <div className="font-mono text-[8px] text-fog">v{g.version}{g.date ? ` · ${g.date}` : ""}</div>
                    </div>
                    <span className="puce" title="Code d'accès du jeu">{g.code}</span>
                    <button
                      className="text-[8px] font-mono uppercase tracking-wider text-fog hover:text-neon transition-colors disabled:opacity-40"
                      disabled={relecture}
                      onClick={() => void importerDepuisCatalogue(g)}
                      title={`Importer ${g.nom} depuis le catalogue`}
                    >
                      Importer
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[9px] font-mono text-fog">Aucun jeu ne correspond à « {catalogueRecherche} ».</p>
              );
            })()}
          </div>
          <div className="mt-4 border-t border-rule pt-3">
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Brouillon local</div>
            <p className="text-[9px] font-mono text-fog mb-2">Le jeu en cours est sauvegardé automatiquement dans ce navigateur.</p>
            <Accordeon
              id="importer-avance-brouillon"
              titre="Avancé"
              badge={<span className="puce puce-erreur">Destructif</span>}
              ouvert={brouillonAvanceOuvert}
              onToggle={basculerBrouillonAvance}
            >
              <button className="btn-danger min-h-8 px-2.5 text-[8px]" onClick={effacerBrouillon} disabled={relecture} title="Supprimer la sauvegarde locale et repartir sur un jeu vide">
                Effacer le brouillon
              </button>
            </Accordeon>
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
            {pied}
            {listeErreurs}
            <BlocValidation couches={detailCouches} verdicts={couches} game={game} onVoir={(id) => { choisirNoeud(id); setEcran("composer"); }} />
          </div>
        </div>
      )}
      {ecran === "previsualiser" && (
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow">Prévisualiser</h2>
            <span className="flex gap-1">
              <button onClick={() => entrerModeJeux()} disabled={!activeId && !file.length} className="text-[8px] font-mono uppercase tracking-wider px-3 py-1.5 border border-rule rounded text-fog hover:border-neon/40 hover:text-neon transition-colors disabled:opacity-40">▶ Mode Jeux</button>
              <button onClick={testerBranches} className="text-[8px] font-mono uppercase tracking-wider px-3 py-1.5 border border-rule rounded text-fog hover:border-neon/40 hover:text-neon transition-colors">↺ Rejouer fixture</button>
            </span>
          </div>
          <Apercu
            game={game} sim={sim} setSim={setSim} file={file} activeId={activeId}
            ouvrir={ouvrir} terminer={terminer} draws={draws} forced={forced} setForced={setForced}
            log={log} testAll={testAll} testerBranches={testerBranches} sessionId={sessionId}
            setSessionId={setSessionId} nouvelleSession={nouvelleSession}
            reculer={reculerSim} nbTermines={Object.keys(done).length}
            holdSim={holdSim} onHoldLock={forcerHoldLock} onHoldExit={forcerHoldExit}
          />
          {modeJeux && activeId && game.nodes.some((n) => n.id === activeId) && (
            <PlayerTerminal
              node={game.nodes.find((n) => n.id === activeId)!}
              globalScreen={game.global?.screen}
              branding={game.branding}
              experienceStyle={game.global?.experienceStyle}
              holdMode={game.global?.holdMode ?? "none"}
              onCompleteNode={() => activeId && terminer(activeId, false)}
              onTerminer={() => activeId && terminer(activeId, false)}
              onAbandonner={() => activeId && terminer(activeId, true)}
              onQuitter={() => setModeJeux(false)}
            />
          )}
          {modeJeux && !activeId && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-canvas" role="dialog" aria-label="Terminal joueur simulé — en attente" tabIndex={0} onKeyDown={(e) => { if (e.key === "Escape") setModeJeux(false); }}>
              <span className="puce">SIMULÉ</span>
              <p className="text-[11px] text-fog">En attente — aucun nœud ouvert.</p>
              <div className="flex gap-1 flex-wrap justify-center">
                {file.map((id) => (
                  <button key={id} className="btn min-h-9" onClick={() => ouvrir(id)}>Ouvrir {id}</button>
                ))}
              </div>
              <button className="btn min-h-9" onClick={() => setModeJeux(false)}>Quitter (Échap)</button>
            </div>
          )}
        </div>
      )}
      {ecran === "exporter" && (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-md">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Exporter</h2>
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-3">Contrôle pré-export</div>
            <div className="bg-panel border border-rule rounded-md overflow-hidden mb-5">
              {(() => {
                const brouillons = game.nodes
                  .filter((n) => (st.present.meta.status[n.id]?.state ?? "draft") === "draft")
                  .map((n) => n.id);
                const hold = game.global?.holdMode ?? "none";
                const c1err = detailCouches.find((l) => l.layer === 1)?.errors.length ?? 0;
                const c2 = detailCouches.find((l) => l.layer === 2);
                const c2err = c2?.errors.length ?? 0;
                const lignes: { ok: boolean | null; label: string }[] = [
                  { ok: couches.c1, label: `Schéma C1 conforme (AJV Draft-07)${c1err ? ` — ${c1err} erreur(s), voir Valider` : ""}` },
                  { ok: couches.c2, label: couches.c2 == null ? "C2 applicative — non exécutée (C1 en échec)" : `C2 applicative (cycles, atteignabilité, pools, HOLD, références)${c2err ? ` — ${c2err} erreur(s), voir Valider` : ""}` },
                  { ok: finPresente, label: finPresente ? "Nœud isEnding présent (FIN)" : "Nœud isEnding manquant (désigne une Fin du jeu)" },
                  { ok: brouillons.length === 0, label: brouillons.length === 0 ? "Aucun nœud en statut draft" : `${brouillons.length} nœud(s) en statut draft : ${brouillons.join(", ")}` },
                  ...(hold !== "none"
                    ? [{ ok: (brouillons.length === 0) as boolean | null, label: `Kiosque HOLD (${hold}) — jeu relu exigé${brouillons.length ? " : relecture en cours" : ""}` }]
                    : []),
                ];
                return lignes.map((p, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < lignes.length - 1 ? 'border-b border-rule/40' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      {p.ok == null ? (
                        <circle cx="7" cy="7" r="6" stroke="#8b8f98" strokeWidth="1.2" strokeDasharray="2 2" />
                      ) : p.ok ? (
                        <>
                          <circle cx="7" cy="7" r="6" stroke="#10b981" strokeWidth="1.2" />
                          <path d="M4.5 7l2 2 3-3" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
                          <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2" />
                          <path d="M5 5l4 4M9 5l-4 4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                    <span className={`text-[11px] ${p.ok == null ? 'text-fog' : p.ok ? 'text-snow' : 'text-fail'}`}>{p.label}</span>
                  </div>
                ));
              })()}
            </div>
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Canal player (compatibilité)</div>
            {(() => {
              const verdicts = (["NATIVE", "PWA"] as ChannelId[]).map((c) => ({ canal: c, ...canExportToChannel(game, c) }));
              const courant = verdicts.find((v) => v.canal === canalExport)!;
              return (
                <div className="bg-panel border border-rule rounded-md overflow-hidden mb-5">
                  <div className="flex gap-2 px-4 py-3 border-b border-rule/40" role="radiogroup" aria-label="Canal d'export">
                    {(["NATIVE", "PWA"] as ChannelId[]).map((c) => (
                      <button
                        key={c}
                        role="radio"
                        aria-checked={canalExport === c}
                        className={`btn min-h-8 px-2.5 text-[8px] ${canalExport === c ? "btn-active" : ""}`}
                        onClick={() => setCanalExport(c)}
                      >
                        {c === "NATIVE" ? "Natif" : "PWA"}
                      </button>
                    ))}
                  </div>
                  {verdicts.map((v) => (
                    <div key={v.canal} className="px-4 py-2 border-b border-rule/40 last:border-0">
                      <span className={`puce ${v.ok ? (v.replis.length ? "puce-caution" : "puce-ok") : "puce-erreur"}`}>
                        {v.canal} : {v.ok ? (v.replis.length ? "dégradé" : "compatible") : "refusé"}
                      </span>
                      {v.motifs.map((m, i) => (
                        <p key={i} className="text-[10px] text-fail mt-1">• {m}</p>
                      ))}
                      {v.replis.map((r, i) => (
                        <p key={i} className="text-[10px] text-caution mt-1">• repli : {r}</p>
                      ))}
                    </div>
                  ))}
                  {!courant.ok && (
                    <p className="px-4 py-2 text-[10px] text-fail" role="alert">
                      Export {courant.canal} bloqué : corriger les motifs ci-dessus ou choisir l'autre canal.
                    </p>
                  )}
                </div>
              );
            })()}
            <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Manifeste (aperçu)</div>
            <div className="bg-canvas border border-rule rounded p-3 mb-5 font-mono text-[9px] space-y-1">
              <div className="flex"><span className="text-neon flex-1">game.json</span><span className="text-fog mr-4">v{game.schemaVersion}</span><span className="text-fog">taille calculée à la génération</span></div>
              {manifest.map((m) => (
                <div key={m.path} className="flex"><span className="text-neon flex-1">{m.path}</span><span className="text-fog mr-4">v{m.version}</span><span className="text-fog">taille calculée à la génération</span></div>
              ))}
              {dernierExport ? (
                <div className="pt-2 border-t border-rule text-fog">Dernier export : {new Date(dernierExport.date).toLocaleString()} — {dernierExport.files.map((f) => `${f.path} (sha256: ${f.sha256.slice(0, 8)}…)`).join(" · ")}</div>
              ) : (
                <div className="pt-2 border-t border-rule text-fog">{manifest.length + 1} fichier(s) · tailles et sha256 calculés à la génération</div>
              )}
            </div>
            {(() => {
              const bloque = bloqueExport && !animateur;
              return (
                <>
                  <button disabled={bloque} onClick={genererPack} title={bloque ? raisonsBlocage.join("\n") : "Générer le pack offline"}
                    className={`w-full py-3 rounded font-display font-bold text-[9px] uppercase tracking-widest transition-all ${bloque ? 'bg-fail/8 border border-fail/20 text-fail/50 cursor-not-allowed' : 'bg-neon text-canvas hover:brightness-110'}`}>
                    {bloque ? "Export bloqué — corriger les erreurs" : "Générer le pack"}
                  </button>
                  {bloque && (
                    <ul className="mt-2 font-mono text-[8px] text-fail space-y-1" aria-label="Causes du blocage">
                      {raisonsBlocage.map((r, i) => (
                        <li key={i}>• {erreurFR(r)}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 border-t border-rule pt-3" aria-label="Publier au catalogue">
                    <div className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">Publier au catalogue</div>
                    <label className="flex flex-col gap-1 text-xs mb-2">
                      <span className="text-fog">Service catalogue</span>
                      <input
                        className="champ min-w-0 flex-1 min-h-10 font-mono"
                        value={catalogUrl}
                        onChange={(e) => changerCatalogUrl(e.target.value)}
                        placeholder="https://catalogue.exemple.fr"
                        type="url"
                      />
                    </label>
                    <button
                      disabled={bloque || !catalogUrl || publicationBusy}
                      onClick={() => void publier()}
                      title={bloque ? raisonsBlocage.join("\n") : "Publier une nouvelle version (même code)"}
                      className={`w-full py-3 rounded font-display font-bold text-[9px] uppercase tracking-widest transition-all ${bloque || !catalogUrl ? 'bg-fail/8 border border-fail/20 text-fail/50 cursor-not-allowed' : 'bg-neon text-canvas hover:brightness-110'}`}
                    >
                      {publicationBusy ? "Publication…" : "Publier"}
                    </button>
                    {publication && ("erreur" in publication ? (
                      <p className="mt-2 font-mono text-[8px] text-fail" role="alert">{publication.erreur}</p>
                    ) : (
                      <p className="mt-2 font-mono text-[8px] text-pass" role="status">
                        Publié : {publication.gameId} v{publication.version} — code <b>{publication.code}</b>
                      </p>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {ecran === "config" && (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-2xl">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Configuration</h2>
            <ModePanel game={game} edit={edit} lectureSeule={relecture} />
            <ExperienceStylePanel game={game} edit={edit} lectureSeule={relecture} />
            <BrandingPanel game={game} edit={edit} lectureSeule={relecture} onPickFile={prendreImage} />
            <ScreenGlobalPanel game={game} edit={edit} lectureSeule={relecture} onPickFile={prendreImage} />
            <Accordeon
              id="config-avance"
              titre="Avancé"
              badge={<span className="puce">Défauts mini-jeux</span>}
              ouvert={configAvanceOuvert}
              onToggle={basculerConfigAvance}
            >
              <MinigameDefaultsPanel game={game} editGame={editGame} lectureSeule={relecture} />
            </Accordeon>
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
      {ecran === "inventaire" && (
        <div className="h-full overflow-y-auto">
          <div className="p-6 max-w-2xl">
            <h2 className="font-display font-extrabold text-2xl tracking-widest uppercase text-snow mb-6">Inventaire</h2>
            <ObjetsPanel game={game} editGame={editGame} lectureSeule={relecture} onChoisir={choisirNoeud} onPickFile={prendreImage} catalogUrl={catalogUrl} onProvenance={(id, prov) => edit((s) => ({ ...s, meta: { ...s.meta, provenance: { ...s.meta.provenance, [id]: prov } } }), "definirProvenance")} />
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
          size={Math.max(4, (game.branding?.name ?? "").length + 2)}
          title={game.branding?.name ?? "Nom du jeu"}
          className="bg-transparent border-b border-rule text-snow font-display text-[10px] tracking-wide min-w-0 max-w-[280px] outline-none focus:border-snow placeholder:text-fog/40 disabled:opacity-40"
        />
        <div className="h-3 w-px bg-rule" />
        <div className="flex items-center gap-4 font-mono text-[8px] text-fog">
          <span><span className="text-snow">{game.nodes.length}</span> nœuds</span>
          <span><span className="text-caution">{nbBrouillons}</span> draft</span>
          <span><span className="text-pass">{game.nodes.length - nbBrouillons}</span> reviewed</span>
          <PastilleValidation nbErreurs={erreurs.length} onVoir={() => setEcran("valider")} />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors"
            onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Basculer en mode clair" : "Basculer en mode sombre"}
          ><Icon name={theme === "dark" ? "soleil" : "lune"} size={13} /></button>
          <button className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors" disabled={!st.past.length || relecture} onClick={() => dispatch({ t: "undo" })} title="Annuler" aria-label="Annuler"><Icon name="annuler" size={13} /></button>
          <button className="px-2.5 py-1 text-[7px] font-mono uppercase tracking-wider border border-rule rounded text-fog hover:text-snow transition-colors" disabled={!st.future.length || relecture} onClick={() => dispatch({ t: "redo" })} title="Rétablir" aria-label="Rétablir"><Icon name="retablir" size={13} /></button>
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
            <button className="btn px-2.5" onClick={() => ajouterEtape("etape")} disabled={relecture} title="Créer une étape de jeu" aria-label="Étape de jeu">
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
            <div className="px-5 py-5 border-b border-rule flex items-start gap-2">
              <div className="flex-1">
                <div className="font-display font-extrabold text-xl tracking-[0.22em] uppercase text-snow leading-none">
                  Studio
                </div>
                <div className="font-mono text-[7px] text-fog tracking-[0.18em] mt-1 uppercase">
                  Jeu Numérique
                </div>
              </div>
              <ChevronRepli direction="gauche" titre="Replier le menu" replie={false} onBasculer={basculerMenu} />
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
        {/* 3 colonnes fixes (change studio-composer-3-colonnes) : liste à gauche,
            panneau central jamais repliable, détail à droite. */}
        {mep.repliees.liste ? (
          <RailReplie
            icone="liste"
            titre="Liste des étapes — cliquer pour déplier"
            onDeplier={() => basculerSection("liste")}
            actions={
              relecture
                ? []
                : [
                    { kind: "icone", icone: "etape", titre: "Créer une étape de jeu", onAction: () => ajouterEtape("etape") },
                    { kind: "icone", icone: "lieu", titre: "Créer un lieu avec zone GPS", onAction: () => ajouterEtape("lieu") },
                    { kind: "icone", icone: "tirage", titre: "Créer un tirage au sort parmi des étapes", onAction: () => ajouterEtape("tirage") },
                    { kind: "icone", icone: "fin", titre: "Créer l'étape de fin du jeu", onAction: () => ajouterEtape("fin") },
                  ]
            }
          />
        ) : (
          <div id="section-liste" className="flex min-w-0 shrink-0 flex-col" style={{ width: mep.liste, ...surlignage("liste") }}>
            {liste}
          </div>
        )}
        <Splitter label="Ajuster la largeur de la liste" onDelta={(dx) => setMep((m) => ({ ...m, liste: Math.min(520, Math.max(220, m.liste + dx)) }))} onReset={() => setMep((m) => ({ ...m, liste: LAYOUT_DEFAUT.liste }))} />
        <main id="section-graphe" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2" aria-label="Graphe, carte ou écran" style={surlignage("graphe")}>
          {zoneGraphe}
        </main>
        <Splitter label="Ajuster la largeur du panneau latéral" onDelta={(dx) => setMep((m) => ({ ...m, droite: Math.min(640, Math.max(280, m.droite - dx)) }))} onReset={() => setMep((m) => ({ ...m, droite: LAYOUT_DEFAUT.droite }))} />
        {mep.repliees.detail ? (
          <RailReplie
            icone="detail"
            titre="Détail de l'étape — cliquer pour déplier"
            onDeplier={() => basculerSection("detail")}
            actions={
              etape == null
                ? []
                : FAMILLES.map((f) => ({
                    kind: "icone" as const,
                    icone: f.icone,
                    titre: `${f.titre} — ${f.aide}`,
                    actif: activeFamille === f.id,
                    onAction: () => {
                      if (mep.repliees.detail) basculerSection("detail");
                      setActiveFamille(f.id);
                    },
                  }))
            }
          />
        ) : (
        <div className="flex min-w-0 flex-col gap-3 overflow-auto" style={{ width: mep.droite }}>
            <div id="section-detail" className="flex min-h-0 flex-1 flex-col gap-1" style={surlignage("detail")}>
              <div className="flex justify-end gap-1">
                <ChevronRepli direction="droite" titre="Replier le détail" replie={false} onBasculer={() => basculerSection("detail")} />
              </div>
              {detail}
            </div>
        </div>
        )}
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
                  <div className="carte flex shrink-0 items-center gap-2 p-2">
                    <PastilleValidation nbErreurs={erreurs.length} onVoir={() => setEcran("valider")} />
                    {resetLayout}
                  </div>
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

// Pastille compacte d'état de validation (change studio-composer-ux) : le seul
// signal validation du Composer (desktop + mobile), cliquable vers Valider.
// Le détail vit exclusivement dans l'écran Valider.
function PastilleValidation({ nbErreurs, onVoir }: { nbErreurs: number; onVoir: () => void }) {
  return (
    <button
      className="btn min-h-8 px-2.5"
      onClick={onVoir}
      title={nbErreurs ? `${nbErreurs} problème${nbErreurs > 1 ? "s" : ""} — Voir le détail dans Valider` : "Jeu valide — Voir dans Valider"}
      aria-label={nbErreurs ? `${nbErreurs} problèmes, voir le détail dans Valider` : "Jeu valide, voir dans Valider"}
    >
      {nbErreurs ? (
        <span className="puce puce-erreur"><Icon name="alerte" size={13} /> {nbErreurs} problème{nbErreurs > 1 ? "s" : ""}</span>
      ) : (
        <span className="puce puce-ok"><Icon name="ok" size={13} /> Valide</span>
      )}
    </button>
  );
}

// Résumé d'un déclencheur pour badge d'accordéon (change studio-composer-ux).
function resumeCondition(c: Condition): string {
  switch (c.type) {
    case "GEOFENCE": return `${c.radiusMeters ?? "?"} m`;
    case "NODE_COMPLETED": return c.nodeId ?? "—";
    case "TIMER": return `${c.delaySeconds ?? "?"} s`;
    case "POOL_DRAWN": return c.poolNodeId ?? "—";
    case "ITEM_REQUIRED":
    case "ITEM_USED": return c.itemId ?? "—";
    case "CODE_INPUT": return c.code ?? "—";
    case "CLUE_RESOLVED": return c.clueId ?? "—";
    case "PROXIMITY_MASTER": return c.masterId ?? "—";
    default: return "";
  }
}

// Un déclencheur = un accordéon : hooks interdits dans .map, d'où l'enfant dédié.
function DeclencheurBloc({
  index,
  condition,
  premier,
  game,
  onPatch,
  onSupprimer,
}: {
  index: number;
  condition: Condition;
  premier: boolean;
  game: Game;
  onPatch: (patch: Partial<Condition>) => void;
  onSupprimer: () => void;
}) {
  const [ouvert, basculer] = useAccordeon(`declencheur-${index}`, premier);
  const c = condition;
  return (
    <Accordeon
      id={`declencheur-${index}`}
      titre={CONDITIONS_FR[c.type]?.nom ?? c.type}
      badge={<span className="puce" title={CONDITIONS_FR[c.type]?.aide}>{resumeCondition(c)}</span>}
      ouvert={ouvert}
      onToggle={basculer}
    >
      <div className="carte p-2 shadow-none">
        <span className="flex items-center gap-1.5">
          <Icon name={iconeCondition(c.type)} size={15} />
          <b>{CONDITIONS_FR[c.type]?.nom ?? c.type}</b>
          <span className="flex-1" />
          <button className="btn min-h-8 px-2.5" aria-label="Supprimer ce déclencheur" title="Supprimer" onClick={onSupprimer}><Icon name="fermer" size={14} /></button>
        </span>
        <ChampsDecl game={game} c={c} upd={onPatch} />
      </div>
    </Accordeon>
  );
}

const EFFETS_FR: Record<string, string> = {
  GIVE_ITEM: "Donner objet",
  REMOVE_ITEM: "Retirer objet",
  REVEAL_NODE: "Révéler nœud",
  HIDE_NODE: "Masquer nœud",
  UNLOCK_NODE: "Débloquer nœud",
  MODIFY_VARIABLE: "Modifier variable",
  MODIFY_SCORE: "Modifier score",
  TRIGGER_EVENT: "Déclencher événement",
};

// Résumé d'un effet pour badge d'accordéon.
function resumeEffet(eff: Effect): string {
  switch (eff.type) {
    case "GIVE_ITEM":
    case "REMOVE_ITEM": return eff.itemId ?? "—";
    case "REVEAL_NODE":
    case "HIDE_NODE":
    case "UNLOCK_NODE": return eff.nodeId ?? "—";
    case "MODIFY_VARIABLE": return eff.variableId ?? "—";
    case "MODIFY_SCORE": return String(eff.value ?? "—");
    default: return "";
  }
}

// Un effet = un accordéon (même contrainte de hooks que DeclencheurBloc).
function EffetBloc({
  index,
  effet,
  premier,
  game,
  nodeId,
  onPatch,
  onSupprimer,
}: {
  index: number;
  effet: Effect;
  premier: boolean;
  game: Game;
  nodeId: string;
  onPatch: (patch: Partial<Effect>) => void;
  onSupprimer: () => void;
}) {
  const [ouvert, basculer] = useAccordeon(`effet-${index}`, premier);
  const eff = effet;
  const setCible = (patch: Partial<Effect>) => onPatch(patch);
  return (
    <Accordeon
      id={`effet-${index}`}
      titre={EFFETS_FR[eff.type] ?? eff.type}
      badge={<span className="puce">{resumeEffet(eff)}</span>}
      ouvert={ouvert}
      onToggle={basculer}
    >
      <div className="carte p-2 shadow-none">
        <span className="flex items-center gap-1.5">
          <Icon name="engrenage" size={15} />
          <select className="champ" value={eff.type} onChange={(e) => onPatch({ type: e.target.value })}>
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
          <button className="btn min-h-8 px-2.5" aria-label="Supprimer cet effet" title="Supprimer" onClick={onSupprimer}><Icon name="fermer" size={14} /></button>
        </span>
        {eff.type === "GIVE_ITEM" || eff.type === "REMOVE_ITEM" ? <label>Objet <select className="champ" value={eff.itemId ?? ""} onChange={(e) => setCible({ itemId: e.target.value })}><option value="">—</option>{game.objects?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label> : eff.type === "REVEAL_NODE" || eff.type === "HIDE_NODE" || eff.type === "UNLOCK_NODE" ? <label>Nœud <select className="champ" value={eff.nodeId ?? ""} onChange={(e) => setCible({ nodeId: e.target.value })}><option value="">—</option>{game.nodes.filter((m) => m.id !== nodeId).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}</select></label> : eff.type === "MODIFY_VARIABLE" ? <label>Variable <input className="champ" value={eff.variableId ?? ""} onChange={(e) => setCible({ variableId: e.target.value })} placeholder="id" size={12} /></label> : eff.type === "MODIFY_SCORE" ? <label>Score <input className="champ w-16" type="number" value={Number(eff.value) ?? 0} onChange={(e) => setCible({ value: Number(e.target.value) })} /></label> : null}
      </div>
    </Accordeon>
  );
}

// Hote du panneau de configuration module dans le WYSIWYG (change studio-screen-wysiwyg) :
// rend le propertiesPanel du screenPlugin du type de module, cable sur node.module.data.
// Sans plugin : undefined (PropertiesPanel affiche son placeholder).
// Les defauts globaux mini-jeux sont transmis pour affichage heritage (change studio-screen-editor).
function PanneauModule({ node, globalDefaults, onPickFile, lectureSeule, editGame }: {
  node: GameNode; globalDefaults?: MinigameDefaults; onPickFile?: (file: File) => Promise<string>; lectureSeule: boolean; editGame: (fn: (g: Game) => Game, op?: string) => void;
}) {
  const plugin = getScreenPlugin(node.module.type);
  if (!plugin) return null;
  const Panel = plugin.propertiesPanel;
  return (
    <Panel
      data={node.module.data}
      readOnly={lectureSeule}
      minigameDefaults={globalDefaults}
      onPickFile={onPickFile}
      onChange={(data) =>
        editGame(
          (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === node.id ? { ...n, module: { ...n.module, data } } : n)) }),
          "modifierNoeud"
        )
      }
    />
  );
}

function Inspecteur({ game, node, meta, editGame, edit, nouveauType, setNouveauType, lectureSeule, onAllerConfig, activeFamille, setActiveFamille, onPickFile }: {
  game: Game; node: GameNode; meta: StudioMeta;
  editGame: (fn: (g: Game) => Game, op?: string) => void;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  nouveauType: string; setNouveauType: (s: string) => void;
  lectureSeule: boolean;
  onAllerConfig?: () => void;
  activeFamille: string; setActiveFamille: (id: string) => void;
  onPickFile?: (file: File) => Promise<string>;
}) {
  const [expertModuleOuvert, basculerExpertModule] = useAccordeon("insp-expert-module", false);
  const [expertMetaOuvert, basculerExpertMeta] = useAccordeon("insp-expert-meta", false);
  const [secoursAvanceOuvert, basculerSecoursAvance] = useAccordeon("insp-avance-secours", false);
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
        <label>Mini-jeu <select className="champ" value={node.module.type} onChange={(e) => {
          const suivant = e.target.value;
          if (suivant === node.module.type) return;
          // Changement destructif (change studio-module-first) : data
          // détruites + seule la zone content remplacée, après confirmation.
          // Refus = nœud strictement inchangé. Un seul appel = un seul undo.
          if (!window.confirm("Changer de mini-jeu détruira les données du module et remplacera la zone de contenu. Les modifications seront perdues. Continuer ?")) return;
          const defaut = ecranDefautModule(suivant);
          const contenuDefaut = defaut.zones?.content ?? { layout: "stack", widgets: [{ type: "module" }] } as ZoneContent;
          editGame((g) => ({ ...g, nodes: g.nodes.map((n) => {
            if (n.id !== node.id) return n;
            const precedent = n.screen ?? defaut;
            return {
              ...n,
              module: { type: suivant, data: donneesDefautModule(suivant) },
              screen: { ...precedent, zones: { ...precedent.zones, content: contenuDefaut } },
            };
          })}), "changerModule");
        }}>
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
        {/* Formulaire du module (registre) sous le dropdown : meme panneau que le
            WYSIWYG, sans plugin = rien (JSON expert ci-dessous). */}
        <PanneauModule node={node} globalDefaults={game.global?.minigameDefaults} onPickFile={onPickFile} lectureSeule={lectureSeule} editGame={editGame} />
        <Accordeon id="insp-expert-module" titre="Données expertes (JSON)" badge={<span className="puce">JSON</span>} ouvert={expertModuleOuvert} onToggle={basculerExpertModule}>
          <textarea rows={3} className="w-full champ font-mono text-[8px]" value={JSON.stringify(node.module.data)} onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value) as Record<string, unknown>;
              if (data && typeof data === "object") upd({ module: { ...node.module, data } });
            } catch { /* frappe en cours */ }
          }} />
        </Accordeon>
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
          <DeclencheurBloc
            key={i}
            index={i}
            condition={c}
            premier={i === 0}
            game={game}
            onPatch={(p) => updDecl(i, p)}
            onSupprimer={() => supprDecl(i)}
          />
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
          <Accordeon id="insp-avance-secours" titre="Avancé" badge={<span className="puce">Secours</span>} ouvert={secoursAvanceOuvert} onToggle={basculerSecoursAvance}>
            <button className="btn" onClick={() => {
              try {
                editGame((g) => addSecoursCode(g, node.id), "addSecoursCode");
              } catch (e) {
                alert(String(e));
              }
            }}><Icon name="ajouter" size={15} /> Secours par code</button>
          </Accordeon>
        )}
        <Accordeon id="insp-expert-meta" titre="Options expertes (JSON)" badge={<span className="puce">JSON</span>} ouvert={expertMetaOuvert} onToggle={basculerExpertMeta}>
          <textarea rows={2} className="w-full champ font-mono text-[8px]" defaultValue={JSON.stringify(meta.overrides[node.id] ?? {})} key={node.id} onBlur={(e) => {
            try {
              const patch = JSON.parse(e.target.value) as Record<string, unknown>;
              if (patch && typeof patch === "object") {
                edit((s) => ({ ...s, meta: { ...s.meta, overrides: { ...s.meta.overrides, [node.id]: patch as StudioMeta["overrides"][string] } } }), "definirOverrides");
              }
            } catch { alert("Options invalides (JSON)"); }
          }} />
        </Accordeon>
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
          <EffetBloc
            key={i}
            index={i}
            effet={eff}
            premier={i === 0}
            game={game}
            nodeId={node.id}
            onPatch={(patch) => {
              const newEffects = [...(node.effects ?? [])];
              newEffects[i] = { ...eff, ...patch };
              upd({ effects: newEffects });
            }}
            onSupprimer={() => upd({ effects: (node.effects ?? []).filter((_, j) => j !== i) })}
          />
        ))}
        {(node.effects ?? []).length > 0 && (
          <button className="btn min-h-8 px-2.5" onClick={() => upd({ effects: [...(node.effects ?? []), { type: "GIVE_ITEM", itemId: "" }] })} title="Ajouter un autre effet"><Icon name="ajouter" size={14} /> Ajouter un effet</button>
        )}
      </Famille>
      <Famille id={FAMILLES[7].id} icone={FAMILLES[7].icone} titre={FAMILLES[7].titre} aide={FAMILLES[7].aide} active={activeFamille === FAMILLES[7].id}>
        {/* Accès inventaire sur cet écran (change studio-inventory-access) :
            coché = champ absent (hérite de la règle triple), décoché =
            inventoryAccess:false. Même op qu'ailleurs (un pas d'undo). */}
        <label className="flex items-center gap-1"><input type="checkbox" checked={node.inventoryAccess !== false} onChange={(e) => upd({ inventoryAccess: e.target.checked ? undefined : false })} /> Accès inventaire sur cet écran</label>
        {((game.objects ?? []).length === 0 || !(game.global?.presentation ?? []).includes("TOOLBOX")) && (
          <p className="puce whitespace-normal" title="Rappel non bloquant : seule la validation bloque">
            <Icon name="alerte" size={13} /> Sans effet : jeu sans inventaire (aucun objet ou présentation sans TOOLBOX).
          </p>
        )}
        {(node.inventoryRef ?? []).length === 0 ? (
          <button className="btn" onClick={() => upd({ inventoryRef: [game.objects?.[0]?.id ?? ""] })}><Icon name="ajouter" size={15} /> Ajouter un objet référencé</button>
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
        {(node.inventoryRef ?? []).length > 0 ? (
          <button className="btn min-h-8 px-2.5" onClick={() => upd({ inventoryRef: [...(node.inventoryRef ?? []), game.objects?.[0]?.id ?? ""] })} title="Ajouter une autre référence"><Icon name="ajouter" size={14} /> Ajouter</button>
        ) : null}
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
  const [avanceOuvert, basculerAvance] = useAccordeon("declencheur-avance-radio", false);
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
          <Accordeon id="declencheur-avance-radio" titre="Avancé" badge={<span className="puce">Radio</span>} ouvert={avanceOuvert} onToggle={basculerAvance}>
            <button className="btn min-h-9" title="Changer d'identifiant (révoque l'ancien)" onClick={() => upd({ masterId: `m-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}` })}>Rotation</button>
          </Accordeon>
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

function BrandingPanel({ game, edit, lectureSeule, onPickFile }: {
  game: Game;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }) => void;
  lectureSeule: boolean;
  onPickFile?: (file: File) => Promise<string>;
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
        <select
          className="champ"
          value={estPoliceConnue(b.fontFamily) ? b.fontFamily : b.fontFamily ? "__custom__" : ""}
          disabled={lectureSeule}
          aria-label="Police du jeu"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, fontFamily: estPoliceConnue(b.fontFamily) ? "" : b.fontFamily } } }), "setBranding");
            } else {
              edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, fontFamily: v || "system-ui" } } }), "setBranding");
            }
          }}
        >
          <option value="">Défaut (système)</option>
          {FONT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="__custom__">Personnalisée…</option>
        </select>
        {b.fontFamily && !estPoliceConnue(b.fontFamily) ? (
          <input
            className="champ font-mono"
            value={b.fontFamily}
            disabled={lectureSeule}
            placeholder="Ma Police"
            aria-label="Police personnalisée"
            onChange={(e) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, fontFamily: e.target.value || "system-ui" } } }), "setBranding")}
          />
        ) : null}
      </label>
      <div className="mt-1">
        <ImagePicker
          label="Logo"
          value={b.logo ?? ""}
          disabled={lectureSeule}
          onPickFile={onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); })}
          onChange={(logo) => edit((s) => ({ ...s, game: { ...s.game, branding: { ...b, logo: logo || undefined } } }), "setBranding")}
        />
      </div>
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

function ScreenGlobalPanel({ game, edit, lectureSeule, onPickFile }: {
  game: Game;
  edit: (fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta }, op?: string) => void;
  lectureSeule: boolean;
  onPickFile?: (file: File) => Promise<string>;
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
          screenCourant={gs}
          onSelectTemplate={(layoutId) => {
            const t = getScreenTemplate(layoutId);
            if (!t) return;
            appliquer({ screen: structuredClone(t.screen) });
          }}
        />
        <ScreenProperties
          background={gs?.background}
          onPickFile={onPickFile}
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

function ObjetsPanel({ game, editGame, lectureSeule, onChoisir, onPickFile, catalogUrl, onProvenance }: {
  game: Game;
  editGame: (fn: (g: Game) => Game, op?: string) => void;
  lectureSeule: boolean;
  onChoisir: (id: string) => void;
  onPickFile?: (file: File) => Promise<string>;
  // Import catalogue (change studio-inventory-catalog) : URL du service +
  // enregistrement de la provenance en sidecar meta (jamais dans le JSON).
  catalogUrl?: string;
  onProvenance?: (id: string, prov: { providerId: string; license: string; sourceUrl: string }) => void;
}) {
  const objs = game.objects ?? [];
  const [nid, setNid] = useState("");
  const [nnom, setNnom] = useState("");
  const [nconso, setNconso] = useState(false);
  const [nstack, setNstack] = useState(true);
  // Import catalogue : jeux listés -> objets du jeu choisi -> proposition
  // d'id éditable -> validation (copie + assets + provenance). États locaux,
  // jamais persistés ; toute écriture passe par editGame (undo natif).
  const [importJeux, setImportJeux] = useState<CatalogEntry[] | null>(null);
  const [importErreur, setImportErreur] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importCode, setImportCode] = useState<string | null>(null);
  const [importSrc, setImportSrc] = useState<{ gameId: string; objets: GameObject[]; tailles: Record<string, number> } | null>(null);
  const [importObjetId, setImportObjetId] = useState<string | null>(null);
  const [importNid, setImportNid] = useState("");
  const [importNote, setImportNote] = useState<string | null>(null);
  const proposerIdImport = (base: string): string => {
    if (!objs.some((o) => o.id === base)) return base;
    let cand = `${base}-importe`;
    let i = 2;
    while (objs.some((o) => o.id === cand)) {
      cand = `${base}-importe-${i}`;
      i++;
    }
    return cand;
  };
  const chargerJeuxImport = async () => {
    if (!catalogUrl || importBusy) return;
    setImportBusy(true);
    setImportErreur(null);
    setImportNote(null);
    try {
      setImportJeux(await listGames(catalogUrl));
    } catch (e) {
      setImportJeux(null);
      setImportErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  };
  const choisirJeuImport = async (code: string) => {
    if (!catalogUrl || importBusy) return;
    setImportBusy(true);
    setImportErreur(null);
    setImportNote(null);
    setImportObjetId(null);
    try {
      const pack = await fetchPack(catalogUrl, code);
      const parsed = JSON.parse(pack.gameJson) as { gameId?: string; objects?: GameObject[] };
      if (!Array.isArray(parsed.objects)) throw new Error("ce jeu ne contient aucun objet");
      const tailles: Record<string, number> = {};
      for (const f of pack.manifest?.files ?? []) tailles[f.path] = f.size;
      setImportCode(code);
      setImportSrc({ gameId: typeof parsed.gameId === "string" ? parsed.gameId : code, objets: parsed.objects, tailles });
    } catch (e) {
      setImportCode(null);
      setImportSrc(null);
      setImportErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  };
  const validerImport = async () => {
    if (!catalogUrl || !importCode || !importSrc || !importObjetId || importBusy) return;
    const src = importSrc.objets.find((o) => o.id === importObjetId);
    if (!src) return;
    const id = importNid.trim();
    if (!id) { setImportErreur("Identifiant requis."); return; }
    if (objs.some((o) => o.id === id)) { setImportErreur(`Objet « ${id} » déjà existant — choisis un autre identifiant.`); return; }
    if (!onPickFile) { setImportErreur("Sélection de fichier indisponible ici."); return; }
    setImportBusy(true);
    setImportErreur(null);
    setImportNote(null);
    try {
      // Assets re-téléchargés depuis le pack source puis ré-enregistrés comme
      // assets courants (même déduplication SHA que prendreImage) : le pack
      // reste autonome, aucune référence externe.
      const nomFichier = (p: string) => p.split("/").pop() || "image.png";
      let icon: string | undefined;
      let image: string | undefined;
      if (src.icon) {
        const bytes = await fetchAsset(catalogUrl, importCode, src.icon);
        icon = await onPickFile(new File([bytes as BlobPart], nomFichier(src.icon), { type: "image/png" }));
      }
      if (src.image) {
        const bytes = await fetchAsset(catalogUrl, importCode, src.image);
        image = await onPickFile(new File([bytes as BlobPart], nomFichier(src.image), { type: "image/png" }));
      }
      const { icon: _i, image: _m, id: _id, ...reste } = src;
      editGame((g) => addObject(g, { ...JSON.parse(JSON.stringify(reste)), id, icon, image }), "addObject");
      onProvenance?.(id, { providerId: importSrc.gameId, license: "", sourceUrl: `catalogue:${importCode}` });
      setImportNote(`Objet « ${id} » importé depuis « ${importSrc.gameId} ».`);
      setImportObjetId(null);
      setImportNid("");
    } catch (e) {
      setImportErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  };
  // Patch partiel d'un objet en une opération nommée (un pas d'undo).
  const patchObjet = (id: string, patch: Partial<GameObject>) =>
    editGame((g) => setObjects(g, (g.objects ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x))), "setObjects");
  const deplacer = (id: string, dir: -1 | 1) =>
    editGame((g) => {
      const arr = [...(g.objects ?? [])];
      const i = arr.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return g;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return setObjects(g, arr);
    }, "setObjects");
  return (
    <div className="carte p-3">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="package" size={15} /> Objets / inventaire ({objs.length})
      </h3>
      {objs.length ? (
        <ul className="flex flex-col gap-2 text-[8px]">
          {objs.map((o, index) => {
            const refs = refsObjet(game, o.id);
            return (
              <li key={o.id} className="rounded border border-rule p-2">
                <div className="flex gap-1.5 items-center">
                  {o.icon ? (
                    <img src={o.icon} alt="" className="h-9 w-9 shrink-0 rounded object-contain" />
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-rule"><Icon name="package" size={18} /></span>
                  )}
                  <span className="flex-1 min-w-0"><b>{o.id}</b> — {o.name}{o.consumable ? " · consommable" : ""}{o.stackable === false ? " · non empilable" : ""}{refs.length ? ` · utilisé par : ${refs.join(", ")}` : " · non référencé"}</span>
                  {!lectureSeule && (
                    <>
                      <button className="btn min-h-8 px-2 text-[8px]" disabled={index === 0} title="Monter (ordre d'affichage joueur)" aria-label={`Monter l'objet ${o.id}`} onClick={() => deplacer(o.id, -1)}>↑</button>
                      <button className="btn min-h-8 px-2 text-[8px]" disabled={index === objs.length - 1} title="Descendre (ordre d'affichage joueur)" aria-label={`Descendre l'objet ${o.id}`} onClick={() => deplacer(o.id, 1)}>↓</button>
                      <button className="btn min-h-8 px-2 text-[8px]" title="Dupliquer (nouvel identifiant proposé)" aria-label={`Dupliquer l'objet ${o.id}`} onClick={() => editGame((g) => duplicateObject(g, o.id), "addObject")}>⧉</button>
                    </>
                  )}
                  {!lectureSeule && refs.length > 0 && (
                    <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => onChoisir(refs[0])} title={`Aller à ${refs[0]}`}>Voir</button>
                  )}
                  {!lectureSeule && (
                    <button className="btn min-h-8 px-2.5 text-[8px]" aria-label={`Supprimer l'objet ${o.id}`} title="Supprimer" onClick={() => {
                      if (refs.length && !window.confirm(`Supprimer « ${o.id} » ? Utilisé par : ${refs.join(", ")}`)) return;
                      editGame((g) => setObjects(g, (g.objects ?? []).filter((x) => x.id !== o.id)), "setObjects");
                    }}><Icon name="fermer" size={14} /></button>
                  )}
                </div>
                {!lectureSeule && (
                  <div className="mt-1 flex flex-col gap-1">
                    <label className="flex items-center gap-1">Nom <input className="champ min-h-8 flex-1" value={o.name} aria-label={`Nom de l'objet ${o.id}`} onChange={(e) => patchObjet(o.id, { name: e.target.value })} /></label>
                    <label className="flex items-center gap-1">Description <input className="champ min-h-8 flex-1" value={o.description ?? ""} placeholder="À quoi sert cet objet ?" aria-label={`Description de l'objet ${o.id}`} onChange={(e) => patchObjet(o.id, { description: e.target.value || undefined })} /></label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={!!o.consumable} onChange={(e) => patchObjet(o.id, { consumable: e.target.checked })} /> consommable</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={o.stackable !== false} onChange={(e) => patchObjet(o.id, { stackable: e.target.checked })} /> empilable</label>
                    </div>
                    <ImagePicker label="Icône (pictogramme)" value={o.icon ?? ""} disabled={lectureSeule} onPickFile={onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); })} onChange={(icon) => patchObjet(o.id, { icon: icon || undefined })} />
                    <ImagePicker label="Image (illustration)" value={o.image ?? ""} disabled={lectureSeule} onPickFile={onPickFile ?? (async () => { throw new Error("Sélection de fichier indisponible ici."); })} onChange={(image) => patchObjet(o.id, { image: image || undefined })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[8px] text-fog">
Aucun objet défini. Crée ton premier objet ci-dessous : il apparaîtra dans la boîte à outils du joueur dès qu'un nœud le donne.</p>
      )}
      {!lectureSeule && (
        <div className="flex flex-wrap gap-1">
          <input className="champ min-h-10" value={nid} size={10} placeholder="id (ex. cle)" aria-label="Identifiant du nouvel objet" onChange={(e) => setNid(e.target.value)} />
          <input className="champ min-h-10" value={nnom} size={14} placeholder="Nom affiché" aria-label="Nom du nouvel objet" onChange={(e) => setNnom(e.target.value)} />
          <label className="flex items-center gap-1 text-[8px]"><input type="checkbox" checked={nconso} onChange={(e) => setNconso(e.target.checked)} /> consommable</label>
          <label className="flex items-center gap-1 text-[8px]"><input type="checkbox" checked={nstack} onChange={(e) => setNstack(e.target.checked)} /> empilable</label>
          <button className="btn" onClick={() => {
            const id = nid.trim();
            if (!id) { alert("Identifiant d'objet requis."); return; }
            if (objs.some((o) => o.id === id)) { alert(`Objet « ${id} » déjà existant.`); return; }
            editGame((g) => addObject(g, { id, name: nnom.trim() || id, consumable: nconso, stackable: nstack }), "addObject");
            setNid(""); setNnom(""); setNconso(false); setNstack(true);
          }}><Icon name="ajouter" size={15} /> Objet</button>
        </div>
      )}
      {!lectureSeule && (
        <div className="mt-3 border-t border-rule pt-2">
          <h4 className="flex items-center gap-1.5 font-bold text-[11px] mb-1">
            <Icon name="exemple" size={13} /> Importer depuis le catalogue
          </h4>
          {!catalogUrl ? (
            <p className="text-[8px] text-fog">Renseigne l'URL du catalogue dans l'écran Importer pour activer l'import.</p>
          ) : importJeux == null ? (
            <div className="flex items-center gap-2">
              <button className="btn min-h-8 px-2.5 text-[8px]" disabled={importBusy} onClick={() => void chargerJeuxImport()} title="Lister les jeux publiés du catalogue">
                {importBusy ? "Chargement…" : "Lister les jeux publiés"}
              </button>
              {importErreur && <span className="text-[8px] text-fail" role="alert">Catalogue injoignable : {importErreur} — le reste de l'écran reste utilisable.</span>}
            </div>
          ) : importJeux.length === 0 ? (
            <p className="text-[8px] text-fog">Catalogue vide : aucun jeu publié pour l'instant.</p>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[8px]">Jeu publié
                <select className="champ min-h-8 flex-1" value={importCode ?? ""} disabled={importBusy}
                  onChange={(e) => { const c = e.target.value; setImportCode(c || null); setImportSrc(null); setImportObjetId(null); if (c) void choisirJeuImport(c); }}
                  aria-label="Jeu publié source">
                  <option value="">—</option>
                  {importJeux.map((j) => <option key={j.code} value={j.code}>{j.nom} (v{j.version}, {j.code})</option>)}
                </select>
              </label>
              {importSrc && (
                <label className="flex items-center gap-1 text-[8px]">Objet
                  <select className="champ min-h-8 flex-1" value={importObjetId ?? ""} disabled={importBusy}
                    onChange={(e) => { const oid = e.target.value || null; setImportObjetId(oid); setImportNid(oid ? proposerIdImport(oid) : ""); }}
                    aria-label="Objet à importer">
                    <option value="">—</option>
                    {importSrc.objets.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.name}</option>)}
                  </select>
                </label>
              )}
              {importSrc && importObjetId && (() => {
                const src = importSrc.objets.find((o) => o.id === importObjetId);
                if (!src) return null;
                const taille = (p?: string) => (p && importSrc.tailles[p] != null ? ` (${(importSrc.tailles[p] / 1024).toFixed(1)} Ko)` : "");
                const collision = objs.some((o) => o.id === src.id);
                return (
                  <div className="rounded border border-line p-2 flex flex-col gap-1 text-[8px]">
                    <span><b>{src.id}</b> — {src.name}{src.description ? ` · ${src.description}` : ""}</span>
                    <span className="text-fog">Icône : {src.icon ?? "—"}{taille(src.icon)} · Image : {src.image ?? "—"}{taille(src.image)}</span>
                    <span className="text-fog">Provenance enregistrée : jeu « {importSrc.gameId} » (licence source inconnue — relecture garde la trace).</span>
                    {collision && <span className="text-caution">« {src.id} » existe déjà — nouvel identifiant proposé ci-dessous.</span>}
                    <label className="flex items-center gap-1">Identifiant <input className="champ min-h-8 flex-1" value={importNid} aria-label="Identifiant de l'objet importé" onChange={(e) => setImportNid(e.target.value)} /></label>
                    <div>
                      <button className="btn min-h-8 px-2.5 text-[8px]" disabled={importBusy || !importNid.trim()} onClick={() => void validerImport()} title="Copier l'objet dans le jeu courant">
                        {importBusy ? "Import…" : "Valider l'import"}
                      </button>
                    </div>
                  </div>
                );
              })()}
              {importNote && <p className="text-[8px] text-pass" role="status">{importNote}</p>}
              {importErreur && <p className="text-[8px] text-fail" role="alert">{importErreur}</p>}
            </div>
          )}
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
        {(() => {
          const brouillons = lignes.filter((l) => l.st === "draft").map((l) => l.n.id);
          const hold = game.global?.holdMode ?? "none";
          if (brouillons.length === 0) return "Aucun brouillon — relecture terminée.";
          const kiosque = hold !== "none" ? ` (kiosque HOLD ${hold} : jeu relu exigé)` : " (hors mode animateur)";
          return `Export bloqué — ${brouillons.join(", ")} en brouillon${kiosque}.`;
        })()}
        {" "}Export : {exportPret ? (<span className="puce puce-ok">prêt</span>) : (<span className="puce puce-erreur">bloqué</span>)}
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
                    <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => { if (window.confirm(`Annuler la relecture de « ${n.id} » ? Le nœud repassera en brouillon.`)) passer(n.id, "draft"); }} title="Annuler la relecture (action distincte)">Annuler</button>
                  </>
                )}
                {!lectureSeule && st === "published" && (
                  <button className="btn min-h-8 px-2.5 text-[8px]" onClick={() => { if (window.confirm(`Annuler la relecture de « ${n.id} » ? Le nœud repassera en brouillon.`)) passer(n.id, "draft"); }} title="Annuler la relecture (action distincte)">Annuler</button>
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

function BlocValidation({ couches, verdicts, game, onVoir }: {
  couches: { layer: number; errors: string[] }[];
  verdicts: { c1: boolean; c2: boolean | null };
  game: Game;
  onVoir: (id: string) => void;
}) {
  const c1 = couches.find((l) => l.layer === 1);
  const c2 = couches.find((l) => l.layer === 2);
  // Pile unique C1 + C2 : chaque carte porte sa couche, sa catégorie, son texte
  // clair, la règle brute et — quand un nœud est identifié — un bouton Voir.
  const pile: { couche: number; cat: string; brut: string }[] = [
    ...(c1?.errors ?? []).map((e) => ({ couche: 1, cat: "Schéma", brut: e })),
    ...(c2?.errors ?? []).map((e) => ({ couche: 2, cat: categorieC2(e), brut: e })),
  ];
  const groupes = new Map<string, number>();
  for (const p of pile) groupes.set(`${p.couche} · ${p.cat}`, (groupes.get(`${p.couche} · ${p.cat}`) ?? 0) + 1);
  const puce = (ok: boolean | null) =>
    ok == null ? (
      <>
        <div className="w-2 h-2 rounded-full bg-fog" />
        <span className="font-mono text-[8px] text-fog uppercase">Non exécutée</span>
      </>
    ) : ok ? (
      <>
        <div className="w-2 h-2 rounded-full bg-pass" />
        <span className="font-mono text-[8px] text-pass uppercase">Pass</span>
      </>
    ) : (
      <>
        <div className="w-2 h-2 rounded-full bg-fail" />
        <span className="font-mono text-[8px] text-fail uppercase">Fail</span>
      </>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-5">
          <div className={`bg-panel border rounded-md p-4 ${verdicts.c1 ? "border-rule" : "border-fail/20"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C1 — Schéma AJV</span>
              <div className="flex items-center gap-1.5">{puce(verdicts.c1)}</div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">Draft-07 conforme. Tous les champs requis présents.</p>
            <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">{c1?.errors.length ?? 0} erreur · 0 avertissement</div>
          </div>
          <div className={`bg-panel border rounded-md p-4 ${verdicts.c2 === false ? "border-fail/20" : "border-rule"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[8px] font-mono uppercase tracking-widest text-fog">C2 — Applicative</span>
              <div className="flex items-center gap-1.5">{puce(verdicts.c2)}</div>
            </div>
            <p className="text-[11px] text-fog leading-relaxed">Cycles, atteignabilité, pools, HOLD, références.</p>
            <div className="mt-3 font-mono text-[8px] text-fog bg-canvas rounded px-2 py-1.5">{c2?.errors.length ?? 0} erreur(s)</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {[...(groupes.entries())].map(([cat, n]) => (
            <div key={cat} className="text-[8px] font-mono uppercase tracking-widest text-fog mb-2">{cat} ({n})</div>
          ))}
          {pile.map((p, i) => {
            const cible = game.nodes.find((n) => p.brut.includes(n.id));
            return (
              <div key={i} className="flex items-start gap-3 bg-panel border border-rule rounded px-4 py-3 mb-2">
                <div className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-fail" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[8px] text-fog">C{p.couche} — {p.cat}</span>
                    <span className="font-mono text-[8px] uppercase text-fail">erreur</span>
                    <span className="font-mono text-[8px] text-neon">→ {cible?.id ?? "?"}</span>
                  </div>
                  <span className="text-[11px] text-snow block">{erreurFR(p.brut)}</span>
                  <span className="font-mono text-[8px] text-fog block">Règle : {p.brut}</span>
                  {cible && (
                    <button className="btn min-h-8 px-2.5 text-[8px] mt-1" onClick={() => onVoir(cible.id)} title={`Aller à ${cible.id}`}>
                      Voir {cible.id}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {pile.length === 0 && (
            <p className="text-[11px] text-fog">Aucune erreur : schéma conforme et graphe structurellement valide (sous hypothèse d'environnement favorable).</p>
          )}
        </div>
        <p className="text-[8px] text-fog">Export possible = C1 OK ∧ C2 OK ∧ aucun brouillon (hors animateur).</p>
        {(!verdicts.c1 || verdicts.c2 === false) && (
          <div className="flex items-center gap-3 p-3 bg-fail/5 border border-fail/15 rounded mt-2">
            <span className="font-mono text-[9px] text-fail">Export bloqué — corriger les erreurs avant de continuer.</span>
          </div>
        )}
    </>
  );
}

function ReviewOverlay({ game, meta }: { game: Game; meta: StudioMeta }) {  const diffs = game.nodes.filter((n) => n.module.type === "DIFFERENCE_GAME");
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
  // Triche repliée (change studio-control-priority) : fermée par défaut.
  const [tricheOuverte, basculerTriche] = useAccordeon("apercu-triche", false);
  const nbForced = Object.values(props.forced).filter(Boolean).length;
  return (
    <div className="carte p-3 flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 font-display font-extrabold text-2xl tracking-widest uppercase text-snow">
        <Icon name="essai" size={15} /> Essai du parcours
      </h3>
      <p className="text-[9px] font-mono text-fog">La prévisualisation n'écrit jamais dans le JSON source : tout ici est simulation.</p>
      <Accordeon
        id="apercu-triche"
        titre="Triche"
        badge={
          props.holdSim === "locked" ? (
            <span className="puce puce-erreur">HOLD verrouillé</span>
          ) : nbForced > 0 ? (
            <span className="puce">{nbForced} forcé{nbForced > 1 ? "s" : ""}</span>
          ) : undefined
        }
        ouvert={tricheOuverte}
        onToggle={basculerTriche}
      >
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
      </Accordeon>
      <div className="font-mono text-[9px] text-fog">File d'attente : {props.file.length ? props.file.join(", ") : "—"} | Ouverte : {props.activeId ?? "—"}</div>
      <div className="flex gap-1">
        <button className="btn" onClick={props.nouvelleSession}><Icon name="ajouter" size={15} /> Nouvelle partie</button>
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
