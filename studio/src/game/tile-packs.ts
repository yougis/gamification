// Cache des packs de tuiles (change smart-tile-caching) : plusieurs caches
// par projet, un seul actif (`global.tilePackId`). Pur sauf la persistance
// injectable (localStorage par défaut) : le backend serveur (catalogue)
// parle le même contrat `TilePackMeta` via ses endpoints dédiés.
import type { Game, TilePackMeta, TileStrategy } from "./types";
import { packActif, setActiveTilePack } from "./mcp";

export type { TilePackMeta };

export interface TilePackDepot {
  lire(): TilePackMeta[];
  ecrire(packs: TilePackMeta[]): void;
}

const CLE_DEFAUT = "geoplay-tile-packs-v1";

/** Seuil de confirmation (tâche 3.4) : au-delà, la génération exige un
 * second clic explicite — une bbox abusive ne part jamais par mégarde. */
export const SEUIL_CONFIRMATION_TUILES = 2000;

/** Dépôt localStorage (menu Packs de carte) : [<gameId>[/<reste>] → métas. */
export function depotLocal(cle = CLE_DEFAUT): TilePackDepot {
  return {
    lire() {
      try {
        const brut = localStorage.getItem(cle);
        if (!brut) return [];
        const parsed = JSON.parse(brut) as { packs?: TilePackMeta[] };
        return Array.isArray(parsed.packs) ? parsed.packs : [];
      } catch {
        return [];
      }
    },
    ecrire(packs: TilePackMeta[]) {
      try {
        localStorage.setItem(cle, JSON.stringify({ packs }));
      } catch {
        /* stockage indisponible : cache en mémoire seulement */
      }
    },
  };
}

/** Packs d'un projet (préfixe gameId), triés par date décroissante. */
export function listerPacks(depot: TilePackDepot, gameId: string): TilePackMeta[] {
  return depot
    .lire()
    .filter((p) => p.id === gameId || p.id.startsWith(`${gameId}/`))
    .sort((a, b) => (b.date < a.date ? -1 : 1));
}

let compteur = 0;

/** Crée un pack `pret` (snapshot config + estimation) dans le cache. */
export function creerPack(
  depot: TilePackDepot,
  gameId: string,
  nom: string,
  config: TilePackMeta["config"],
  nbTuiles: number,
  tailleOctets: number,
): TilePackMeta {
  compteur += 1;
  const pack: TilePackMeta = {
    id: `${gameId}/${Date.now().toString(36)}-${compteur}`,
    nom: nom || `Pack ${new Date().toLocaleDateString()}`,
    config: { ...config },
    nbTuiles,
    tailleOctets,
    date: new Date().toISOString(),
    statut: "pret",
  };
  depot.ecrire([...depot.lire(), pack]);
  return pack;
}

/**
 * Supprime un pack après confirmation auteur. Supprimer le pack actif retire
 * aussi la désignation (`tilePackId`) : le JSON reste valide, la carte
 * replie sur fond uni. Retourne le jeu éventuellement mis à jour.
 */
export function supprimerPack(
  depot: TilePackDepot,
  game: Game,
  packId: string,
): { game: Game; supprime: boolean } {
  const packs = depot.lire();
  if (!packs.some((p) => p.id === packId)) return { game, supprime: false };
  depot.ecrire(packs.filter((p) => p.id !== packId));
  if (game.global?.tilePackId === packId) {
    return { game: setActiveTilePack(game, null), supprime: true };
  }
  return { game, supprime: true };
}

/** Stratégie lue pour l'aperçu : pack actif ou stratégie du jeu. */
export function strategieEffective(
  game: Game,
  packs: TilePackMeta[],
): { strategy: TileStrategy; pack: TilePackMeta | null } {
  const pack = packActif(packs, game);
  if (pack) return { strategy: pack.config.tileStrategy, pack };
  return { strategy: (game.global?.tileStrategy ?? "fixed") as TileStrategy, pack: null };
}
