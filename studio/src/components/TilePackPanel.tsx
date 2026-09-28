// Menu « Packs de carte » (change smart-tile-caching) : toute la
// configuration des tuiles offline au même endroit — stratégie, rayon,
// provider, zooms, attribution, estimation, génération, liste des caches,
// suppression confirmée, désignation du pack actif. Chaque écriture JSON
// passe par une opération MCP nommée (undo/redo) ; jamais de JSON manuel.
import { useMemo, useReducer, useState } from "react";
import {
  computeOptimalBbox,
  setActiveTilePack,
  setTileStrategy,
} from "../game/mcp";
import { estimerPackTuiles } from "../game/pack";
import {
  creerPack,
  listerPacks,
  supprimerPack,
} from "../game/tile-packs";
import {
  getCatalogUrl,
  publierPackTuiles,
} from "../game/catalog";
import type { Game, StudioMeta, TileStrategy } from "../game/types";
import { Icon } from "./icons";

const STRATEGIES: { id: TileStrategy; nom: string; aide: string }[] = [
  { id: "fixed", nom: "Fixe (bbox manuelle)", aide: "Bbox statique saisie dans global.map.bbox" },
  { id: "viewport", nom: "Auto (positions + 200 m)", aide: "Bbox calculée depuis les POI avec buffer de 200 m" },
  { id: "radius", nom: "Rayon par POI", aide: "Bbox calculée depuis les POI avec le rayon ci-dessous" },
  { id: "none", nom: "Sans carte (indoor)", aide: "Aucune tuile téléchargée, plan indoor ou fond uni" },
];

type Edit = (
  fn: (s: { game: Game; meta: StudioMeta }) => { game: Game; meta: StudioMeta },
  op: string,
) => void;

