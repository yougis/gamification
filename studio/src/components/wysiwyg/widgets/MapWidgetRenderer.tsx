// Apercu auteur statique du widget carte (change widget-cartographie, 3.1 ;
// change pack-tuiles-effectif phase A : reflet du pack actif) : fond
// schematique + marqueurs aux positions (meme moteur de position que la
// vue Composer : marqueursCarte) + cercles geofence + apercu du volet.
// Strictement non interactif : aucune selection, aucun volet fonctionnel, aucun
// bouton actif — la mecanique vit exclusivement dans le renderer joueur.
// Mini-rendus locaux pour le volet (pas de WidgetRenderer : evite tout cycle).
import { useMemo, useState } from "react";
import { Icon, type IconName } from "../../icons";
import { aFondCarte, fondEffectifWidget, iconePoiDefaut, marqueursCarte, widgetsVoletApercu } from "../../../game/map-widget";
import { packActif } from "../../../game/mcp";
import { zoomApercu } from "../../../game/pack";
import { depotLocal, listerPacks } from "../../../game/tile-packs";
import { mmss } from "../../../game/apercu-accueil";
import type { LigneApercu } from "../../../game/apercu-accueil";
import type { Game, MapWidget, Widget } from "../../../game/types";

const ICONES_CONNUES = new Set(["etape", "lieu", "tirage", "fin", "valider", "ok", "recherche", "fermer", "ajouter", "choix", "oeil", "message", "package", "accueil", "alerte", "statut"]);

function glyphe(nom: string | undefined, defaut: IconName): IconName {
  return nom && ICONES_CONNUES.has(nom) ? (nom as IconName) : defaut;
}

// Snapshot d'essai (change home-phonecanvas-unique) : pastille d'état lue,
// jamais simulée ici (aucune écriture, aucun tick).
function titreMarqueur(id: string, ligne: LigneApercu | undefined): string {
  if (!ligne) return id;
  const rebours = ligne.reboursMs != null ? ` — dans ${mmss(ligne.reboursMs)}` : "";
  return `${id} — ${ligne.etat}${rebours}`;
}

function ApercuVolet({ widgets }: { widgets: Widget[] | undefined }) {
  const rendables = widgetsVoletApercu(widgets);
  if (rendables.length === 0) return null;
  return (
    <div className="pointer-events-none mt-1 rounded border border-line bg-surface-2 px-2 py-1" aria-label="Aperçu du volet">
      {rendables.map((w, i) =>
        w.type === "text" ? (
          <p key={i} className="truncate text-xs text-snow">{w.text}</p>
        ) : w.type === "button" ? (
          <span key={i} className="mt-1 inline-block rounded bg-surface px-2 py-0.5 text-xs text-fog">
            {w.label}
            {w.poiAction === "open-step" ? " (lié)" : ""}
          </span>
        ) : w.type === "image" ? (
          <span key={i} className="mt-1 block h-6 rounded bg-surface text-[10px] text-fog">image</span>
        ) : w.type === "progress" ? (
          <span key={i} className="mt-1 block h-1.5 rounded bg-surface" />
        ) : (
          <span key={i} className="block" style={{ height: 8 }} />
        ),
      )}
    </div>
  );
}

