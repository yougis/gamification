// Barre d'outils de style compacte, genre editeur de texte riche (change
// studio-style-toolbar, design D1-D3). Meme API que l'ancien `StyleFields`
// (niveau, local, resolved, origins, champs, onChange) : groupes typographie
// (police/taille/gras-normal), couleur (texte/fond : picker + hex
// synchronises), alignement (segmente 3 boutons), surcharge (retrait par
// controle). Chaque controle affiche la valeur resolue et son badge d'origine
// compact (pastille + infobulle) ; renseigner surcharge le niveau edite,
// effacer retombe sur l'heritage. Groupe vide = masque.
import type { StyleOrigin, WidgetStyles } from "../../game/types";
import { FONT_OPTIONS, estPoliceConnue } from "../../game/fonts";

export const STYLE_LABELS: Record<keyof WidgetStyles, string> = {
  fontFamily: "Police",
  fontSize: "Taille (px)",
  fontWeight: "Graisse",
  color: "Couleur texte",
  align: "Alignement",
  backgroundColor: "Couleur de fond",
  textColor: "Couleur du module",
  borderRadius: "Arrondi (px)",
};

const BADGE_ORIGINE: Record<StyleOrigin, string> = {
  global: "Global",
  ecran: "Écran",
  widget: "Widget",
};

const HEX_VALIDE = /^#[0-9a-fA-F]{6}$/;

function Badge({ niveau, origine, estLocale }: { niveau: StyleOrigin; origine?: StyleOrigin; estLocale: boolean }) {
  const texte = estLocale ? BADGE_ORIGINE[niveau] : origine ? `hérité ${BADGE_ORIGINE[origine]}` : "défaut";
  const titre = estLocale ? "Défini à ce niveau" : origine ? `Hérité de ${BADGE_ORIGINE[origine]}` : "Valeur par défaut";
  return (
    <span className="puce text-[10px]" title={titre}>
      {texte}
    </span>
  );
}

