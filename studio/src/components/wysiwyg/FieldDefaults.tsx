// Retour unitaire aux valeurs par defaut (change studio-media-templates,
// design D2) : bouton discret visible seulement quand le champ diverge de son
// defaut (issu de `defaultWidget` / `defaultScreen`). Restaurer un champ
// optionnel = supprimer la cle (retour a l'heritage) ; un champ requis =
// restaurer la valeur par defaut du type.
export function RetourDefaut({
  visible,
  titre,
  onReset,
}: {
  visible: boolean;
  titre: string;
  onReset: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="shrink-0 px-1.5 text-fog hover:text-snow"
      title={`Revenir au défaut (${titre})`}
      aria-label={`Revenir à la valeur par défaut : ${titre}`}
      onClick={onReset}
    >
      ×
    </button>
  );
}
