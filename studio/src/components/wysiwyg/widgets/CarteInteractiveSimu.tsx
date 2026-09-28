// Carte interactive simulee du terminal joueur (change
// carte-joueur-navigable, phase 3) : tuiles via le proxy d'apercu,
// position SIMULEE (jamais le GPS du poste), pan/zoom locaux, clic
// marqueur -> volet simu (titre + Ouvrir). Composant dedie (jamais
// MapView reutilisee) : aucune ecriture JSON, aucun event reel —
// naviguer ne produit rien, Ouvrir passe par onOuvrir (simu existant).
import { useMemo, useRef, useState } from "react";
import { computeBbox } from "../../../game/mcp";
import { bornesTuile, zoomApercu, type BboxTuiles } from "../../../game/pack";
import { iconePoiDefaut, marqueursCarte } from "../../../game/map-widget";
import type { LigneApercu } from "../../../game/apercu-accueil";
import type { Game, MapWidget } from "../../../game/types";

export interface CarteSimu {
  /** Position simulee lue de l'etat d'essai (null = non renseignee). */
  position: { lat: number; lng: number } | null;
  /** Éligibilité simu (tête de file / unlocked de l'essai). */
  eligible: (id: string) => boolean;
  /** Présentation d'étape simu (mêmes transitions + event SIMULÉ). */
  onOuvrir: (id: string) => void;
}

const SEUIL_TAP_PX = 8;

