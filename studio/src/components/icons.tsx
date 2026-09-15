// Icônes sobres du Studio — SVG dessinés, un seul trait (1.7px, round).
// Parlantes : toujours accompagnées d'un libellé visible sur desktop ;
// en icon-only (mobile), aria-label + title obligatoires.
// Jamais d'emoji ni de glyphe Unicode comme icône.

export type IconName =
  | "etape"
  | "lieu"
  | "tirage"
  | "fin"
  | "valider"
  | "exemple"
  | "exporter"
  | "importer"
  | "annuler"
  | "retablir"
  | "liste"
  | "graphe"
  | "detail"
  | "essai"
  | "zone"
  | "apres"
  | "delai"
  | "tiree"
  | "animateur"
  | "statut"
  | "alerte"
  | "ok"
  | "recherche"
  | "fermer"
  | "ajouter"
  | "choix"
  | "oeil"
  | "package"
  | "engrenage";

const PATHS: Record<IconName, React.ReactNode> = {
  etape: (
    <rect x="3.5" y="3.5" width="17" height="13" rx="2.5" />
  ),
  lieu: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.8" r="2.3" />
    </>
  ),
  tirage: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <circle cx="9" cy="9" r="1.15" />
      <circle cx="15" cy="9" r="1.15" />
      <circle cx="12" cy="13.2" r="1.15" />
      <circle cx="9" cy="17" r="1.15" />
      <circle cx="15" cy="17" r="1.15" />
    </>
  ),
  fin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.2 12.2 11 15l4.8-5.6" />
    </>
  ),
  valider: (
    <>
      <path d="M4.5 12.5 10 18 19.5 6.5" />
    </>
  ),
  exemple: (
    <>
      <path d="M5 4.5h11L20.5 9v10.5H5Z" />
      <path d="M15.5 4.5V9H20.5" />
      <path d="M8.5 13.5h7M8.5 16.5h5" />
    </>
  ),
  exporter: (
    <>
      <path d="M12 4v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  importer: (
    <>
      <path d="M12 20v-11" />
      <path d="M7.5 13.5 12 9l4.5 4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  annuler: (
    <>
      <path d="M8.5 7.5 4.5 12l4 4.5" />
      <path d="M5 12h9.5a5.5 5.5 0 0 1 0 11H11" transform="translate(0 -3.5)" />
    </>
  ),
  retablir: (
    <>
      <path d="M15.5 7.5l4 4.5-4 4.5" />
      <path d="M19 12H9.5a5.5 5.5 0 0 0 0 11H13" transform="translate(0 -3.5)" />
    </>
  ),
  liste: (
    <>
      <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
      <circle cx="5" cy="6.5" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="5" cy="17.5" r="1.2" />
    </>
  ),
  graphe: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="8.5" r="2.2" />
      <circle cx="9.5" cy="18" r="2.2" />
      <path d="M8 7 15.8 8M7 8.2l1.6 7.4M16.4 10.3l-5 6" />
    </>
  ),
  detail: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" />
    </>
  ),
  essai: (
    <>
      <path d="M7 4.8v14.4L19 12Z" />
    </>
  ),
  zone: (
    <>
      <circle cx="12" cy="12" r="7.5" strokeDasharray="3.2 2.6" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  apres: (
    <>
      <path d="M4.5 12h9" />
      <path d="M11 7.5 15.5 12 11 16.5" />
      <circle cx="18.5" cy="12" r="1.8" />
    </>
  ),
  delai: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.6 1.8" />
      <path d="M9.5 2.8h5" />
    </>
  ),
  tiree: (
    <>
      <path d="M6 4.5h12v13l-3-2-3 2-3-2-3 2Z" />
      <circle cx="12" cy="10" r="1.6" />
    </>
  ),
  animateur: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" />
    </>
  ),
  statut: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alerte: (
    <>
      <path d="M12 3.8 21 19.5H3Z" />
      <path d="M12 9.5v4.4" />
      <circle cx="12" cy="16.6" r="0.4" />
    </>
  ),
  ok: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.4 12.4 11.2 15l4.4-5.2" />
    </>
  ),
  recherche: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5 20 20" />
    </>
  ),
  fermer: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  ajouter: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  choix: (
    <>
      <path d="M8 5.5h11v6H8Z" />
      <path d="M8 14.5h11v5H8Z" opacity={0.45} />
      <path d="M4 8.5h1.5M4 17h1.5" />
    </>
  ),
  oeil: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  package: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  engrenage: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flex: "none", verticalAlign: "-3px" }}
    >
      {PATHS[name]}
    </svg>
  );
}