export function StyleToolbar({
  niveau,
  local,
  resolved,
  origins,
  champs,
  onChange,
}: {
  // Niveau edite par cette barre.
  niveau: StyleOrigin;
  // Valeurs renseignees a ce niveau (fusion via onChange).
  local: WidgetStyles;
  // Valeurs resolues (global → ecran → widget) pour l'affichage herite.
  resolved: WidgetStyles;
  // Origine de chaque propriete resolue.
  origins: Partial<Record<keyof WidgetStyles, StyleOrigin>>;
  // Sous-ensemble editable (defaut : typo/couleur/alignement du widget).
  champs?: (keyof WidgetStyles)[];
  onChange: (next: WidgetStyles) => void;
}) {
  const demande = new Set(champs ?? (["fontFamily", "fontSize", "fontWeight", "color", "align"] as (keyof WidgetStyles)[]));
  const retirer = (cle: keyof WidgetStyles) => {
    const next = { ...local };
    delete next[cle];
    onChange(next);
  };
  const setTexte = (cle: keyof WidgetStyles, raw: string) => {
    const next = { ...local };
    if (raw === "") delete next[cle];
    else (next as Record<string, unknown>)[cle] = raw;
    onChange(next);
  };
  const setNombre = (cle: keyof WidgetStyles, raw: string) => {
    const next = { ...local };
    if (raw === "") delete next[cle];
    else (next as Record<string, unknown>)[cle] = Number(raw);
    onChange(next);
  };
  const etat = (cle: keyof WidgetStyles) => {
    const locale = local[cle];
    const origine = origins[cle];
    const estLocale = origine === niveau && locale !== undefined;
    return { locale, origine, estLocale, heritee: !estLocale ? resolved[cle] : undefined };
  };
  const croix = (cle: keyof WidgetStyles, libelle: string, visible: boolean) =>
    visible ? (
      <button
        type="button"
        className="min-h-[44px] px-1.5 text-fog hover:text-snow"
        title="Retirer la surcharge (retour à l'héritage)"
        aria-label={`Retirer la surcharge ${libelle}`}
        onClick={() => retirer(cle)}
      >
        ×
      </button>
    ) : null;

  const typo = (["fontFamily", "fontSize", "fontWeight"] as (keyof WidgetStyles)[]).filter((c) => demande.has(c));
  const couleurs = (["color", "backgroundColor", "textColor"] as (keyof WidgetStyles)[]).filter((c) => demande.has(c));
  const avecAlign = demande.has("align");
  const nombres = (["borderRadius"] as (keyof WidgetStyles)[]).filter((c) => demande.has(c));

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2" aria-label={`Styles niveau ${niveau}`} role="toolbar">
      {typo.length > 0 ? (
        <fieldset className="flex items-end gap-1.5">
          <legend className="text-[10px] uppercase tracking-wide text-fog">Typo</legend>
          {demande.has("fontFamily") ? (
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <span className="text-[11px]">Police</span>
                <Badge niveau={niveau} origine={etat("fontFamily").origine} estLocale={etat("fontFamily").estLocale} />
              </span>
              <span className="flex items-center gap-1">
                <select
                  className="champ min-h-[44px] max-w-32"
                  value={
                    typeof etat("fontFamily").locale === "string" && estPoliceConnue(etat("fontFamily").locale as string)
                      ? (etat("fontFamily").locale as string)
                      : typeof etat("fontFamily").locale === "string"
                        ? "__custom__"
                        : ""
                  }
                  aria-label="Police"
                  title={etat("fontFamily").heritee != null && !etat("fontFamily").estLocale ? `Hérité : ${String(etat("fontFamily").heritee)}` : "Police"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      const next = { ...local };
                      delete next.fontFamily;
                      onChange(next);
                    } else if (v === "__custom__") {
                      const heritee = etat("fontFamily").heritee;
                      onChange({ ...local, fontFamily: typeof heritee === "string" && !estPoliceConnue(heritee) ? heritee : "" });
                    } else {
                      onChange({ ...local, fontFamily: v });
                    }
                  }}
                >
                  <option value="">{etat("fontFamily").heritee != null ? `Hérité : ${String(etat("fontFamily").heritee)}` : "Défaut"}</option>
                  {FONT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value="__custom__">Personnalisée…</option>
                </select>
                {typeof etat("fontFamily").locale === "string" && !estPoliceConnue(etat("fontFamily").locale as string) ? (
                  <input
                    type="text"
                    className="champ min-h-[44px] w-28 font-mono"
                    value={etat("fontFamily").locale as string}
                    placeholder="Ma Police"
                    aria-label="Police personnalisée"
                    onChange={(e) => setTexte("fontFamily", e.target.value)}
                  />
                ) : null}
                {croix("fontFamily", "Police", etat("fontFamily").estLocale)}
              </span>
            </span>
          ) : null}
          {demande.has("fontSize") ? (
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <span className="text-[11px]">Taille</span>
                <Badge niveau={niveau} origine={etat("fontSize").origine} estLocale={etat("fontSize").estLocale} />
              </span>
              <span className="flex items-center">
                <input
                  type="number"
                  min={0}
                  className="champ min-h-[44px] w-16"
                  value={typeof etat("fontSize").locale === "number" ? (etat("fontSize").locale as number) : ""}
                  placeholder={etat("fontSize").heritee != null ? String(etat("fontSize").heritee) : "12"}
                  aria-label="Taille (px)"
                  onChange={(e) => setNombre("fontSize", e.target.value)}
                />
                {croix("fontSize", "Taille", etat("fontSize").estLocale)}
              </span>
            </span>
          ) : null}
          {demande.has("fontWeight") ? (
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <span className="text-[11px]">Graisse</span>
                <Badge niveau={niveau} origine={etat("fontWeight").origine} estLocale={etat("fontWeight").estLocale} />
              </span>
              <span className="flex items-center" role="group" aria-label="Graisse">
                {(["normal", "bold"] as const).map((v) => {
                  const actif = etat("fontWeight").estLocale && etat("fontWeight").locale === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={actif}
                      title={v === "bold" ? "Gras" : "Normal"}
                      aria-label={v === "bold" ? "Gras" : "Normal"}
                      onClick={() => {
                        if (actif) retirer("fontWeight");
                        else onChange({ ...local, fontWeight: v });
                      }}
                      className={`min-h-[44px] min-w-[44px] border px-2 text-sm first:rounded-l last:rounded-r ${
                        actif ? "border-neon bg-neon/15 font-bold text-snow" : "border-line text-fog hover:text-snow"
                      } ${v === "bold" ? "font-bold" : ""}`}
                    >
                      {v === "bold" ? "G" : "N"}
                    </button>
                  );
                })}
                {croix("fontWeight", "Graisse", etat("fontWeight").estLocale)}
              </span>
            </span>
          ) : null}
        </fieldset>
      ) : null}
      {couleurs.length > 0 ? (
        <fieldset className="flex items-end gap-1.5">
          <legend className="text-[10px] uppercase tracking-wide text-fog">Couleur</legend>
          {couleurs.map((cle) => {
            const st = etat(cle);
            const swatch =
              typeof st.locale === "string" && HEX_VALIDE.test(st.locale)
                ? st.locale
                : typeof st.heritee === "string" && HEX_VALIDE.test(st.heritee)
                  ? st.heritee
                  : "#000000";
            return (
              <span key={cle} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1">
                  <span className="text-[11px]">{cle === "color" ? "Texte" : cle === "backgroundColor" ? "Fond" : "Module"}</span>
                  <Badge niveau={niveau} origine={st.origine} estLocale={st.estLocale} />
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="color"
                    className="h-[44px] w-11 cursor-pointer rounded border border-line bg-transparent p-1"
                    value={swatch}
                    aria-label={`${STYLE_LABELS[cle]} (nuancier)`}
                    title={st.heritee != null && !st.estLocale ? `Hérité : ${String(st.heritee)}` : STYLE_LABELS[cle]}
                    onChange={(e) => setTexte(cle, e.target.value)}
                  />
                  <input
                    type="text"
                    className="champ min-h-[44px] w-20 font-mono"
                    value={typeof st.locale === "string" ? st.locale : ""}
                    placeholder={typeof st.heritee === "string" ? st.heritee : "#000000"}
                    aria-label={`${STYLE_LABELS[cle]} (hexadécimal)`}
                    onChange={(e) => setTexte(cle, e.target.value)}
                  />
                  {croix(cle, STYLE_LABELS[cle], st.estLocale)}
                </span>
              </span>
            );
          })}
        </fieldset>
      ) : null}
      {avecAlign ? (
        <fieldset className="flex items-end gap-1.5">
          <legend className="text-[10px] uppercase tracking-wide text-fog">Alignement</legend>
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <Badge niveau={niveau} origine={etat("align").origine} estLocale={etat("align").estLocale} />
            </span>
            <span className="flex items-center" role="group" aria-label="Alignement du texte">
              {(["left", "center", "right"] as const).map((v, i) => {
                const actif = etat("align").estLocale && etat("align").locale === v;
                const lettres = ["G", "C", "D"] as const;
                const noms = ["Gauche", "Centré", "Droite"] as const;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={actif}
                    title={etat("align").heritee != null && !etat("align").estLocale ? `${noms[i]} (hérité : ${String(etat("align").heritee)})` : noms[i]}
                    aria-label={noms[i]}
                    onClick={() => {
                      if (actif) retirer("align");
                      else onChange({ ...local, align: v });
                    }}
                    className={`min-h-[44px] min-w-[44px] border px-2 text-sm first:rounded-l last:rounded-r ${
                      actif ? "border-neon bg-neon/15 text-snow" : "border-line text-fog hover:text-snow"
                    }`}
                  >
                    {lettres[i]}
                  </button>
                );
              })}
              {croix("align", "Alignement", etat("align").estLocale)}
            </span>
          </span>
        </fieldset>
      ) : null}
      {nombres.map((cle) => {
        const st = etat(cle);
        return (
          <fieldset key={cle} className="flex items-end gap-1.5">
            <legend className="text-[10px] uppercase tracking-wide text-fog">{STYLE_LABELS[cle]}</legend>
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <Badge niveau={niveau} origine={st.origine} estLocale={st.estLocale} />
              </span>
              <span className="flex items-center">
                <input
                  type="number"
                  min={0}
                  className="champ min-h-[44px] w-16"
                  value={typeof st.locale === "number" ? (st.locale as number) : ""}
                  placeholder={st.heritee != null ? String(st.heritee) : "0"}
                  aria-label={STYLE_LABELS[cle]}
                  onChange={(e) => setNombre(cle, e.target.value)}
                />
                {croix(cle, STYLE_LABELS[cle], st.estLocale)}
              </span>
            </span>
          </fieldset>
        );
      })}
    </div>
  );
}
