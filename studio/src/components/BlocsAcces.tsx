// Blocs d'accès de l'écran global (change studio-home-wysiwyg) : aperçu
// dérivé des présentations actives — carte (si MAP), boîte à outils (même
// règle que l'icône persistante : TOOLBOX + objets), messages d'info
// (étapes INFO du jeu). Lecture seule : clic = infobulle de rappel, jamais
// de sélection ; badge « aperçu » systématique pour lever l'ambiguïté avec
// les widgets éditables. Même charte que le canvas.
import { toolboxIconVisible } from "../game/inventory";
import type { Game } from "../game/types";
import { Icon } from "./icons";

export function BlocsAcces({ game }: { game: Game }) {
  const presentations = game.global?.presentation ?? [];
  const avecCarte = presentations.includes("MAP");
  const avecInventaire = toolboxIconVisible(game, null);
  const infos = game.nodes.filter((n) => n.module.type === "INFO" && !n.randomPool);
  if (!avecCarte && !avecInventaire && infos.length === 0) return null;
  return (
    <div className="shrink-0 border-t border-rule bg-surface px-2 py-1" aria-label="Accès transverses (aperçu)">
      <div className="flex flex-wrap items-center gap-2">
        <span className="puce" title="Blocs dérivés de la configuration — lecture seule, jamais sélectionnés">aperçu</span>
        {avecCarte && (
          <span className="puce" title="Carte affichée car MAP est coché (dérivé, non éditable ici)">
            <Icon name="lieu" size={13} /> Carte
          </span>
        )}
        {avecInventaire && (
          <span className="puce" title={`Boîte à outils : ${(game.objects ?? []).length} objet(s) — règle d'affichage inchangée`}>
            <Icon name="package" size={13} /> Inventaire ({(game.objects ?? []).length})
          </span>
        )}
        {infos.length > 0 && (
          <span className="puce" title={`${infos.length} étape(s) INFO dans le jeu`}>
            <Icon name="message" size={13} /> Infos ({infos.length})
          </span>
        )}
      </div>
    </div>
  );
}
