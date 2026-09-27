// Proprietes du widget carte (change widget-cartographie) : source + filtre
// (mention d'eventement pour `all`), fond (choix ferme pack-only, jamais de
// champ URL), icones par etat + retour unitaire, icone du widget, et gestion
// du volet (liste, ajout texte/bouton a etat lie, suppression, reset defaut,
// edition via les formulaires strate 1 existants). Toute modification passe
// par `onChange` (operation MCP nommee annulable chez l'appelant).
import { useState } from "react";
import type { MapBackground, MapWidget, PoiState, Widget } from "../../game/types";
import { iconePoiDefaut, voletCarteDefaut } from "../../game/map-widget";
import { RetourDefaut } from "./FieldDefaults";
import { TextWidgetProperties } from "./TextWidgetProperties";
import { ButtonWidgetProperties } from "./ButtonWidgetProperties";

const ETATS: { id: PoiState; libelle: string }[] = [
  { id: "locked", libelle: "Verrouillé" },
  { id: "unlocked", libelle: "Éligible" },
  { id: "active", libelle: "En cours" },
  { id: "completed", libelle: "Terminé" },
];

const FONDS: { id: MapBackground; libelle: string }[] = [
  { id: "pack-tiles", libelle: "Tuiles du pack" },
  { id: "indoor-plan", libelle: "Plan indoor" },
  { id: "solid", libelle: "Fond uni" },
];

function libelleWidget(w: Widget): string {
  if (w.type === "text") return `Texte « ${w.text.slice(0, 24)} »`;
  if (w.type === "button") return `Bouton « ${w.label} »${w.poiAction === "open-step" ? " (lié)" : ""}`;
  if (w.type === "image") return "Image";
  if (w.type === "progress") return "Progression";
  if (w.type === "spacer") return "Espaceur";
  return w.type;
}

