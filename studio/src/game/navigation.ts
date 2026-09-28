// Etat navigation explicite (change home-player-runtime, 3.1.1) : pur, sans
// cablage UI. La navigation ne touche jamais le moteur : ouvrir, fermer,
// revenir = zero ecriture, zero event. Seuls Valider/Abandonner ecrivent.
// - HOME : tableau/carte d'accueil (vue par defaut)
// - volet : fiche du POI (titre + bouton d'acces, sans questionnaire)
// - etape : ecran d'etape, mode selon l'etat moteur (apercu LOCKED decouvert,
//   jouable UNLOCKED, relecture COMPLETED, rejeu COMPLETED rejouable)
// - plein-ecran : carte plein ecran depuis HOME (remplace HOME, pas un overlay)
export type VueMode = "apercu" | "jouable" | "relecture" | "rejeu";

export type Navigation =
  | { vue: "HOME" }
  | { vue: "volet"; id: string }
  | { vue: "etape"; id: string; mode: VueMode }
  | { vue: "plein-ecran" };

export function navigationInitiale(): Navigation {
  return { vue: "HOME" };
}

export function estEtape(n: Navigation): n is Extract<Navigation, { vue: "etape" }> {
  return n.vue === "etape";
}
