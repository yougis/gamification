// Calcul pur de l'aperçu écran global Accueil (change
// studio-home-apercu-simu, pur, testable hors navigateur) : ne lit que le
// jeu + l'état d'essai, ne crée aucun nœud, ne mute rien. Utilisé par le
// mini-aperçu t=0 du volet comme par l'aperçu simu de Prévisualiser.
import { timerRemainingMs } from "./inventory";
import type { Game } from "./types";

export function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export interface LigneApercu {
  id: string;
  etat: "Terminée" | "En cours" | "Disponible" | "Verrouillée";
  reboursMs: number | null;
}

export function calculerApercu(
  game: Game,
  nowMs: number,
  terminees: Set<string>,
  elus: string[],
  teteFile: string | null,
  actif: string | null,
): { lignes: LigneApercu[]; tete: string | null } {
  const termineesCarte = new Map([...terminees].map((id) => [id, nowMs] as [string, number]));
  return {
    lignes: game.nodes
      .filter((n) => !n.randomPool)
      .map((n) => ({
        id: n.id,
        etat: terminees.has(n.id) ? "Terminée" : n.id === actif ? "En cours" : elus.includes(n.id) ? "Disponible" : "Verrouillée",
        reboursMs: terminees.has(n.id) ? null : timerRemainingMs(n, termineesCarte, nowMs),
      })),
    tete: teteFile,
  };
}
