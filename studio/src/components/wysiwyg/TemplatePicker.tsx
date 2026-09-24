// Selecteur de template d'ecran (change studio-media-templates, design D4) :
// liste deroulante des modeles nommes (predefinis embarques + enregistres),
// miniature d'apercu, bouton « Enregistrer comme modele ». Si l'ecran courant
// est personnalise, confirmation avant remplacement. Appliquer copie le modele
// (declinaison ulterieure sans mutation) ; l'appelant clone en profondeur.
import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { Accordeon, useAccordeon } from "../Accordeon";
import { PhoneCanvas } from "./PhoneCanvas";
import {
  allScreenTemplates,
  customTemplateExists,
  customTemplateId,
  saveCustomTemplate,
} from "../../game/screen-templates";
import type { ScreenDefinition } from "../../game/types";

export function TemplatePicker({
  currentLayout,
  hasCustomizations,
  screenCourant,
  onSelectTemplate,
}: {
  currentLayout?: string;
  hasCustomizations?: boolean;
  // Ecran courant (noeud ou global) : propose « Enregistrer comme modele ».
  screenCourant?: ScreenDefinition;
  onSelectTemplate: (layoutId: string) => void;
}) {
  const [modeles, setModeles] = useState(() => allScreenTemplates());
  const [choix, setChoix] = useState(currentLayout ?? allScreenTemplates()[0]?.id ?? "");
  // Création de modèle perso = P2 (change studio-control-priority) : rare,
  // replié avec compteur.
  const [avanceOuvert, basculerAvance] = useAccordeon("template-avance", false);
  const nbPerso = modeles.filter((t) => t.id.startsWith("custom-")).length;
  useEffect(() => {
    if (currentLayout) setChoix(currentLayout);
  }, [currentLayout]);
  const modele = modeles.find((t) => t.id === choix) ?? modeles[0];

  const choisir = (layoutId: string) => {
    setChoix(layoutId);
    if (hasCustomizations && layoutId !== currentLayout) {
      if (!window.confirm("Les modifications actuelles seront perdues. Continuer ?")) return;
    }
    onSelectTemplate(layoutId);
  };

  const enregistrer = () => {
    if (!screenCourant) return;
    const nom = window.prompt("Nom du modèle :", "");
    if (nom == null || nom.trim() === "") return;
    const titre = nom.trim();
    const id = customTemplateId(titre);
    if (customTemplateExists(id)) {
      if (!window.confirm(`Le modèle « ${titre} » existe déjà. L'écraser ?`)) return;
    }
    const { persisted } = saveCustomTemplate(titre, screenCourant);
    if (!persisted) {
      window.alert("Enregistrement impossible : stockage local indisponible.");
      return;
    }
    setModeles(allScreenTemplates());
    setChoix(id);
  };

  return (
    <div className="flex flex-col gap-2" aria-label="Modèles d'écran">
      <span className="text-xs text-fog">Modèle de mise en page</span>
      <label className="flex flex-col gap-1 text-xs">
        <span className="sr-only">Choisir un modèle</span>
        <select
          className="champ min-h-[44px]"
          value={modele?.id ?? ""}
          onChange={(e) => choisir(e.target.value)}
        >
          <optgroup label="Prédéfinis">
            {modeles
              .filter((t) => !t.id.startsWith("custom-"))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </optgroup>
          {modeles.some((t) => t.id.startsWith("custom-")) ? (
            <optgroup label="Enregistrés">
              {modeles
                .filter((t) => t.id.startsWith("custom-"))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      {modele ? (
        <div className="flex items-start gap-2">
          <span className="pointer-events-none overflow-hidden rounded border border-line" style={{ width: 90, height: 120 }}>
            <PhoneCanvas screen={modele.screen} scale={0.24} showGhosts={false} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-snow">{modele.name}</span>
            <span className="block text-[11px] text-fog">{modele.description}</span>
            {modele.id === currentLayout ? <span className="puce">Appliqué</span> : null}
          </span>
        </div>
      ) : null}
      {screenCourant ? (
        <Accordeon
          id="template-avance"
          titre="Avancé"
          badge={nbPerso > 0 ? <span className="puce">{nbPerso} perso</span> : undefined}
          ouvert={avanceOuvert}
          onToggle={basculerAvance}
        >
          <button type="button" className="btn" onClick={enregistrer} title="Figer l'écran courant comme modèle réutilisable">
            <Icon name="ajouter" size={13} /> Enregistrer comme modèle
          </button>
        </Accordeon>
      ) : null}
    </div>
  );
}
