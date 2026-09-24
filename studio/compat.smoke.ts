// Smoke test de compatibilité jeu × canal (change player-pwa-shell) :
// matrice versionnée, verdicts GPS de fond / AR / quiz, porte d'export,
// non-régression game-5poi (refusé PWA à cause des dwell, OK natif).
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

// 1. Matrice : la PWA ne déclare ni fond GPS ni lock ; versionnée.
assert(matrixVersion() >= 1, "matrice versionnée");
assert(channelCaps("PWA").gpsBackground === false, "PWA sans GPS de fond");
assert(channelCaps("PWA").osLock === false, "PWA sans verrouillage OS");
assert(channelCaps("NATIVE").gpsBackground === true, "natif avec GPS de fond");
assert(channelCaps("PWA").gpsForeground === true, "PWA avec GPS premier plan");

// 2. QUIZ sans capteur : compatible partout.
const quiz = jeu([
  noeud("q1", "QUIZ"),
  { ...noeud("fin", "INFO"), isEnding: true },
]);
assert(evaluateCompatibility(quiz, "PWA").verdict === "compatible", "quiz compatible PWA");
assert(evaluateCompatibility(quiz, "NATIVE").verdict === "compatible", "quiz compatible natif");

// 3. Dwell GPS : refusé PWA (motif nommé), OK natif.
const dwell = jeu([
  noeud("spot", "INFO", [{ type: "GEOFENCE", lat: 48.0, lng: 2.0, radiusMeters: 30, predicate: "dwell", dwellMs: 8000 }]),
  { ...noeud("fin", "INFO"), isEnding: true },
]);
const vDwellPwa = evaluateCompatibility(dwell, "PWA");
assert(vDwellPwa.verdict === "refuse", "dwell refusé en PWA");
assert(vDwellPwa.motifs.some((m) => m.includes("spot")), "motif nomme le nœud fautif");
assert(evaluateCompatibility(dwell, "NATIVE").verdict === "compatible", "dwell OK en natif");

// 4. AR_MARKER : dégradé PWA (repli 2D), compatible natif.
// Note : needsLock exige holdMode (rejet couche 2 sinon) → déclaré ici.
const ar = jeu(
  [
    noeud("marqueur", "AR_MARKER"),
    { ...noeud("fin", "INFO"), isEnding: true },
  ],
  { holdMode: "guidedAccess" },
);
const vArPwa = evaluateCompatibility(ar, "PWA");
assert(vArPwa.verdict === "degrade", "AR dégradé en PWA");
assert(vArPwa.replis.some((r) => r.includes("2D")), "repli fallback 2D nommé");
assert(evaluateCompatibility(ar, "NATIVE").verdict === "compatible", "AR OK en natif");

// 5. Porte d'export : PWA bloqué avec motifs, natif proposé.
const portePwa = canExportToChannel(dwell, "PWA");
assert(portePwa.ok === false && portePwa.motifs.length > 0, "export PWA bloqué avec motifs");
assert(canExportToChannel(dwell, "NATIVE").ok === true, "export natif proposé");

// 6. Sidecar : les deux verdicts embarqués avec version de matrice.
const sidecar = buildCompatSidecar(ar);
assert(sidecar.matrixVersion >= 1, "sidecar versionné");
assert(sidecar.verdicts.PWA.verdict === "degrade", "sidecar porte le verdict PWA");
assert(sidecar.verdicts.NATIVE.verdict === "compatible", "sidecar porte le verdict natif");

// 7. Non-régression game-5poi : dwell 5-8 s → refusé PWA ; nœud AR sans
// holdMode → refusé partout (cohérence couche 2, comme le validateur).
const g5 = game5poi as unknown as Game;
const v5pwa = evaluateCompatibility(g5, "PWA");
assert(v5pwa.verdict === "refuse", "5-poi refusé en PWA");
assert(v5pwa.motifs.some((m) => m.includes("suivi GPS continu")), "motif dwell nommé en PWA");
const v5nat = evaluateCompatibility(g5, "NATIVE");
assert(v5nat.verdict === "refuse", "5-poi refusé en natif (AR sans holdMode)");
assert(v5nat.motifs.every((m) => !m.includes("suivi GPS continu")), "natif sans motif GPS");

console.log("compat.smoke: ALL OK");
