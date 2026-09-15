// Types auteur calqués sur game-schema.json (socle 100). Le schéma reste la source opposable.

export type Operator = "AND" | "OR";
export type Predicate = "enter" | "exit" | "dwell" | "through";
export type ConditionType =
  | "GEOFENCE"
  | "NODE_COMPLETED"
  | "TIMER"
  | "POOL_DRAWN"
  | "PROXIMITY_MASTER"
  | "CONDITIONAL"
  | "WINDOW"
  | "ITEM_REQUIRED"
  | "ITEM_USED"
  | "CODE_INPUT"
  | "CLUE_RESOLVED";

export interface Condition {
  type: ConditionType;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  predicate?: Predicate;
  dwellMs?: number;
  hysteresisMeters?: number;
  maxAccuracyM?: number;
  nodeId?: string;
  allowCycle?: boolean;
  anchor?: "GAME_START" | "NODE_COMPLETION";
  anchorNodeId?: string;
  delaySeconds?: number;
  poolNodeId?: string;
  masterId?: string;
  transport?: "ble" | "wifi";
  minRssiDbm?: number;
  itemId?: string;
  consumed?: boolean;
  code?: string;
  clueId?: string;
  [k: string]: unknown;
}

export interface Activation {
  requires: Condition[];
  operator?: Operator;
  latch?: boolean;
}

export type DiscoveryMode = "VISIBLE_NOW" | "MAP" | "ON_COMPLETED" | "ON_CLUE" | "ON_ITEM" | "ON_PUZZLE" | "ON_PROXIMITY" | "ON_TIME";

export interface Discovery {
  mode: DiscoveryMode;
  sourceNode?: string;
  clueId?: string;
  itemId?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

export interface Effect {
  type: string;
  itemId?: string;
  nodeId?: string;
  variableId?: string;
  value?: unknown;
}

export interface GameNode {
  id: string;
  module: { type: string; data: Record<string, unknown> };
  activation: Activation;
  onReentry?: "ignore" | "replay";
  maxReentries?: number;
  scoreOnReplay?: boolean;
  isEnding?: boolean;
  randomPool?: { candidates: string[]; drawCount: number; drawTiming: "ON_POOL_ACTIVATION" | "ON_GAME_START" };
  discovery?: Discovery;
  effects?: Effect[];
  inventoryRef?: string[];
}

export type HoldMode = "none" | "guidedAccess" | "screenPinning" | "lockTask";
export type HoldExitMethod = "adminPin" | "adminGesture" | "adminQR" | "animateurCode";

export interface HoldExit {
  method: HoldExitMethod;
  pin?: string;
  adminPanel?: { enabled: boolean };
}

export interface Branding {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logo?: string;
}

export interface ExperienceStyleIdentity {
  name: string;
  publisher: string;
  logo?: string;
  theme: string;
}

export interface ExperienceStyleVisual {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius?: number;
  cardStyle?: string;
}

export interface ExperienceStyle {
  preset?: "BASIC" | "GUIDED" | "TREASURE_HUNT" | "ESCAPE_GAME" | "OPEN_EXPLORATION";
  identity?: ExperienceStyleIdentity;
  visual?: ExperienceStyleVisual;
  components?: Record<string, unknown>;
  media?: Record<string, unknown>;
  motion?: Record<string, unknown>;
  map?: Record<string, unknown>;
  voice?: Record<string, unknown>;
}

export interface Game {
  gameId: string;
  schemaVersion: string;
  minEngineVersion: string;
  branding?: Branding;
  global?: Record<string, unknown> & {
    holdMode?: HoldMode;
    holdExit?: HoldExit;
    navigationModel?: "BASIC" | "GUIDED" | "TREASURE_HUNT" | "ESCAPE_GAME" | "OPEN_EXPLORATION";
    presentation?: string[];
    experienceStyle?: ExperienceStyle;
    gameMode?: "NORMAL" | "ANIMATEUR" | "SOIREE" | "HARDCORE";
    difficulty?: "ENFANT" | "FAMILLE" | "EXPERT";
  };
  nodes: GameNode[];
  objects?: { id: string; name: string; icon?: string; description?: string; consumable?: boolean; stackable?: boolean }[];
}

// Métadonnées Studio (sidecar, jamais dans le JSON joueur).
export type ReviewStatus = "draft" | "reviewed" | "published";

export interface StudioMeta {
  provenance: Record<string, { providerId: string; license: string; sourceUrl: string }>;
  status: Record<string, { state: ReviewStatus; reviewedBy?: string }>;
  overrides: Record<string, Record<string, { difficulty?: string; mode?: string; patch: Record<string, unknown> }>>;
  i18n: { key: string; value: string; locked: boolean }[];
  milieu: Record<string, "exterieur" | "foret" | "batiment-cave">;
}

export const emptyMeta = (): StudioMeta => ({ provenance: {}, status: {}, overrides: {}, i18n: [], milieu: {} });
