// Compatibilité jeu × canal player (change player-pwa-shell, design D3).
// Lecture du graphe, aucun nouveau champ : conditions (GEOFENCE fond,
// PROXIMITY_MASTER → BLE), besoins du registre (needsGPS/needsCompass/
// needsCamera/needsMap/needsLock), holdMode et matrice versionnée.
// Convention documentée : une GEOFENCE exige le GPS de fond quand elle
// demande un suivi continu (predicate `through`, ou `dwell` avec dwellMs > 0) ;
// `enter`/`exit` (et dwell immédiat) sont observables au premier plan.
import capabilities from "./channel-capabilities.json";
import { MODULE_REGISTRY_BASE as MODULE_REGISTRY } from "./module-registry";
import type { Condition, Game } from "./types";

export type ChannelId = "NATIVE" | "PWA";
export type CompatVerdict = "compatible" | "degrade" | "refuse";

export interface ChannelCaps {
  gpsForeground: boolean;
  gpsBackground: boolean;
  compass: boolean;
  cameraAr: boolean;
  ble: boolean;
  offlineMaps: boolean;
  osLock: boolean;
  storageGuaranteed: boolean;
}

export interface ChannelCompat {
  canal: ChannelId;
  verdict: CompatVerdict;
  motifs: string[];
  replis: string[];
}

export interface CompatSidecar {
  matrixVersion: number;
  verdicts: Record<ChannelId, ChannelCompat>;
}

const MATRIX = capabilities as { version: number; channels: Record<ChannelId, ChannelCaps> };

export function matrixVersion(): number {
  return MATRIX.version;
}

export function channelCaps(canal: ChannelId): ChannelCaps {
  return MATRIX.channels[canal];
}

export function geofenceExigeFond(c: Condition): boolean {
  if (c.type !== "GEOFENCE") return false;
  if (c.predicate === "through") return true;
  if (c.predicate === "dwell" && (c.dwellMs ?? 0) > 0) return true;
  return false;
}

export function evaluateCompatibility(game: Game, canal: ChannelId): ChannelCompat {
  const cap = channelCaps(canal);
  const motifs: string[] = [];
  const replis: string[] = [];
  let verdict: CompatVerdict = "compatible";
  const degrader = (repli: string) => {
    replis.push(repli);
    if (verdict === "compatible") verdict = "degrade";
  };
  const refuser = (motif: string) => {
    motifs.push(motif);
    verdict = "refuse";
  };

  for (const n of game.nodes) {
    for (const c of n.activation.requires) {
      if (c.type === "GEOFENCE") {
        if (!cap.gpsForeground) {
          refuser(`${n.id} : GEOFENCE exige le GPS premier plan`);
        } else if (geofenceExigeFond(c) && !cap.gpsBackground) {
          refuser(`${n.id} : suivi GPS continu (écran verrouillé) indisponible sur ce canal`);
        }
      }
      if (c.type === "PROXIMITY_MASTER" && !cap.ble) {
        refuser(`${n.id} : proximité BLE indisponible sur ce canal`);
      }
    }
    const entry = MODULE_REGISTRY[n.module.type];
    if (entry?.needsGPS && !cap.gpsForeground) {
      refuser(`${n.id} : module ${n.module.type} exige le GPS`);
    }
    if (entry?.needsCompass && !cap.compass) {
      refuser(`${n.id} : module ${n.module.type} exige la boussole`);
    }
    if (entry?.needsCamera && !cap.cameraAr) {
      degrader(`${n.id} : ${n.module.type} rendu en fallback 2D sur ce canal`);
    }
    if (entry?.needsMap && !cap.offlineMaps) {
      degrader(`${n.id} : carte sur fond uni sur ce canal`);
    }
    if (entry?.needsLock && (game.global?.holdMode ?? "none") === "none") {
      refuser(`${n.id} : module verrouillé sans holdMode (rejeté en couche 2)`);
    }
  }

  const holdMode = game.global?.holdMode ?? "none";
  if (holdMode !== "none" && !cap.osLock) {
    degrader(`Hold ${holdMode} : procédure Guided Access sur ce canal`);
  }

  return { canal, verdict, motifs, replis };
}

// Porte d'export : un canal refusé bloque, un canal dégradé avertit.
export function canExportToChannel(game: Game, canal: ChannelId): { ok: boolean; motifs: string[]; replis: string[] } {
  const v = evaluateCompatibility(game, canal);
  return { ok: v.verdict !== "refuse", motifs: v.motifs, replis: v.replis };
}

// Sidecar embarqué dans le pack (lu par le player au lancement).
export function buildCompatSidecar(game: Game): CompatSidecar {
  return {
    matrixVersion: matrixVersion(),
    verdicts: {
      NATIVE: evaluateCompatibility(game, "NATIVE"),
      PWA: evaluateCompatibility(game, "PWA"),
    },
  };
}
