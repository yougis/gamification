// Champs transverses des mini-jeux (change studio-screen-editor, design D4) :
// `maxAttempts` (≥ 1) et `timeLimitSeconds` (≥ 0, 0 = illimite), surchargeables
// par noeud dans `module.data`. Affiche la valeur resolue et son origine
// (locale / globale / defaut module) via `resolveMinigameParam`. Vide =
// heritage (cle retiree de `data`).
import { resolveMinigameParam } from "../../../game/screen-utils";
import type { MinigameDefaults } from "../../../game/types";
import { Accordeon, useAccordeon } from "../../Accordeon";

const ORIGINE_LABEL = { locale: "Locale", globale: "Globale", defaut: "Défaut module" } as const;

export function MinigameParamsFields({
  data,
  defaults,
  onChange,
  readOnly,
}: {
  data: Record<string, unknown>;
  defaults?: MinigameDefaults;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const localAttempts = typeof data.maxAttempts === "number" ? data.maxAttempts : undefined;
  const localTime = typeof data.timeLimitSeconds === "number" ? data.timeLimitSeconds : undefined;
  const attempts = resolveMinigameParam(localAttempts, defaults, "maxAttempts");
  const time = resolveMinigameParam(localTime, defaults, "timeLimitSeconds");
  const setParam = (key: "maxAttempts" | "timeLimitSeconds", raw: string) => {
    if (raw === "") {
      const next = { ...data };
      delete next[key];
      onChange(next);
      return;
    }
    onChange({ ...data, [key]: Number(raw) });
  };
  return (
    <div className="flex flex-col gap-2" aria-label="Paramètres du mini-jeu">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="flex items-center gap-2">
            Essais max
            <span className="puce" title={attempts.origin === "locale" ? "Surcharge locale" : attempts.origin === "globale" ? "Hérité des défauts globaux" : "Comportement actuel du module"}>
              {attempts.origin === "locale" ? ORIGINE_LABEL.locale : attempts.origin === "globale" ? `hérité ${ORIGINE_LABEL.globale.toLowerCase()} (${attempts.value})` : ORIGINE_LABEL.defaut}
            </span>
          </span>
          <input
            type="number"
            min={1}
            step={1}
            disabled={readOnly}
            className="champ"
            value={localAttempts ?? ""}
            placeholder={attempts.value != null ? `Hérité : ${attempts.value}` : "Illimité (défaut)"}
            aria-label="Nombre d'essais maximum"
            onChange={(e) => setParam("maxAttempts", e.target.value)}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          <span className="flex items-center gap-2">
            Temps (s)
            <span className="puce" title={time.origin === "locale" ? "Surcharge locale" : time.origin === "globale" ? "Hérité des défauts globaux" : "Comportement actuel du module"}>
              {time.origin === "locale" ? ORIGINE_LABEL.locale : time.origin === "globale" ? `hérité ${ORIGINE_LABEL.globale.toLowerCase()} (${time.value})` : ORIGINE_LABEL.defaut}
            </span>
          </span>
          <input
            type="number"
            min={0}
            step={1}
            disabled={readOnly}
            className="champ"
            value={localTime ?? ""}
            placeholder={time.value != null ? `Hérité : ${time.value}` : "Défaut module"}
            aria-label="Temps alloué en secondes (0 = illimité)"
            onChange={(e) => setParam("timeLimitSeconds", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

/**
 * « Essais / Temps » en accordéon (change studio-composer-ux) : badge =
 * valeurs résolues, fermé par défaut (secondaire après le contenu du module).
 * Partagé par les panneaux quiz et puzzle (même `id` => mémoire commune,
 * le contenu étant identique).
 */
export function MinigameParamsAccordeon({
  data,
  defaults,
  onChange,
  readOnly,
}: {
  data: Record<string, unknown>;
  defaults?: MinigameDefaults;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const [ouvert, basculer] = useAccordeon("minigame-params", false);
  const localAttempts = typeof data.maxAttempts === "number" ? data.maxAttempts : undefined;
  const localTime = typeof data.timeLimitSeconds === "number" ? data.timeLimitSeconds : undefined;
  const attempts = resolveMinigameParam(localAttempts, defaults, "maxAttempts");
  const time = resolveMinigameParam(localTime, defaults, "timeLimitSeconds");
  const fmt = (v: number | undefined, unite: string) => (v == null ? "défaut" : `${v} ${unite}`);
  return (
    <Accordeon
      id="minigame-params"
      titre="Essais / Temps"
      badge={
        <span className="puce" title="Valeurs appliquées (locale, globale ou défaut module)">
          {fmt(attempts.value, "essais")} · {fmt(time.value, "s")}
        </span>
      }
      ouvert={ouvert}
      onToggle={basculer}
    >
      <MinigameParamsFields data={data} defaults={defaults} onChange={onChange} readOnly={readOnly} />
    </Accordeon>
  );
}