export function TilePackPanel({ game, meta, edit, lectureSeule }: {
  game: Game;
  meta: StudioMeta;
  edit: Edit;
  lectureSeule: boolean;
}) {
  const depot = useMemo(() => ({
    lire() {
      try {
        const brut = localStorage.getItem("geoplay-tile-packs-v1");
        if (!brut) return [];
        const parsed = JSON.parse(brut) as { packs?: import("../game/types").TilePackMeta[] };
        return Array.isArray(parsed.packs) ? parsed.packs : [];
      } catch {
        return [];
      }
    },
    ecrire(packs: import("../game/types").TilePackMeta[]) {
      try {
        localStorage.setItem("geoplay-tile-packs-v1", JSON.stringify({ packs }));
      } catch {
        /* stockage indisponible : cache en mémoire seulement */
      }
    },
  }), []);
  const [, forcer] = useReducer((x: number) => x + 1, 0);
  const [nom, setNom] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [suppression, setSuppression] = useState<string | null>(null);

  const strategie = (game.global?.tileStrategy ?? "fixed") as TileStrategy;
  const map = game.global?.map ?? {};
  const minZoom = map.minZoom ?? 12;
  const maxZoom = map.maxZoom ?? 16;
  const { bbox, tileCount } = useMemo(() => computeOptimalBbox(game), [game]);
  const estimation = useMemo(
    () => (bbox ? estimerPackTuiles(bbox, minZoom, maxZoom) : null),
    [bbox, minZoom, maxZoom],
  );
  const packs = useMemo(
    () => listerPacks(depot, game.gameId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depot, game.gameId, game.global?.tilePackId, note],
  );
  const actif = game.global?.tilePackId ?? null;

  const poserMap = (patch: Record<string, unknown>) => {
    edit(
      (s) => ({ ...s, game: { ...s.game, global: { ...s.game.global, map: { ...(s.game.global?.map ?? {}), ...patch } } } }),
      "setMap",
    );
  };

  const generer = async () => {
    setNote(null);
    if (!bbox || strategie === "none") {
      setNote("Aucune zone à générer : aucune position POI (ou stratégie « sans carte »).");
      return;
    }
    const est = estimerPackTuiles(bbox, minZoom, maxZoom);
    const pack = creerPack(depot, game.gameId, nom || `Pack ${strategie}`, {
      provider: map.provider,
      bbox,
      minZoom,
      maxZoom,
      tileStrategy: strategie,
      tileRadiusMeters: game.global?.tileRadiusMeters,
    }, est.nbTuiles, est.octets);
    // Mise en cache serveur quand le catalogue est configuré (non bloquant).
    const url = getCatalogUrl();
    if (url) {
      try {
        await publierPackTuiles(url, game.gameId, pack);
        setNote(`Pack « ${pack.nom} » généré (${est.nbTuiles} tuiles, ${est.lisible}) et mis en cache sur le serveur.`);
      } catch (e) {
        setNote(`Pack « ${pack.nom} » généré en local (${est.nbTuiles} tuiles) — cache serveur injoignable : ${e instanceof Error ? e.message : e}.`);
      }
    } else {
      setNote(`Pack « ${pack.nom} » généré en local (${est.nbTuiles} tuiles, ${est.lisible}). Configurez le catalogue pour le mettre en cache sur le serveur.`);
    }
    setNom("");
    forcer();
  };

  const supprimer = (id: string) => {
    if (suppression !== id) {
      setSuppression(id);
      return;
    }
    setSuppression(null);
    const pack = packs.find((p) => p.id === id);
    const etaitActif = actif === id;
    const { game: maj } = supprimerPack(depot, game, id);
    if (maj !== game) edit(() => ({ game: maj, meta }), "setActiveTilePack");
    setNote(
      etaitActif
        ? `Pack « ${pack?.nom ?? id} » supprimé — c'était l'actif : la carte replie sur fond uni.`
        : `Pack « ${pack?.nom ?? id} » supprimé.`,
    );
    forcer();
  };

  return (
    <div className="carte p-3">
      <h3 className="flex items-center gap-1.5 font-bold text-[13px]">
        <Icon name="lieu" size={15} /> Packs de carte
      </h3>
      <p className="text-[8px] text-fog">Toute la configuration des tuiles offline — stratégie, zone, zooms, génération, caches. Le pack actif est embarqué à l'export.</p>

      <label className="text-[8px] flex gap-1 items-center mt-1">
        Stratégie :
        <select
          className="champ"
          value={strategie}
          disabled={lectureSeule}
          onChange={(e) => edit((s) => ({ ...s, game: setTileStrategy(s.game, e.target.value as TileStrategy) }), "setTileStrategy")}
          aria-label="Stratégie de tuiles"
        >
          {STRATEGIES.map((s) => (
            <option key={s.id} value={s.id} title={s.aide}>{s.nom}</option>
          ))}
        </select>
      </label>
      {strategie === "radius" && (
        <label className="text-[8px] flex gap-1 items-center mt-1">
          Rayon (m) :
          <input
            className="champ w-24"
            type="number"
            min={1}
            value={game.global?.tileRadiusMeters ?? 200}
            disabled={lectureSeule}
            onChange={(e) => edit((s) => ({ ...s, game: setTileStrategy(s.game, "radius", Number(e.target.value)) }), "setTileStrategy")}
            aria-label="Rayon des tuiles en mètres"
          />
        </label>
      )}
      <div className="flex flex-wrap gap-1 mt-1">
        <label className="text-[8px] flex gap-1 items-center">
          Provider :
          <input className="champ w-28" value={map.provider ?? ""} placeholder="osm" disabled={lectureSeule}
            onChange={(e) => poserMap({ provider: e.target.value })} aria-label="Provider de tuiles" />
        </label>
        <label className="text-[8px] flex gap-1 items-center">
          Zoom min :
          <input className="champ w-16" type="number" min={0} max={22} value={minZoom} disabled={lectureSeule}
            onChange={(e) => poserMap({ minZoom: Number(e.target.value) })} aria-label="Zoom minimum" />
        </label>
        <label className="text-[8px] flex gap-1 items-center">
          Zoom max :
          <input className="champ w-16" type="number" min={0} max={22} value={maxZoom} disabled={lectureSeule}
            onChange={(e) => poserMap({ maxZoom: Number(e.target.value) })} aria-label="Zoom maximum" />
        </label>
        <label className="text-[8px] flex gap-1 items-center">
          Attribution :
          <input className="champ w-40" value={map.attribution ?? ""} placeholder="© OpenStreetMap" disabled={lectureSeule}
            onChange={(e) => poserMap({ attribution: e.target.value })} aria-label="Attribution" />
        </label>
      </div>

      <p className="text-[8px] text-fog mt-1">
        {bbox
          ? <>Zone calculée : {bbox.minLat.toFixed(4)}, {bbox.minLng.toFixed(4)} → {bbox.maxLat.toFixed(4)}, {bbox.maxLng.toFixed(4)} — estimation : <b>{estimation?.nbTuiles ?? tileCount} tuiles ({estimation?.lisible})</b>.</>
          : "Aucune zone calculable (aucune position POI, ou stratégie « sans carte »)."}
      </p>

      {!lectureSeule && (
        <div className="flex gap-1 mt-1">
          <input className="champ flex-1" value={nom} placeholder="Nom du pack (optionnel)" onChange={(e) => setNom(e.target.value)} aria-label="Nom du pack" />
          <button className="btn" onClick={() => void generer()} disabled={!bbox || strategie === "none"}>
            <Icon name="ajouter" size={15} /> Générer
          </button>
        </div>
      )}
      {note && <p className="text-[8px] mt-1" role="status">{note}</p>}

      <h4 className="font-bold text-[11px] mt-2">Caches du projet ({packs.length})</h4>
      {packs.length === 0 && <p className="text-[8px] text-fog">Aucun pack généré pour ce projet.</p>}
      <ul className="text-[8px]">
        {packs.map((p) => (
          <li key={p.id} className="carte p-2 my-1 flex items-center gap-2">
            <span className="flex-1">
              <b>{p.nom}</b> — {p.nbTuiles} tuiles, {(p.tailleOctets / 1048576).toFixed(1)} Mo, {p.date.slice(0, 10)}
              {actif === p.id && <span className="puce puce-ok ml-1">actif</span>}
            </span>
            {!lectureSeule && actif !== p.id && (
              <button className="btn" title="Utiliser ce pack dans les packs du jeu"
                onClick={() => { edit((s) => ({ ...s, game: setActiveTilePack(s.game, p.id) }), "setActiveTilePack"); forcer(); }}>
                Activer
              </button>
            )}
            {!lectureSeule && (
              <button className="btn" title={suppression === p.id ? "Cliquez à nouveau pour confirmer la suppression" : "Supprimer ce pack"}
                onClick={() => supprimer(p.id)}>
                {suppression === p.id ? "Confirmer ?" : "Supprimer"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
