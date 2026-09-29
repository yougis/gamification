// Canvas de previsualisation multi-viewport du WYSIWYG screen builder.
// Simple <div> stylise, pas d'iframe : meme contexte React, transform scale pour ajuster.
// Disposition : header en haut, content scrollable au centre, footer en bas,
// overlay en calque absolu. Clic sur le fond -> selection de l'ecran (null).
import type { Game, ScreenDefinition, Widget, ZoneId } from "../../game/types";
import type { LigneApercu } from "../../game/apercu-accueil";
import type { CarteSimu } from "./widgets/CarteInteractiveSimu";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { couleurTexteDefaut, paginateContent, screenBackgroundStyle } from "../../game/screen-utils";
import { ZoneRenderer } from "./ZoneRenderer";
import { WidgetRenderer } from "./WidgetRenderer";
import { Icon } from "../icons";

// Viewports d'apercu (change studio-screen-editor, design D1) : etat d'edition
// local, jamais persiste dans le JSON. Dimensions logiques du cadre.
export type ViewportId = "phone-portrait" | "phone-landscape" | "tablet-portrait" | "tablet-landscape";

export const VIEWPORTS: { id: ViewportId; libelle: string; largeur: number; hauteur: number }[] = [
  { id: "phone-portrait", libelle: "Téléphone portrait", largeur: 375, hauteur: 667 },
  { id: "phone-landscape", libelle: "Téléphone paysage", largeur: 667, hauteur: 375 },
  { id: "tablet-portrait", libelle: "Tablette portrait", largeur: 768, hauteur: 1024 },
  { id: "tablet-landscape", libelle: "Tablette paysage", largeur: 1024, hauteur: 768 },
];

// Calques (change carte-fond-flottant) : strate active pour le routage des
// pointeurs en édition + visibilité par strate. Persistance locale côté
// appelant, jamais dans le JSON. Absent = comportement historique.
export type CalqueId = "fond" | "flottant" | "overlay";
export interface Calques {
  actif: CalqueId;
  masques: Record<CalqueId, boolean>;
}
export const CALQUES_DEFAUT: Calques = {
  actif: "flottant",
  masques: { fond: false, flottant: false, overlay: false },
};

// Slot fantome : zone absente dessinee en pointilles, jamais serialisee.
// Un clic cree la zone vide et la selectionne (via `onCreateZone`).
function FantomeZone({ libelle, zoneId, onCreate }: { libelle: string; zoneId: ZoneId; onCreate: (zoneId: ZoneId) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCreate(zoneId);
      }}
      aria-label={`Créer la zone ${libelle.replace("+ ", "").toLowerCase()}`}
      title="Créer cette zone"
      className="w-full rounded border border-dashed border-line px-3 py-2 text-center text-xs text-fog hover:border-neon hover:text-snow"
    >
      {libelle}
    </button>
  );
}