export function MapWidgetProperties({ widget, onChange }: { widget: MapWidget; onChange: (w: MapWidget) => void }) {
  const [voletIndex, setVoletIndex] = useState<number | null>(null);
  const filtre = widget.source.filter ?? "discovered";
  const fond = widget.background ?? "pack-tiles";
  const voletWidgets = widget.volet?.widgets ?? [];
  const voletSel = voletIndex != null ? voletWidgets[voletIndex] : undefined;

  const patchVolet = (widgets: Widget[]) => onChange({ ...widget, volet: { ...(widget.volet ?? {}), widgets } });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Source <span className="text-fog">(étapes du jeu)</span>
        </span>
        <select className="champ" value="steps" disabled title="Seule source du périmètre carte">
          <option value="steps">Étapes du jeu</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Filtre <span className="text-fog">(défaut : découvertes)</span>
          <RetourDefaut visible={filtre !== "discovered"} titre="filtre" onReset={() => onChange({ ...widget, source: { ...widget.source, filter: "discovered" } })} />
        </span>
        <select
          className="champ"
          value={filtre}
          onChange={(e) => onChange({ ...widget, source: { ...widget.source, filter: e.target.value as "discovered" | "all" } })}
        >
          <option value="discovered">Étapes découvertes</option>
          <option value="all">Toutes les étapes</option>
        </select>
        {filtre === "all" ? (
          <span className="text-[11px] text-fog">« Toutes » évente les étapes à découverte masquée (avertissement en validation).</span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Fond <span className="text-fog">(défaut : tuiles du pack)</span>
          <RetourDefaut visible={fond !== "pack-tiles"} titre="fond" onReset={() => onChange({ ...widget, background: "pack-tiles" })} />
        </span>
        <select
          className="champ"
          value={fond}
          onChange={(e) => onChange({ ...widget, background: e.target.value as MapBackground })}
        >
          {FONDS.map((f) => (
            <option key={f.id} value={f.id}>{f.libelle}</option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs">Icônes par état <span className="text-fog">(défauts du jeu sinon)</span></legend>
        {ETATS.map((e) => {
          const valeur = widget.poiStyle?.[e.id] ?? "";
          return (
            <label key={e.id} className="flex items-center gap-1 text-xs">
              <span className="w-20 shrink-0">{e.libelle}</span>
              <input
                type="text"
                className="champ min-w-0 flex-1"
                value={valeur}
                placeholder={iconePoiDefaut(e.id)}
                onChange={(ev) => onChange({ ...widget, poiStyle: { ...(widget.poiStyle ?? {}), [e.id]: ev.target.value || undefined } })}
              />
              <RetourDefaut
                visible={valeur !== ""}
                titre={`icône ${e.libelle}`}
                onReset={() => {
                  const suite = { ...(widget.poiStyle ?? {}) };
                  delete suite[e.id];
                  onChange({ ...widget, poiStyle: Object.keys(suite).length > 0 ? suite : undefined });
                }}
              />
            </label>
          );
        })}
      </fieldset>
      <label className="flex flex-col gap-1 text-xs">
        <span className="flex items-center gap-1">
          Icône du widget <span className="text-fog">(dock HOME, aucune)</span>
          <RetourDefaut visible={widget.icon !== undefined} titre="icône" onReset={() => onChange({ ...widget, icon: undefined })} />
        </span>
        <input
          type="text"
          className="champ"
          value={widget.icon ?? ""}
          placeholder="nom d'icône"
          onChange={(e) => onChange({ ...widget, icon: e.target.value || undefined })}
        />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs">Volet (sélection d'un marqueur)</legend>
        {voletWidgets.length === 0 ? (
          <p className="text-[11px] text-fog">Volet vide : la sélection n'affichera rien.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {voletWidgets.map((w, i) => (
              <li key={i} className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  className={`min-w-0 flex-1 truncate rounded border px-2 py-1 text-left ${voletIndex === i ? "border-neon" : "border-line"}`}
                  title="Éditer ce widget du volet"
                  onClick={() => setVoletIndex(voletIndex === i ? null : i)}
                >
                  {libelleWidget(w)}
                </button>
                <button
                  type="button"
                  className="rounded border border-line px-1.5 py-1 text-fog hover:text-snow"
                  title="Supprimer ce widget du volet"
                  aria-label={`Supprimer ${libelleWidget(w)}`}
                  onClick={() => {
                    patchVolet(voletWidgets.filter((_, j) => j !== i));
                    setVoletIndex(null);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border border-line px-2 py-1 text-xs hover:bg-surface-2"
            onClick={() => {
              patchVolet([...voletWidgets, { type: "text", text: "Nouveau texte", style: "body" }]);
              setVoletIndex(voletWidgets.length);
            }}
          >
            + Texte
          </button>
          <button
            type="button"
            className="rounded border border-line px-2 py-1 text-xs hover:bg-surface-2"
            onClick={() => {
              patchVolet([...voletWidgets, { type: "button", label: "Ouvrir", poiAction: "open-step", variant: "primary" }]);
              setVoletIndex(voletWidgets.length);
            }}
          >
            + Bouton lié
          </button>
          <button
            type="button"
            className="rounded border border-line px-2 py-1 text-xs hover:bg-surface-2"
            title="Restaurer le volet par défaut (texte + bouton lié)"
            onClick={() => {
              patchVolet(voletCarteDefaut().widgets ?? []);
              setVoletIndex(null);
            }}
          >
            Réinitialiser
          </button>
        </div>
        {voletSel?.type === "text" ? (
          <TextWidgetProperties widget={voletSel} onChange={(w) => patchVolet(voletWidgets.map((x, j) => (j === voletIndex ? w : x)))} />
        ) : null}
        {voletSel?.type === "button" ? (
          <ButtonWidgetProperties widget={voletSel} onChange={(w) => patchVolet(voletWidgets.map((x, j) => (j === voletIndex ? w : x)))} />
        ) : null}
      </fieldset>
    </div>
  );
}
