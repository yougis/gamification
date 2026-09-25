// Panneau de proprietes contextuel du WYSIWYG : affiche les proprietes selon
// la selection (rien -> panneau noeud injecte, zone -> ZoneProperties,
// widget -> proprietes specifiques, module -> config module injectee).
// Trois sections de style (change studio-screen-editor, design D3) :
// global (`global.screen.styles`), ecran (`node.screen.styles`) et contenu
// selectionne (`widgets[].styles`), avec badges d'origine via `resolveStyles`.
// Le panneau ne touche jamais au JSON : toute modification passe par callbacks.
import type { GameNode, ScreenBackground, Widget, WidgetStyles, ZoneContent, ZoneId } from "../../game/types";
import { resolveStyles } from "../../game/screen-utils";
import type { ModuleScreenPlugin } from "../../game/module-screen-plugin";
import { Accordeon, useAccordeon } from "../Accordeon";
import { ZoneProperties } from "./ZoneProperties";
import { TextWidgetProperties } from "./TextWidgetProperties";
import { ImageWidgetProperties } from "./ImageWidgetProperties";
import { ButtonWidgetProperties } from "./ButtonWidgetProperties";
import { ProgressBarProperties } from "./ProgressBarProperties";
import { SpacerWidgetProperties } from "./SpacerWidgetProperties";
import { ScreenProperties } from "./ScreenProperties";
import { StyleToolbar } from "./StyleToolbar";

// Champs de style couverts par les customs d'un plugin module.
function champsCustoms(customs: ModuleScreenPlugin["customizableStyles"]): (keyof WidgetStyles)[] {  const out: (keyof WidgetStyles)[] = [];
  if (customs.backgroundColor) out.push("backgroundColor");
  if (customs.textColor) out.push("textColor");
  if (customs.fontSize) out.push("fontSize");
  if (customs.fontFamily) out.push("fontFamily");
  if (customs.fontWeight) out.push("fontWeight");
  if (customs.borderRadius) out.push("borderRadius");
  return out;
}

/** Badge du gabarit courant pour la section « Modèle ». */
function etapeLayoutBadge(node: GameNode): React.ReactNode {
  const layout = node.screen?.layout;
  return layout ? <span className="puce">{layout}</span> : undefined;
}

// Section repliable à mémoire locale (change studio-composer-ux) : le hook
// vit dans l'enfant pour ne jamais violer les règles des hooks malgré les
// retours anticipés par branche ci-dessous.
function SectionStyle({
  id,
  titre,
  badge,
  defaut,
  children,
}: {
  id: string;
  titre: string;
  badge?: React.ReactNode;
  defaut: boolean;
  children: React.ReactNode;
}) {
  const [ouvert, basculer] = useAccordeon(id, defaut);
  return (
    <Accordeon id={id} titre={titre} badge={badge} ouvert={ouvert} onToggle={basculer}>
      {children}
    </Accordeon>
  );
}

/** Badge d'origine : personnalisé si surcharge locale, hérité sinon. */
function BadgeHeritage({ local }: { local: WidgetStyles | undefined }) {
  const perso = Object.keys(local ?? {}).length > 0;
  return (
    <span className="puce" title={perso ? "Valeurs propres à ce niveau" : "Hérité du niveau parent"}>
      {perso ? "personnalisé" : "hérité"}
    </span>
  );
}