export function PhoneCanvas({
  screen,
  game,
  lignesApercu,
  moduleType,
  moduleData,
  selectedZoneId,
  selectedWidgetIndex,
  viewport = "phone-portrait",
  scale,
  showGhosts = true,
  onSelectZone,
  onSelectWidget,
  onCommitText,
  onMoveWidgetAcross,
  onCreateZone,
  renderModule,
  dissimulationJoueur,
  cleContexte,
  couleurMessage,
  afficherPagination = true,
  carteSimu,
  calques,
}: {
  screen: ScreenDefinition;
  // Jeu courant (change widget-cartographie) : contexte de lecture pour les
  // widgets lies (carte : positions, fonds). Absent = apercu sans donnees.
  game?: Game;
  // Snapshot d'essai (change home-phonecanvas-unique) : lignes lues par la
  // carte (pastille d'état), jamais simulées ici. Absent = aperçu statique.
  lignesApercu?: LigneApercu[];
  moduleType?: string;
  moduleData?: Record<string, unknown>;
  selectedZoneId?: ZoneId | null;
  selectedWidgetIndex?: number | null;
  viewport?: ViewportId;
  scale?: number;
  // Zones fantomes pour header/footer/overlay absents (defaut : visibles).
  // Passer false pour les miniatures (ex. TemplatePicker).
  showGhosts?: boolean;
  onSelectZone?: (zoneId: ZoneId | null) => void;
  onSelectWidget?: (zoneId: ZoneId, index: number) => void;
  onCommitText?: (zoneId: ZoneId, index: number, text: string) => void;
  onMoveWidgetAcross?: (fromZone: ZoneId, fromIndex: number, toZone: ZoneId, toIndex: number | "end") => void;
  // Clic sur un fantome : cree la zone vide (jamais appele sans fantome visible).
  onCreateZone?: (zoneId: ZoneId) => void;
  // Slot module remplaçable (change studio-player-preview), transmis aux
  // zones. Absent = aperçu éditeur.
  renderModule?: (widget: Widget) => ReactNode;
  // Dissimulation joueur (change studio-overlay-fermable) : terminal simulé
  // uniquement. Quand la zone overlay porte `fermable`, le clic sur le fond
  // semi-transparent masque la surimpression et une icône « message »
  // persistante la réaffiche (état conservé). `cleContexte` (ex. id du nœud)
  // réinitialise le masquage quand le contexte change (reprise = affichée).
  dissimulationJoueur?: boolean;
  cleContexte?: string;
  // Accent de l'icône « message » (branding résolu par l'appelant).
  couleurMessage?: string;
  // Pagination des sous-pages (change screen-subpages) : onglets + nav
  // active. `false` pour les miniatures (ex. TemplatePicker).
  afficherPagination?: boolean;
  // Carte simu (change carte-joueur-navigable, phase 3) : carte interactive
  // dans le terminal simulé. Absent = aperçu auteur statique.
  carteSimu?: CarteSimu;
  // Calques (change carte-fond-flottant) : routage pointeurs + visibilité
  // par strate en édition. Absent = comportement historique.
  calques?: Calques;
}) {
  const zones = screen.zones ?? {};
  const format = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[0];
  // Masquage temporaire de la surimpression (change studio-overlay-fermable) :
  // oeil d'edition, etat local jamais persiste. Visible uniquement en edition
  // (onSelectZone present) : ni miniatures ni terminal joueur.
  const [overlayMasquee, setOverlayMasquee] = useState(false);
  const oeil = onSelectZone != null;
  // Masquage joueur : état session en mémoire, jamais persisté. Réinitialisé
  // quand le contexte change (nœud suivant, reprise = overlay affichée).
  const [masqueJoueur, setMasqueJoueur] = useState(false);
  useEffect(() => {
    setMasqueJoueur(false);
  }, [cleContexte]);
  const overlayFermable = zones.overlay?.fermable === true;
  const dissimulable = dissimulationJoueur === true && overlayFermable;
  // Sous-pages de content (change screen-subpages) : état local d'édition,
  // jamais persisté. La sélection suit la page (et inversement) ; une
  // nouvelle page (ajout auto à la création d'un widget module/image)
  // s'affiche aussitôt ; reset au changement de contexte.
  const widgetsContenu = zones.content?.widgets ?? [];
  const sousPages = paginateContent(widgetsContenu);
  const [pageContenu, setPageContenu] = useState(0);
  const nbPagesRef = useRef(sousPages.length);
  useEffect(() => {
    setPageContenu(0);
    nbPagesRef.current = sousPages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleContexte]);
  useEffect(() => {
    if (sousPages.length > nbPagesRef.current) setPageContenu(sousPages.length - 1);
    nbPagesRef.current = sousPages.length;
  }, [sousPages.length]);
  const indexSur = Math.min(pageContenu, sousPages.length - 1);
  const decalage = sousPages.slice(0, indexSur).reduce((n, p) => n + p.length, 0);
  useEffect(() => {
    if (selectedZoneId !== "content" || selectedWidgetIndex == null) return;
    let cumul = 0;
    for (let p = 0; p < sousPages.length; p++) {
      if (selectedWidgetIndex < cumul + sousPages[p].length) {
        if (p !== indexSur) setPageContenu(p);
        break;
      }
      cumul += sousPages[p].length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId, selectedWidgetIndex, widgetsContenu.length]);
  const paginer = afficherPagination && sousPages.length > 1;
  const contextePage = { index: indexSur, total: sousPages.length };
  // Borne viewport pour le fit image/module (change screen-subpages) :
  // cadre moins chrome (zones, onglets, marges), plancher lisible.
  const hauteurMaxMedia = Math.max(140, format.hauteur - 220);
  // Couleur de texte par défaut (change studio-lot-correctifs) : contraste
  // calculé sur le fond résolu, héritée par tous les descendants sans
  // couleur explicite (couleurs auteur verbatim conservées).
  const couleurDefaut = couleurTexteDefaut(screen.background);
  // Couche plein écran (change studio-widgets-pleinecran) : widgets
  // `pleinEcran` des zones header/content/footer, sortis du flux et peints
  // sur le cadre entier (ordre des zones puis du tableau : dernier = dessus),
  // sous la zone overlay. Indices pleins (décalage sous-pages inclus pour
  // content) : callbacks bruts, comme les zones. En mode auteur la couche est
  // non-interactive (le fantôme en zone sélectionne) ; en lecture seule les
  // widgets restent actifs (ex. carte simu du terminal).
  // Strate fond (change carte-fond-flottant) : les widgets `pleinEcran` +
  // `arrierePlan` peignent en PREMIER (sous le flottant) au lieu de la couche
  // par-dessus ; le flottant (zones) reste transparent avec creux cliquables
  // vers le fond hors édition (voir prop `flottant` transmise aux zones).
  const edition = onSelectZone != null || onCreateZone != null;
  type VisuelSorti = { zoneId: ZoneId; widget: Widget; index: number; fond: boolean };
  const visuelsPleinEcran: VisuelSorti[] = [];
  for (const zid of ["header", "content", "footer"] as ZoneId[]) {
    const rendus = zid === "content" ? (sousPages[indexSur] ?? []) : (zones[zid]?.widgets ?? []);
    const base = zid === "content" ? decalage : 0;
    rendus.forEach((w, i) => {
      if ((w as { pleinEcran?: boolean }).pleinEcran !== true) return;
      const fond = (w as { arrierePlan?: boolean }).arrierePlan === true;
      visuelsPleinEcran.push({ zoneId: zid, widget: w, index: base + i, fond });
    });
  }
  const dndBreakout = onMoveWidgetAcross != null;
  // Strates (change carte-fond-flottant) : `cal` vaut les défauts quand la
  // prop est absente — comportement strictement historique dans ce cas.
  const cal = calques ?? CALQUES_DEFAUT;
  const masque = (c: CalqueId) => cal.masques[c] === true;
  const fondPresent = visuelsPleinEcran.some((v) => v.fond);
  // Interactivité du fond : lecture seule (terminal) comme avant, plus
  // édition ciblée sur le calque fond via le sélecteur de calques.
  const fondInteractif = !edition || cal.actif === "fond";
  // Transparence des zones : legacy hors édition, ou édition ciblée fond
  // (les clics traversent vers la carte). Widgets opaques sauf traversée
  // explicite (édition ciblée fond : tout traverse).
  const zonesTransparentes = (!edition && fondPresent) || (edition && fondPresent && cal.actif === "fond");
  const widgetsTraversants = edition && fondPresent && cal.actif === "fond";
  const rendreSorti = ({ zoneId, widget, index }: VisuelSorti, interactif: boolean) => (
    <div key={`${zoneId}-${index}`} className={`absolute inset-0 h-full ${interactif ? "" : "pointer-events-none"}`}>
      <WidgetRenderer
        widget={widget}
        index={index}
        zoneId={zoneId}
        moduleType={moduleType}
        moduleData={moduleData}
        selected={selectedZoneId === zoneId && selectedWidgetIndex === index}
        deplacable={dndBreakout && widget.type === "text"}
        onSelect={(i) => onSelectWidget?.(zoneId, i)}
        onCommitText={onCommitText}
        renderModule={renderModule}
        contextePage={contextePage}
        hauteurMaxMedia={hauteurMaxMedia}
        game={game}
        lignesApercu={lignesApercu}
        carteSimu={carteSimu}
        pleinEcran
        onDropBefore={dndBreakout ? (fz, fi, tz, ti) => onMoveWidgetAcross?.(fz, fi, tz, ti) : undefined}
      />
    </div>
  );
  const coucheFond =
    !fondPresent || masque("fond") ? null : (
      <div className="absolute inset-0" aria-label="Arrière-plan">
        {visuelsPleinEcran.filter((v) => v.fond).map((v) => rendreSorti(v, fondInteractif))}
      </div>
    );
  const couchePleinEcran =
    !visuelsPleinEcran.some((v) => !v.fond) ? null : (
      <div className="absolute inset-0" aria-label="Widgets plein écran">
        {visuelsPleinEcran.filter((v) => !v.fond).map((v) => rendreSorti(v, !edition))}
      </div>
    );

  const cadre = (
    <div
      role="button"
      tabIndex={0}
      aria-label="Écran du nœud"
      onClick={() => onSelectZone?.(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectZone?.(null);
        }
      }}
      className="relative flex flex-col overflow-hidden rounded-[2rem] border-4 border-line bg-surface text-snow"
      style={{ width: format.largeur, height: format.hauteur, ...screenBackgroundStyle(screen.background), ...(couleurDefaut ? { color: couleurDefaut } : {}) }}
    >
          {screen.background?.overlay != null ? (
            <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: screen.background.overlay }} />
          ) : null}
          {coucheFond}
          {!masque("flottant") && zones.header ? (
            <div className="relative shrink-0 border-b border-line/50">
              <ZoneRenderer
                zone={zones.header}
                zoneId="header"
                moduleType={moduleType}
                moduleData={moduleData}
                selected={selectedZoneId === "header"}
                selectedWidgetIndex={selectedZoneId === "header" ? selectedWidgetIndex : null}
                onSelectZone={(z) => onSelectZone?.(z)}
                onSelectWidget={onSelectWidget}
                onCommitText={onCommitText}
                onMoveWidgetAcross={onMoveWidgetAcross}
                renderModule={renderModule}
                contextePage={contextePage}
                hauteurMaxMedia={hauteurMaxMedia}
                game={game}
                lignesApercu={lignesApercu}
                flottant={zonesTransparentes}
                traversant={widgetsTraversants}
                carteSimu={carteSimu}
                masquerPleinEcran
              />
            </div>
          ) : !masque("flottant") && showGhosts && onCreateZone ? (
            <div className="relative shrink-0 border-b border-line/50 px-2 py-1">
              <FantomeZone libelle="+ En-tête" zoneId="header" onCreate={onCreateZone} />
            </div>
          ) : null}
          {!masque("flottant") ? (
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            {paginer ? (
              <div
                className="flex items-center gap-1 px-2 pt-1"
                role="tablist"
                aria-label="Sous-pages du contenu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="btn min-h-7 px-2 text-[10px]"
                  disabled={indexSur === 0}
                  onClick={(e) => { e.stopPropagation(); setPageContenu(indexSur - 1); }}
                  aria-label="Sous-page précédente"
                >
                  ←
                </button>
                {sousPages.map((_, p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={p === indexSur}
                    aria-label={`Sous-page ${p + 1}`}
                    onClick={(e) => { e.stopPropagation(); setPageContenu(p); }}
                    className={`min-h-7 min-w-7 rounded px-1 text-[10px] ${p === indexSur ? "bg-neon font-bold text-canvas" : "text-fog hover:text-snow"}`}
                  >
                    {p + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn min-h-7 px-2 text-[10px]"
                  disabled={indexSur >= sousPages.length - 1}
                  onClick={(e) => { e.stopPropagation(); setPageContenu(indexSur + 1); }}
                  aria-label="Sous-page suivante"
                >
                  →
                </button>
              </div>
            ) : null}
            <ZoneRenderer
              zone={{ layout: zones.content?.layout ?? "stack", widgets: sousPages[indexSur] ?? [] }}
              zoneId="content"
              moduleType={moduleType}
              moduleData={moduleData}
              selected={selectedZoneId === "content"}
              selectedWidgetIndex={selectedZoneId === "content" && selectedWidgetIndex != null ? selectedWidgetIndex - decalage : null}
              onSelectZone={(z) => onSelectZone?.(z)}
              onSelectWidget={(i) => onSelectWidget?.(decalage + i)}
              onCommitText={(z, i, text) => onCommitText?.(z, decalage + i, text)}
              onMoveWidgetAcross={(fz, fi, tz, ti) =>
                onMoveWidgetAcross?.(
                  fz,
                  fz === "content" ? fi + decalage : fi,
                  tz,
                  tz === "content" ? (ti === "end" ? widgetsContenu.length : ti + decalage) : ti,
                )
              }
                renderModule={renderModule}
                contextePage={contextePage}
                hauteurMaxMedia={hauteurMaxMedia}
                game={game}
                lignesApercu={lignesApercu}
                flottant={zonesTransparentes}
                traversant={widgetsTraversants}
                carteSimu={carteSimu}
                masquerPleinEcran
            />
          </div>
          ) : null}
          {!zones.overlay && showGhosts && onCreateZone ? (
            <div className="relative shrink-0 px-2 py-1">
              <FantomeZone libelle="+ Surimpression" zoneId="overlay" onCreate={onCreateZone} />
            </div>
          ) : null}
          {!masque("flottant") && zones.footer ? (
            <div className="relative shrink-0 border-t border-line/50">
              <ZoneRenderer
                zone={zones.footer}
                zoneId="footer"
                moduleType={moduleType}
                moduleData={moduleData}
                selected={selectedZoneId === "footer"}
                selectedWidgetIndex={selectedZoneId === "footer" ? selectedWidgetIndex : null}
                onSelectZone={(z) => onSelectZone?.(z)}
                onSelectWidget={onSelectWidget}
                onCommitText={onCommitText}
                onMoveWidgetAcross={onMoveWidgetAcross}
                renderModule={renderModule}
                contextePage={contextePage}
                hauteurMaxMedia={hauteurMaxMedia}
                game={game}
                lignesApercu={lignesApercu}
                flottant={zonesTransparentes}
                traversant={widgetsTraversants}
                carteSimu={carteSimu}
                masquerPleinEcran
              />
            </div>
          ) : !masque("flottant") && showGhosts && onCreateZone ? (
            <div className="relative shrink-0 border-t border-line/50 px-2 py-1">
              <FantomeZone libelle="+ Pied de page" zoneId="footer" onCreate={onCreateZone} />
            </div>
          ) : null}
          {couchePleinEcran}
          {zones.overlay && !masque("overlay") && (!overlayMasquee || !oeil) && !(dissimulable && masqueJoueur) ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/50 p-6"
              onClick={dissimulable ? () => setMasqueJoueur(true) : undefined}
              role={dissimulable ? "button" : undefined}
              tabIndex={dissimulable ? 0 : undefined}
              aria-label={dissimulable ? "Masquer la surimpression" : undefined}
              onKeyDown={
                dissimulable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMasqueJoueur(true);
                      }
                    }
                  : undefined
              }
            >
              <div
                className="relative w-full rounded bg-surface p-2"
                style={{ color: "var(--ink)" }}
                onClick={dissimulable ? (e) => e.stopPropagation() : undefined}
              >
                {oeil ? (
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded border border-line bg-surface-2 p-1 text-fog hover:text-snow"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverlayMasquee(true);
                    }}
                    title="Masquer temporairement la surimpression (œil d'édition, non persisté)"
                    aria-label="Masquer temporairement la surimpression"
                  >
                    <Icon name="oeil" size={13} />
                  </button>
                ) : null}
                <ZoneRenderer
                  zone={zones.overlay}
                  zoneId="overlay"
                  moduleType={moduleType}
                moduleData={moduleData}
                  selected={selectedZoneId === "overlay"}
                  selectedWidgetIndex={selectedZoneId === "overlay" ? selectedWidgetIndex : null}
                  onSelectZone={(z) => onSelectZone?.(z)}
                  onSelectWidget={onSelectWidget}
                  onCommitText={onCommitText}
                  onMoveWidgetAcross={onMoveWidgetAcross}
                  renderModule={renderModule}
                  hauteurMaxMedia={hauteurMaxMedia}
                  game={game}
                  lignesApercu={lignesApercu}
                  flottant={zonesTransparentes}
                  traversant={widgetsTraversants}
                  carteSimu={carteSimu}
                />
              </div>
            </div>
          ) : null}
          {zones.overlay && overlayMasquee && oeil ? (
            <div className="relative shrink-0 px-2 py-1">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-line px-3 py-1.5 text-center text-xs text-fog hover:border-neon hover:text-snow"
                onClick={(e) => {
                  e.stopPropagation();
                  setOverlayMasquee(false);
                  onSelectZone?.("overlay");
                }}
                title="Réafficher la surimpression"
                aria-label="Réafficher la surimpression masquée"
              >
                <Icon name="oeil" size={13} /> Surimpression masquée — réafficher
              </button>
            </div>
          ) : null}
          {zones.overlay && dissimulable && masqueJoueur ? (
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-full border border-line bg-surface-2 p-2 shadow-lg hover:border-neon"
              style={{ color: couleurMessage ?? "var(--couleur-accent)" }}
              onClick={(e) => {
                e.stopPropagation();
                setMasqueJoueur(false);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              title="Réafficher la surimpression"
              aria-label="Réafficher la surimpression masquée"
            >
              <Icon name="message" size={16} />
            </button>
          ) : null}
        </div>
  );
  // Échelle ajustée (paysage plein cadre, miniatures) : la boîte occupe
  // exactement les dimensions mises à l'échelle — aucun défilement, le cadre
  // reste intégralement visible et centré.
  if (scale != null && scale !== 1) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="shrink-0" style={{ width: format.largeur * scale, height: format.hauteur * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: format.largeur, height: format.hauteur }}>
            {cadre}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-center overflow-auto p-4">
      {cadre}
    </div>
  );
}
