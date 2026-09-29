// Smoke test de compatibilité jeu × canal natif unique
// (change simulateur-compose-sans-pwa) : matrice versionnée, verdicts
// GPS de fond / AR / quiz, porte d'export, non-régression game-5poi.
import { channelCaps, matrixVersion, evaluateCompatibility, canExportToChannel, buildCompatSidecar } from "./src/game/compat";
import game5poi from "./src/game/game-5poi.json";
import type { Game, GameNode } from "./src/game/types";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`compat.smoke: ${msg}`);
  console.log(`ok: ${msg}`);
}

const noeud = (id: string, moduleType: string, requires: GameNode["activation"]["requires"] = []): GameNode => ({
  id,
  module: { type: moduleType, data: {} },
  activation: { requires },
});

const jeu = (nodes: GameNode[], global?: Game["global"]): Game => ({
  gameId: "test-compat",
  schemaVersion: "1.0.0",
  minEngineVersion: "1.0.0",
  nodes,
  global,
});

// 1. Matrice : canal natif unique, toutes capacités, versionnée.
assert(matrixVersion() >= 2, "matrice versionnée (canal unique)");
assert(channelCaps("NATIVE").gpsBackground === true, "natif avec GPS de fond");
assert(channelCaps("NATIVE").osLock === true, "natif avec verrouillage OS");
assert(channelCaps("NATIVE").ble === true, "natif avec BLE");

// 2. QUIZ sans capteur : compatible natif.
const quiz = jeu([
  noeud("q1", "QUIZ"),
  { ...noeud("fin", "INFO"), isEnding: true },
]);
assert(evaluateCompatibility(quiz, "NATIVE").verdict === "compatible", "quiz compatible natif");

// 3. Dwell GPS continu : OK natif (GPS de fond déclaré).
const dwell = jeu([
  noeud("spot", "INFO", [{ type: "GEOFENCE", lat: 48.0, lng: 2.0, radiusMeters: 30, predicate: "dwell", dwellMs: 8000 }]),
  { ...noeud("fin", "INFO"), isEnding: true },
]);
assert(evaluateCompatibility(dwell, "NATIVE").verdict === "compatible", "dwell OK en natif");

// 4. AR_MARKER : compatible natif avec holdMode (pas de repli).
const ar = jeu(
  [
    noeud("marqueur", "AR_MARKER"),
    { ...noeud("fin", "INFO"), isEnding: true },
  ],
  { holdMode: "guidedAccess" },
);
assert(evaluateCompatibility(ar, "NATIVE").verdict === "compatible", "AR OK en natif");

// 5. Porte d'export : natif proposé, blocage avec motifs sinon.
assert(canExportToChannel(dwell, "NATIVE").ok === true, "export natif proposé");
const arSansHold = jeu([noeud("marqueur", "AR_MARKER"), { ...noeud("fin", "INFO"), isEnding: true }]);
const porte = canExportToChannel(arSansHold, "NATIVE");
assert(porte.ok === false && porte.motifs.length > 0, "export natif bloqué avec motifs (AR sans holdMode)");

// 6. Sidecar : verdict natif unique embarqué avec version de matrice.
const sidecar = buildCompatSidecar(ar);
assert(sidecar.matrixVersion >= 2, "sidecar versionné");
assert(sidecar.verdicts.NATIVE.verdict === "compatible", "sidecar porte le verdict natif");

// 7. Non-régression game-5poi : nœud AR sans holdMode → refusé natif
// (cohérence couche 2, comme le validateur), sans motif GPS.
const g5 = game5poi as unknown as Game;
const v5nat = evaluateCompatibility(g5, "NATIVE");
assert(v5nat.verdict === "refuse", "5-poi refusé en natif (AR sans holdMode)");
assert(v5nat.motifs.every((m) => !m.includes("suivi GPS continu")), "natif sans motif GPS");

console.log("compat.smoke: ALL OK");
