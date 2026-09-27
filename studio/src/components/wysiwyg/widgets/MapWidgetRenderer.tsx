// Apercu auteur statique du widget carte (change widget-cartographie, 3.1) :
// fond schematique + marqueurs aux positions (meme moteur de position que la
// vue Composer : marqueursCarte) + cercles geofence + apercu du volet.
// Strictement non interactif : aucune selection, aucun volet fonctionnel, aucun
// bouton actif — la mecanique vit exclusivement dans le renderer joueur.
// Mini-rendus locaux pour le volet (pas de WidgetRenderer : evite tout cycle).
import { Icon, type IconName } from "../../icons";
import { aFondCarte, iconePoiDefaut, marqueursCarte, widgetsVoletApercu } from "../../../game/map-widget";
import type { Game, MapWidget, Widget } from "../../../game/types";

const ICONES_CONNUES = new Set(["etape", "lieu", "tirage", "fin", "valider", "ok", "recherche", "fermer", "ajouter", "choix", "oeil", "message", "package", "accueil", "alerte", "statut"]);

function glyphe(nom: string | undefined, defaut: IconName): IconName {
  return nom && ICONES_CONNUES.has(nom) ? (nom as IconName) : defaut;
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

export function MapWidgetRenderer({ widget, game }: { widget: MapWidget; game?: Game }) {
  const fond = widget.background ?? "pack-tiles";
  const marqueurs = game ? marqueursCarte(game) : [];
  const iconeNeutre = glyphe(widget.poiStyle?.unlocked, iconePoiDefaut("unlocked") as IconName);
  const sansFond = game != null && !aFondCarte(game);
  return (
    <div className="pointer-events-none w-full" aria-label="Aperçu carte (statique)">
      <div
        className="relative h-40 w-full overflow-hidden rounded border border-line"
        style={{ background: fond === "solid" ? "#1a1a2e" : "#14141f" }}
        title={fond === "indoor-plan" ? "Plan indoor (aperçu schématique)" : fond === "solid" ? "Fond uni" : "Tuiles du pack (aperçu schématique)"}
      >
        {marqueurs.map((m) => (
          <span key={m.id} className="absolute" style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-100%)" }} title={m.id}>
            {m.rayon > 0 ? (
              <span
                className="absolute rounded-full border border-neon"
                style={{ width: `${m.rayon * 2}%`, aspectRatio: "1", left: "50%", top: "100%", transform: "translate(-50%,-50%)", opacity: 0.5 }}
              />
            ) : null}
            <span className="text-snow">
              <Icon name={iconeNeutre} size={16} />
            </span>
          </span>
        ))}
        {marqueurs.length === 0 ? (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-fog">Aucune étape positionnée</span>
        ) : null}
      </div>
      {sansFond ? (
        <p className="mt-1 text-[11px] text-fog">Carte non configurée (ni tuiles ni plan) — fond uni affiché côté joueur.</p>
      ) : null}
      <ApercuVolet widgets={widget.volet?.widgets} />
    </div>
  );
}