export function MapWidgetRenderer({ widget, game, lignes }: { widget: MapWidget; game?: Game; lignes?: LigneApercu[] }) {
  const fond = widget.background ?? "pack-tiles";
  const marqueurs = game ? marqueursCarte(game) : [];
  const etats = new Map((lignes ?? []).map((l) => [l.id, l]));
  const iconeNeutre = glyphe(widget.poiStyle?.unlocked, iconePoiDefaut("unlocked") as IconName);
  const sansFond = game != null && !aFondCarte(game);
  // Pack actif du projet (phase A) : lu depuis le depot local, jamais depuis
  // le JSON (le JSON ne porte que `tilePackId`). Un seul point de cablage
  // pour le canvas Screen comme pour l'apercu Home (meme PhoneCanvas).
  const packs = useMemo(
    () => (game ? listerPacks(depotLocal(), game.gameId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game?.gameId, game?.global?.tilePackId],
  );
  const pack = game ? packActif(packs, game) : null;
  const effectif = game ? fondEffectifWidget(game, widget, packs) : fond;
  const sansActif = game != null && fond === "pack-tiles" && pack == null;
  // Phase B : tuiles réelles en prévisualisation auteur uniquement — source
  // d'aperçu du Studio (en ligne), jamais écrite au JSON ni au manifest.
  // Hors-ligne connu d'avance (`navigator.onLine`) : aucun appel tenté,
  // repli schématique direct. Échec en cours de route : repli au premier
  // onError, sans état partiel visible.
  const [tuilesKO, setTuilesKO] = useState(false);
  // Hors-ligne explicite (`onLine === false`) : aucun appel tenté. État
  // inconnu (SSR, tests) : considéré en ligne, l'onError couvre l'échec.
  const enLigne = typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine;
  const grille =
    pack != null && fond === "pack-tiles" && pack.statut === "pret" && enLigne && !tuilesKO
      ? zoomApercu(pack.config.bbox, pack.config.minZoom, pack.config.maxZoom)
      : null;
  const titreFond =
    fond === "indoor-plan"
      ? "Plan indoor (aperçu schématique)"
      : fond === "solid" || effectif === "solid"
        ? "Fond uni"
        : pack
          ? `Pack actif « ${pack.nom} » (${pack.nbTuiles} tuiles)`
          : "Tuiles du pack (aperçu schématique)";
  return (
    <div className="pointer-events-none w-full" aria-label="Aperçu carte (statique)">
      <div
        className="relative h-40 w-full overflow-hidden rounded border border-line"
        style={grille ? undefined : { background: effectif === "solid" ? "#1a1a2e" : "#14141f" }}
        title={titreFond}
      >
        {grille ? (
          <span className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${grille.x1 - grille.x0 + 1}, 1fr)` }} aria-hidden="true">
            {Array.from({ length: (grille.x1 - grille.x0 + 1) * (grille.y1 - grille.y0 + 1) }, (_, i) => {
              const x = grille.x0 + (i % (grille.x1 - grille.x0 + 1));
              const y = grille.y0 + Math.floor(i / (grille.x1 - grille.x0 + 1));
              return (
                <img
                  key={`${x}/${y}`}
                  src={`/tiles/${grille.z}/${x}/${y}.png`}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                  onError={() => setTuilesKO(true)}
                />
              );
            })}
          </span>
        ) : null}
        {marqueurs.map((m) => (
          <span key={m.id} className="absolute" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-100%)" }} title={titreMarqueur(m.id, etats.get(m.id))}>
            {m.rayon > 0 ? (
              <span
                className="absolute rounded-full border border-neon"
                style={{ width: `${m.rayon * 2}%`, aspectRatio: "1", left: "50%", top: "100%", transform: "translate(-50%,-50%)", opacity: 0.5 }}
              />
            ) : null}
            <span className="text-snow">
              <Icon name={iconeNeutre} size={16} />
            </span>
            {etats.get(m.id) ? (
              <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 text-[9px] text-snow">
                {etats.get(m.id)!.etat}
              </span>
            ) : null}
          </span>
        ))}
        {marqueurs.length === 0 ? (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-fog">Aucune étape positionnée</span>
        ) : null}
      </div>
      {sansFond && fond !== "pack-tiles" ? (
        <p className="mt-1 text-[11px] text-fog">Carte non configurée (ni tuiles ni plan) — fond uni affiché côté joueur.</p>
      ) : null}
      {sansActif ? (
        <p className="mt-1 text-[11px] text-fog">Fond uni — aucun pack actif (menu Packs de carte).</p>
      ) : null}
      {pack && fond === "pack-tiles" && grille ? (
        <p className="mt-1 text-[11px]">
          <span className="puce ml-1" title="Tuiles chargées en ligne pour contrôle visuel ; le pack joueur reste offline">aperçu en ligne</span>
        </p>
      ) : null}
      <ApercuVolet widgets={widget.volet?.widgets} />
    </div>
  );
}