export function CarteInteractiveSimu({ widget, game, lignes, simu }: {
  widget: MapWidget;
  game: Game;
  lignes?: LigneApercu[];
  simu: CarteSimu;
}) {
  const marqueurs = useMemo(() => marqueursCarte(game), [game]);
  const etats = useMemo(() => new Map((lignes ?? []).map((l) => [l.id, l])), [lignes]);
  const bbox = useMemo(() => computeBbox(game), [game]);
  const map = game.global?.map ?? {};
  const [centre, setCentre] = useState({ x: 0.5, y: 0.5 });
  const [echelle, setEchelle] = useState(1);
  const [selection, setSelection] = useState<string | null>(null);
  const [tuilesKO, setTuilesKO] = useState(false);
  const glisse = useRef<{ x0: number; y0: number; cx: number; cy: number; bouge: boolean } | null>(null);
  const cadreRef = useRef<HTMLDivElement>(null);

  const enLigne = typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine;
  // Fenêtre visible en relatif 0..1, puis convertie en lat/lng via la bbox.
  const demi = 0.5 / echelle;
  const fenetreRel = {
    x0: centre.x - demi,
    x1: centre.x + demi,
    y0: centre.y - demi,
    y1: centre.y + demi,
  };
  const versRel = (lat: number, lng: number): { x: number; y: number } | null => {
    if (!bbox) return null;
    const dLat = Math.max(bbox.maxLat - bbox.minLat, 1e-9);
    const dLng = Math.max(bbox.maxLng - bbox.minLng, 1e-9);
    return { x: (lng - bbox.minLng) / dLng, y: 1 - (lat - bbox.minLat) / dLat };
  };
  const fenetreLatLng: BboxTuiles | null = useMemo(() => {
    if (!bbox) return null;
    const dLat = Math.max(bbox.maxLat - bbox.minLat, 1e-9);
    const dLng = Math.max(bbox.maxLng - bbox.minLng, 1e-9);
    const lng0 = bbox.minLng + fenetreRel.x0 * dLng;
    const lng1 = bbox.minLng + fenetreRel.x1 * dLng;
    const lat1 = bbox.minLat + (1 - fenetreRel.y0) * dLat;
    const lat0 = bbox.minLat + (1 - fenetreRel.y1) * dLat;
    return { minLat: lat0, minLng: lng0, maxLat: lat1, maxLng: lng1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox, centre.x, centre.y, echelle]);
  const grille = useMemo(() => {
    if (!fenetreLatLng || !enLigne || tuilesKO) return null;
    return zoomApercu(fenetreLatLng, map.minZoom ?? 12, map.maxZoom ?? 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fenetreLatLng, enLigne, tuilesKO, map.minZoom, map.maxZoom]);

  const projeter = (rel: { x: number; y: number }): { x: number; y: number } => ({
    x: ((rel.x - fenetreRel.x0) / Math.max(fenetreRel.x1 - fenetreRel.x0, 1e-9)) * 100,
    y: ((rel.y - fenetreRel.y0) / Math.max(fenetreRel.y1 - fenetreRel.y0, 1e-9)) * 100,
  });
  // Fond schématique de repli (même code que l'aperçu auteur).
  const fondUni = widget.background === "solid" ? "#1a1a2e" : "#14141f";

  const demarrerGlisse = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.fond) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    glisse.current = { x0: e.clientX, y0: e.clientY, cx: centre.x, cy: centre.y, bouge: false };
  };
  const poursuivreGlisse = (e: React.PointerEvent) => {
    const g = glisse.current;
    if (!g || !cadreRef.current) return;
    const rect = cadreRef.current.getBoundingClientRect();
    const dx = (e.clientX - g.x0) / Math.max(rect.width, 1);
    const dy = (e.clientY - g.y0) / Math.max(rect.height, 1);
    if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > SEUIL_TAP_PX) g.bouge = true;
    if (g.bouge) setCentre({ x: g.cx - dx / echelle, y: g.cy - dy / echelle });
  };
  const finirGlisse = () => {
    glisse.current = null;
  };

  const sel = selection != null ? marqueurs.find((m) => m.id === selection) ?? null : null;
  const selEtat = sel ? (etats.get(sel.id)?.etat ?? "LOCKED") : null;

  return (
    <div className="w-full" aria-label="Carte simulée interactive">
      <div className="mb-1 flex items-center gap-1">
        <button className="btn min-h-9" title="Zoom arrière" aria-label="Zoom arrière" onClick={() => setEchelle((e) => Math.max(1, e / 1.25))}>−</button>
        <button className="btn min-h-9" title="Zoom avant" aria-label="Zoom avant" onClick={() => setEchelle((e) => Math.min(8, e * 1.25))}>+</button>
        <button className="btn min-h-9" title="Recentrer" aria-label="Recentrer la carte" onClick={() => { setCentre({ x: 0.5, y: 0.5 }); setEchelle(1); }}>◎</button>
        <span className="puce">SIMULÉ</span>
        {grille ? <span className="puce" title="Tuiles chargées en ligne pour contrôle visuel ; le pack joueur reste offline">aperçu en ligne</span> : null}
      </div>
      <div
        ref={cadreRef}
        className="relative h-40 w-full cursor-grab overflow-hidden rounded border border-line active:cursor-grabbing"
        style={grille ? undefined : { background: fondUni }}
        onPointerDown={demarrerGlisse}
        onPointerMove={poursuivreGlisse}
        onPointerUp={finirGlisse}
        onPointerCancel={finirGlisse}
      >
        {grille
          ? Array.from({ length: (grille.x1 - grille.x0 + 1) * (grille.y1 - grille.y0 + 1) }, (_, i) => {
              const x = grille.x0 + (i % (grille.x1 - grille.x0 + 1));
              const y = grille.y0 + Math.floor(i / (grille.x1 - grille.x0 + 1));
              const b = bornesTuile(grille.z, x, y);
              const r0 = versRel(b.maxLat, b.minLng);
              const r1 = versRel(b.minLat, b.maxLng);
              if (!r0 || !r1) return null;
              const p0 = projeter(r0);
              const p1 = projeter(r1);
              return (
                <img
                  key={`${x}/${y}`}
                  src={`/tiles/${grille.z}/${x}/${y}.png`}
                  alt=""
                  draggable={false}
                  data-fond="1"
                  className="absolute"
                  style={{ left: `${p0.x}%`, top: `${p0.y}%`, width: `${Math.max(p1.x - p0.x, 0)}%`, height: `${Math.max(p1.y - p0.y, 0)}%` }}
                  onError={() => setTuilesKO(true)}
                />
              );
            })
          : null}
        {marqueurs.map((m) => {
          // Marqueurs déjà en relatif 0..100 (même moteur que l'aperçu auteur).
          const p = projeter({ x: m.x / 100, y: m.y / 100 });
          const etat = etats.get(m.id)?.etat ?? "LOCKED";
          return (
            <button
              key={m.id}
              className="absolute rounded-full border border-neon bg-surface px-1 text-[11px] text-snow"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-100%)" }}
              title={`${m.id} — ${etat}`}
              aria-label={`POI ${m.id}, ${etat}`}
              onClick={(e) => { e.stopPropagation(); setSelection(selection === m.id ? null : m.id); }}
            >
              {iconePoiDefaut(etat as never).slice(0, 1).toUpperCase()}
            </button>
          );
        })}
        {marqueurs.length === 0 ? (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-fog">Aucune étape positionnée</span>
        ) : null}
        {simu.position && bbox ? (
          <span
            className="absolute h-3 w-3 rounded-full"
            style={{ background: "#4DA3FF", ...(() => { const p = projeter(versRel(simu.position!.lat, simu.position!.lng)!); return { left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }; })() }}
            title={`Position simulée ${simu.position.lat}, ${simu.position.lng} (SIMULÉ, jamais le GPS du poste)`}
            aria-label="Position simulée"
          />
        ) : null}
      </div>
      {sel && selEtat ? (
        <div className="carte mt-1 p-2" aria-label={`Détail simulé — ${sel.id}`}>
          <p className="font-bold text-[12px]">{sel.id} <span className="puce ml-1">SIMULÉ</span></p>
          <p className="text-[11px] text-fog">État simulé : {selEtat}</p>
          <div className="mt-1 flex gap-1">
            {simu.eligible(sel.id) ? (
              <button className="btn-primaire min-h-9" onClick={() => simu.onOuvrir(sel.id)}>Ouvrir</button>
            ) : (
              <button className="btn min-h-9" disabled title="Étape verrouillée dans la simulation">Verrouillé</button>
            )}
            <button className="btn min-h-9" onClick={() => setSelection(null)}>Fermer</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