export function PropertiesPanel({
  node,
  selectedZone,
  zone,
  selectedWidgetIndex,
  widget,
  screenSelected,
  screenBackground,
  globalStyles,
  screenStyles,
  customizableStyles,
  nodePanel,
  modulePanel,
  templatePicker,
  onPickFile,
  onPatchZone,
  onSelectWidget,
  onAddWidget,
  onRemoveWidget,
  onMoveWidget,
  onRemoveZone,
  onPatchWidget,
  onPatchBackground,
  onPatchGlobalStyles,
  onPatchScreenStyles,
}: {
  node: GameNode;
  selectedZone: ZoneId | null;
  zone: ZoneContent | null;
  selectedWidgetIndex: number | null;
  widget: Widget | null;
  screenSelected?: boolean;
  screenBackground?: ScreenBackground;
  globalStyles?: WidgetStyles;
  screenStyles?: WidgetStyles;
  customizableStyles?: ModuleScreenPlugin["customizableStyles"];
  nodePanel?: React.ReactNode;
  modulePanel?: React.ReactNode;
  // Selecteur de template au niveau du noeud (change
  // studio-screen-selection-zones) : affiche quand rien n'est selectionne.
  templatePicker?: React.ReactNode;
  // Enregistrement d'un fichier image au manifest (change
  // studio-media-templates) : retourne le chemin d'asset.
  onPickFile?: (file: File) => Promise<string>;
  onPatchZone: (zoneId: ZoneId, patch: Partial<ZoneContent>) => void;
  onSelectWidget?: (zoneId: ZoneId, index: number) => void;
  onAddWidget: (zoneId: ZoneId, widget: Widget) => void;
  onRemoveWidget: (zoneId: ZoneId, index: number) => void;
  onMoveWidget?: (zoneId: ZoneId, index: number, dir: -1 | 1) => void;
  onRemoveZone?: (zoneId: ZoneId) => void;
  onPatchWidget: (zoneId: ZoneId, index: number, widget: Widget) => void;
  onPatchBackground?: (bg: ScreenBackground) => void;
  onPatchGlobalStyles?: (styles: WidgetStyles) => void;
  onPatchScreenStyles?: (styles: WidgetStyles) => void;
}) {
  const { styles: stylesResolus, origins } = resolveStyles(globalStyles, screenStyles, widget?.styles);
  // Contenu du « Style — Écran » partagé par les branches zone et fond.
  const contenuStyleEcran = (
    <StyleToolbar
      niveau="ecran"
      local={screenStyles ?? {}}
      resolved={resolveStyles(globalStyles, screenStyles).styles}
      origins={resolveStyles(globalStyles, screenStyles).origins}
      champs={["fontFamily", "fontSize", "fontWeight", "color", "align"]}
      onChange={onPatchScreenStyles!}
    />
  );
  // Widget selectionne -> proprietes specifiques (+ config module si module).
  if (selectedZone && widget && selectedWidgetIndex != null) {
    if (widget.type === "module") {
      const champs = champsCustoms(customizableStyles ?? {});
      return (
        <div className="flex flex-col gap-3 p-2" aria-label="Propriétés du module">
          <SectionStyle id="pp-module" titre={`Module — ${node.module.type}`} defaut>
            {modulePanel ?? <p className="text-xs text-fog">Configuration du module (section 5).</p>}
          </SectionStyle>
          {champs.length > 0 && onPatchWidget ? (
            <SectionStyle id="pp-style-contenu" titre="Style — Contenu" badge={<BadgeHeritage local={widget.styles} />} defaut={false}>
              <StyleToolbar
                niveau="widget"
                local={widget.styles ?? {}}
                resolved={stylesResolus}
                origins={origins}
                champs={champs}
                onChange={(styles) => onPatchWidget(selectedZone, selectedWidgetIndex, { ...widget, styles })}
              />
            </SectionStyle>
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 p-2" aria-label={`Propriétés du widget ${widget.type}`}>
        <SectionStyle id="pp-contenu" titre="Contenu" badge={<span className="puce">{widget.type}</span>} defaut>
          {widget.type === "text" ? (
            <TextWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
          ) : null}
          {widget.type === "image" ? (
            <ImageWidgetProperties widget={widget} onPickFile={onPickFile} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
          ) : null}
          {widget.type === "button" ? (
            <ButtonWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
          ) : null}
          {widget.type === "progress" ? (
            <ProgressBarProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
          ) : null}
          {widget.type === "spacer" ? (
            <SpacerWidgetProperties widget={widget} onChange={(w) => onPatchWidget(selectedZone, selectedWidgetIndex, w)} />
          ) : null}
        </SectionStyle>
        <SectionStyle id="pp-style-contenu" titre="Style — Contenu" badge={<BadgeHeritage local={widget.styles} />} defaut={false}>
          <StyleToolbar
            niveau="widget"
            local={widget.styles ?? {}}
            resolved={stylesResolus}
            origins={origins}
            onChange={(styles) => onPatchWidget(selectedZone, selectedWidgetIndex, { ...widget, styles })}
          />
        </SectionStyle>
      </div>
    );
  }
  // Zone selectionnee -> ZoneProperties + style d'ecran.
  if (selectedZone && zone) {
    return (
      <div className="flex flex-col gap-3 p-2" aria-label="Propriétés de la zone">
        <SectionStyle
          id="pp-zone"
          titre="Zone"
          badge={<span className="puce">{zone.layout ?? "stack"} · {zone.widgets?.length ?? 0}</span>}
          defaut
        >
          <ZoneProperties
            zone={zone}
            zoneId={selectedZone}
            selectedWidgetIndex={selectedWidgetIndex}
            onPatchZone={onPatchZone}
            onSelectWidget={onSelectWidget}
            onAddWidget={onAddWidget}
            onRemoveWidget={onRemoveWidget}
            onMoveWidget={onMoveWidget}
            onRemoveZone={onRemoveZone}
          />
        </SectionStyle>
        {onPatchScreenStyles ? (
          <SectionStyle id="pp-style-ecran" titre="Style — Écran" badge={<BadgeHeritage local={screenStyles} />} defaut={false}>
            {contenuStyleEcran}
          </SectionStyle>
        ) : null}
      </div>
    );
  }
  // Ecran selectionne (clic sur le fond du canvas) -> fond + style d'ecran.
  if (screenSelected && onPatchBackground) {
    return (
      <div className="flex flex-col gap-3">
        <SectionStyle
          id="pp-fond"
          titre="Fond"
          badge={screenBackground ? <span className="puce">{screenBackground.type}</span> : undefined}
          defaut
        >
          <ScreenProperties background={screenBackground} onPickFile={onPickFile} onChange={onPatchBackground} />
        </SectionStyle>
        {onPatchScreenStyles ? (
          <SectionStyle id="pp-style-ecran" titre="Style — Écran" badge={<BadgeHeritage local={screenStyles} />} defaut={false}>
            {contenuStyleEcran}
          </SectionStyle>
        ) : null}
      </div>
    );
  }
  // Rien de selectionne -> panneau noeud + template + style global.
  return (
    <div className="flex flex-col gap-3 p-2" aria-label="Propriétés du nœud">
      {nodePanel ?? <p className="text-xs text-fog">Propriétés du nœud (section 3.8).</p>}
      {templatePicker ? (
        <SectionStyle
          id="pp-modele"
          titre="Modèle"
          badge={etapeLayoutBadge(node)}
          defaut={false}
        >
          {templatePicker}
        </SectionStyle>
      ) : null}
      {onPatchGlobalStyles ? (
        <SectionStyle id="pp-style-global" titre="Style — Global" badge={undefined} defaut={false}>
          <p className="text-[11px] text-fog">Défauts pour tout le jeu, surchargeables par écran puis par widget.</p>
          <StyleToolbar
            niveau="global"
            local={globalStyles ?? {}}
            resolved={globalStyles ?? {}}
            origins={{}}
            champs={["fontFamily", "fontSize", "fontWeight", "color", "align"]}
            onChange={onPatchGlobalStyles}
          />
        </SectionStyle>
      ) : null}
    </div>
  );
}
