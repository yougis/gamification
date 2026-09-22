// Accordéon unique du Studio (change studio-composer-ux) : en-tête
// chevron + titre + badge résumé, contenu repliable, mémoire locale.
// Piloté par le parent (ouvert/onToggle) ; `useAccordeon` fournit
// l'état « contexte seul puis mémoire » persisté en localStorage.
import { useState } from "react";
import { Icon } from "./icons";

const CLE = "geoplay-accordeons-v1";

function lire(): Record<string, boolean> {
  try {
    if (typeof localStorage === "undefined") return {};
    return (JSON.parse(localStorage.getItem(CLE) ?? "{}") as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

function ecrire(id: string, ouvert: boolean) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CLE, JSON.stringify({ ...lire(), [id]: ouvert }));
  } catch {
    /* stockage indisponible : session mémoire uniquement */
  }
}

/**
 * État d'une section : mémoire locale si connue, sinon défaut du contexte
 * (ex. section pertinente à la sélection). Le toggle persiste aussitôt.
 */
export function useAccordeon(id: string, ouvertParDefaut: boolean): [boolean, () => void] {
  const [ouvert, setOuvert] = useState<boolean>(() => lire()[id] ?? ouvertParDefaut);
  const basculer = () =>
    setOuvert((o) => {
      const n = !o;
      ecrire(id, n);
      return n;
    });
  return [ouvert, basculer];
}

export function Accordeon({
  id,
  titre,
  badge,
  ouvert,
  onToggle,
  children,
}: {
  /** Identifiant stable de la section (clé de mémoire, préfixe `id` des aria). */
  id: string;
  titre: string;
  /** Résumé visible sans ouvrir (compte, origine d'héritage, état). */
  badge?: React.ReactNode;
  ouvert: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={titre} className="flex flex-col gap-2 border-t border-rule pt-2">
      <h5 className="font-bold text-xs">
        <button
          className="flex w-full items-center gap-1.5 text-left"
          onClick={onToggle}
          title={`${ouvert ? "Replier" : "Déplier"} : ${titre}`}
          aria-expanded={ouvert}
          aria-controls={`${id}-contenu`}
        >
          <Icon name={ouvert ? "chevron-b" : "chevron-d"} size={13} />
          <span className="flex-1">{titre}</span>
          {badge}
        </button>
      </h5>
      {ouvert && <div id={`${id}-contenu`}>{children}</div>}
    </section>
  );
}
