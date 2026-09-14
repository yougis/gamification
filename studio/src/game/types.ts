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
  | "WINDOW";

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
  [k: string]: unknown;
}

export interface Activation {
  requires: Condition[];
  operator?: Operator;
  latch?: boolean;
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
}

export type HoldMode = "none" | "guidedAccess" | "screenPinning" | "lockTask";
export type HoldExitMethod = "adminPin" | "adminGesture" | "adminQR" | "animateurCode";

export interface HoldExit {
  method: HoldExitMethod;
  pin?: string;
  adminPanel?: { enabled: boolean };
}

export interface Game {
  gameId: string;
  schemaVersion: string;
  minEngineVersion: string;
  branding?: Record<string, unknown>;
  global?: Record<string, unknown> & { holdMode?: HoldMode; holdExit?: HoldExit };
  nodes: GameNode[];
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
