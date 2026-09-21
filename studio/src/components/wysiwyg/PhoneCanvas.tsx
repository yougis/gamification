// Canvas de previsualisation multi-viewport du WYSIWYG screen builder.
// Simple <div> stylise, pas d'iframe : meme contexte React, transform scale pour ajuster.
// Disposition : header en haut, content scrollable au centre, footer en bas,
// overlay en calque absolu. Clic sur le fond -> selection de l'ecran (null).
import type { ScreenDefinition, ZoneId } from "../../game/types";
import { screenBackgroundStyle } from "../../game/screen-utils";
import { ZoneRenderer } from "./ZoneRenderer";

// Viewports d'apercu (change studio-screen-editor, design D1) : etat d'edition
// local, jamais persiste dans le JSON. Dimensions logiques du cadre.
export type ViewportId = "phone-portrait" | "phone-landscape" | "tablet-portrait" | "tablet-landscape";

export const VIEWPORTS: { id: ViewportId; libelle: string; largeur: number; hauteur: number }[] = [
  { id: "phone-portrait", libelle: "Téléphone portrait", largeur: 375, hauteur: 667 },
  { id: "phone-landscape", libelle: "Téléphone paysage", largeur: 667, hauteur: 375 },
  { id: "tablet-portrait", libelle: "Tablette portrait", largeur: 768, hauteur: 1024 },
  { id: "tablet-landscape", libelle: "Tablette paysage", largeur: 1024, hauteur: 768 },
];

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
}: {
  screen: ScreenDefinition;
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
}) {
  const zones = screen.zones ?? {};
  const format = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[0];
  return (
    <div className="flex items-start justify-center overflow-auto p-4">
      <div style={scale && scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined}>
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
          style={{ width: format.largeur, height: format.hauteur, ...screenBackgroundStyle(screen.background) }}
        >
          {screen.background?.overlay != null ? (
            <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: screen.background.overlay }} />
          ) : null}
          {zones.header ? (
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
              />
            </div>
          ) : showGhosts && onCreateZone ? (
            <div className="relative shrink-0 border-b border-line/50 px-2 py-1">
              <FantomeZone libelle="+ En-tête" zoneId="header" onCreate={onCreateZone} />
            </div>
          ) : null}
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <ZoneRenderer
              zone={zones.content ?? { layout: "stack", widgets: [] }}
              zoneId="content"
              moduleType={moduleType}
              moduleData={moduleData}
              selected={selectedZoneId === "content"}
              selectedWidgetIndex={selectedZoneId === "content" ? selectedWidgetIndex : null}
                onSelectZone={(z) => onSelectZone?.(z)}
                onSelectWidget={onSelectWidget}
                onCommitText={onCommitText}
                onMoveWidgetAcross={onMoveWidgetAcross}
              />
          </div>
          {!zones.overlay && showGhosts && onCreateZone ? (
            <div className="relative shrink-0 px-2 py-1">
              <FantomeZone libelle="+ Surimpression" zoneId="overlay" onCreate={onCreateZone} />
            </div>
          ) : null}
          {zones.footer ? (
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
              />
            </div>
          ) : showGhosts && onCreateZone ? (
            <div className="relative shrink-0 border-t border-line/50 px-2 py-1">
              <FantomeZone libelle="+ Pied de page" zoneId="footer" onCreate={onCreateZone} />
            </div>
          ) : null}
          {zones.overlay ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6">
              <div className="w-full rounded bg-surface p-2">
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
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
