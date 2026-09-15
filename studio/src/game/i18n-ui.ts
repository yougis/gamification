// Glossaire FR du Studio : source unique des libellés créateurs.
// Le JSON exporté garde les clés techniques figées (contrat draft-07) ;
// l'UI n'affiche que ces libellés, avec le terme spec en aide.

export const MODULES_FR: Record<string, { nom: string; aide: string; bloc: string }> = {
  INFO: { nom: "Écran d'info", aide: "Texte d'accueil ou de liaison (type libre)", bloc: "Étape" },
  QUIZ: { nom: "Quiz (QCM)", aide: "Questions à choix, chrono interne possible", bloc: "Étape" },
  DIFFERENCE_GAME: { nom: "Jeu des 7 erreurs", aide: "2 images + zones à toucher", bloc: "Étape" },
  PUZZLE: { nom: "Puzzle", aide: "Image à reconstituer", bloc: "Étape" },
  AR_MARKER: { nom: "Réalité augmentée", aide: "Marqueur à viser + modèle 3D (plan B 2D obligatoire)", bloc: "Étape" },
  BOUSSOLE: { nom: "Énigme boussole", aide: "Valide un cap en interne (tolérance + secours)", bloc: "Étape" },
  RANDOM_POOL: { nom: "Tirage au sort", aide: "Nœud structurel : tire N étapes parmi des candidates", bloc: "Tirage" },
};

export const CONDITIONS_FR: Record<string, { nom: string; aide: string }> = {
  GEOFENCE: { nom: "Zone GPS", aide: "Le joueur entre / sort / reste / traverse un cercle" },
  NODE_COMPLETED: { nom: "Après l'étape…", aide: "Quand une autre étape est terminée" },
  TIMER: { nom: "Délai", aide: "Temps minimum avant ouverture" },
  POOL_DRAWN: { nom: "Tirée au sort", aide: "L'étape a été tirée par un Tirage au sort" },
  PROXIMITY_MASTER: { nom: "Près de l'animateur", aide: "À portée du téléphone ou boîtier animateur (sans GPS)" },
  CONDITIONAL: { nom: "Selon la réponse (futur)", aide: "Réservé : branchement façon livre-jeu" },
  WINDOW: { nom: "Plage horaire (futur)", aide: "Réservé : ex. 14h–16h" },
  ITEM_REQUIRED: { nom: "Objet requis", aide: "Le joueur doit posséder l'objet dans son inventaire" },
  ITEM_USED: { nom: "Objet utilisé", aide: "Le joueur doit avoir utilisé un objet spécifique" },
  CODE_INPUT: { nom: "Code saisi", aide: "Le joueur doit avoir saisi un code correct" },
  CLUE_RESOLVED: { nom: "Indice résolu", aide: "Le joueur doit avoir résolu un indice ou énigme" },
};

export const FAMILLES = [
  { id: "epreuve", titre: "1 · L'épreuve", aide: "Ce que le joueur voit et fait" },
  { id: "declenchement", titre: "2 · Déclenchement", aide: "Quand l'étape s'ouvre" },
  { id: "comportement", titre: "3 · Comportement", aide: "Ce qui se passe ensuite" },
  { id: "tirage", titre: "4 · Tirage au sort", aide: "Si c'est une étape de tirage" },
  { id: "validation", titre: "5 · Validation", aide: "Relecture équipe avant publication" },
  { id: "decouverte", titre: "6 · Découverte", aide: "Comment l'étape devient connue du joueur" },
  { id: "effets", titre: "7 · Effets", aide: "Ce que l'étape produit à la complétion" },
  { id: "inventaire", titre: "8 · Inventaire", aide: "Objets requis ou référencés" },
] as const;

// Préréglages de rayon (demande UX) : valeurs indicatives, modifiables, stockées dans le JSON.
export const PRESETS_RAYON = [
  { nom: "Piéton", metres: 15, aide: "Centre-ville, précision correcte" },
  { nom: "Parc", metres: 30, aide: "Défaut : jardins, places" },
  { nom: "Vélo", metres: 50, aide: "Vitesse : anticipe la traversée" },
  { nom: "Forêt", metres: 60, aide: "GPS dégradé + attente longue conseillés" },
];

// Milieux : recommandation affichée par étape (matrice Studio).
export const MILIEUX = {
  exterieur: { nom: "Extérieur", reco: "Zone GPS 15–30 m, ouverture rapide" },
  foret: { nom: "Forêt dense", reco: "Zone GPS élargie 40–60 m + attente longue, garder ouvert" },
  "batiment-cave": { nom: "Bâtiment / cave", reco: "Près de l'animateur, puis QR / code / RA / animateur en secours" },
} as const;

export type Milieu = keyof typeof MILIEUX;

// États lisibles.
export const ETATS_FR: Record<string, string> = {
  draft: "Brouillon",
  reviewed: "Relu",
  published: "Publié",
};

export const OPERATEURS_FR: Record<string, string> = {
  AND: "Toutes les conditions (Tous)",
  OR: "Au moins une (Au moins un)",
};

// Erreurs de validation traduites (cartographie des verdicts C1/C2).
export function erreurFR(msg: string): string {
  if (msg.includes("'operator' is a required property"))
    return "Il manque la logique « Tous / Au moins un » (au moins 2 déclencheurs).";
  if (msg.includes("'maxReentries' is a required property"))
    return "« Rejouable » exige un nombre de rejouées.";
  if (msg.includes("is not valid under any of the given schemas"))
    return "Un déclencheur mélange des champs incompatibles (ex. rayon dans un délai).";
  if (msg.startsWith("C2 cycle")) return `Boucle interdite : ${msg.slice(9)}. Autorise-la explicitement ou casse-la.`;
  if (msg.includes("AND sur candidats exclusifs"))
    return "Fin impossible : elle exige 2 étapes dont une seule peut être tirée.";
  if (msg.includes("sans chemin vers FIN")) return `${msg} — relie-la à une fin.`;
  if (msg.includes("aucun isEnding")) return "Le jeu n'a pas de fin : désigne une étape « Fin du jeu ».";
  if (msg.includes("drawCount")) return "Le tirage demande plus d'étapes qu'il n'y a de candidates.";
  if (msg.includes("deux pools")) return "Une étape ne peut appartenir qu'à un seul tirage.";
  return msg;
}
