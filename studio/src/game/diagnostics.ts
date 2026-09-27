// Diagnostics structurés de validation (change studio-validation-actionnable).
// Le validateur émet des constats {code, niveau, noeud, champ, attendu} AU
// LIEU de chaînes libres à parser : l'UI rend via glossaire fermé, sans
// pattern-matching. En transition, chaque constat porte aussi son `message`
// historique (byte-identique) pour les tests, smokes et `brut`.
export type Niveau = "erreur" | "avertissement" | "info";

export interface Correctif {
  /** Identifiant stable dispatché par l'UI vers une opération MCP nommée. */
  id: string;
  /** Libellé du bouton, non technique. */
  label: string;
}

export interface Diagnostic {
  code: string;
  niveau: Niveau;
  couche: 1 | 2;
  noeud?: string;
  champ?: string;
  attendu?: string;
  /** Texte historique (compat tests/smokes/`brut`), inchangé. */
  message: string;
  correctifs: Correctif[];
  /** Refus d'export hors validation (brouillon, média) : pas de couche. */
  export?: true;
}

// Table centrale de sévérité : un seul point de vérité pour la
// requalification. Tout code absent = "erreur" (sûr par défaut).
export const niveauParCode: Record<string, Niveau> = {
  INDOOR_GEOFENCE: "avertissement",
  TILESTRATEGY_NONE_MAP: "avertissement",
  CARTE_ALL_EVENTE: "avertissement",
  CARTE_SANS_ETAPE: "avertissement",
  CONSUMABLE_INUTILISE: "info",
  BRANDING_PRIMARY_INVALIDE: "avertissement",
  BRANDING_SECONDARY_INVALIDE: "avertissement",
  GAMEMODE_INVALIDE: "avertissement",
  DIFFICULTY_INVALIDE: "avertissement",
  PRESET_EXPERIENCE_INVALIDE: "avertissement",
  IDENTITY_NAME_VIDE: "info",
};

// Corrections proposables par code (change studio-validation-actionnable) :
// l'UI dispatche `correctif.id` vers une opération MCP nommée annulable.
// Jamais de défaut pré-coché côté UI pour les décisions d'auteur.
export const correctifsParCode: Record<string, Correctif[]> = {
  PRESET_OBSOLETE: [{ id: "migrer-preset", label: "Migrer vers experienceStyle.preset" }],
  OPERATOR_MANQUANT: [{ id: "fix-operator", label: "Choisir AND / OR" }],
  C1_MAXREENTRIES: [{ id: "fix-maxreentries", label: "Mettre 1 rejouée" }],
  DRAWCOUNT_TROP_GRAND: [{ id: "fix-drawcount", label: "Corriger le tirage" }],
  CANDIDAT_DOUBLE_POOL: [{ id: "fix-double-pool", label: "Retirer le doublon" }],
  OPERATOR_INTERDIT: [{ id: "retirer-operator", label: "Retirer operator" }],
  GAMEMODE_INVALIDE: [{ id: "fix-enum-defaut", label: "Revenir à la valeur par défaut" }],
  DIFFICULTY_INVALIDE: [{ id: "fix-enum-defaut", label: "Revenir à la valeur par défaut" }],
  PRESET_EXPERIENCE_INVALIDE: [{ id: "fix-enum-defaut", label: "Revenir à la valeur par défaut" }],
  REF_INCONNUE: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  ITEM_REQUIRED_ORPHELIN: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  ITEM_USED_ORPHELIN: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  CLUE_ORPHELINE: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  TIMER_ANCRE_ORPHELINE: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  HINT_ITEM_ORPHELIN: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  DISCOVERY_ITEM_ORPHELIN: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  DISCOVERY_CLUE_ORPHELIN: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  DISCOVERY_SOURCE_ORPHELINE: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  DISCOVERY_PUZZLE_ORPHELINE: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  DISCOVERY_PROXIMITY_ORPHELINE: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  INVENTORYREF_ORPHELIN: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
  CANDIDAT_INCONNU: [{ id: "supprimer-reference", label: "Supprimer la référence" }],
};

// Collecteur : pousse le message historique ET le Diagnostic en parallèle.
// Les chaînes restent byte-identiques (tests, smokes, `brut` inchangés).
export class Collecteur {
  errors: string[] = [];
  diagnostics: Diagnostic[] = [];
  constructor(private couche: 1 | 2) {}
  signaler(
    code: string,
    message: string,
    extra?: { noeud?: string; champ?: string; attendu?: string },
  ): void {
    this.errors.push(message);
    this.diagnostics.push({
      code,
      niveau: niveauParCode[code] ?? "erreur",
      couche: this.couche,
      message,
      ...extra,
      correctifs: correctifsParCode[code] ?? [],
    });
  }
}

// Messages bloquants d'un résultat de validation : erreurs seules
// (avertissements/info n'empêchent jamais l'export).
export function messagesBloquants(diagnostics: Diagnostic[]): string[] {
  return diagnostics.filter((d) => d.niveau === "erreur").map((d) => d.message);
}

// Glossaire fermé non technique (change studio-validation-actionnable) :
// « étape » (jamais « nœud »), « déclencheur » (jamais « condition »),
// « tirage » (jamais « pool »), « fin » (jamais « isEnding »),
// « rejouées » (jamais `maxReentries`). Rend un Diagnostic affichable;
// repli sur le message historique si le code est inconnu.
export function rendreDiagnostic(d: Diagnostic): string {
  const etape = d.noeud ? `« ${d.noeud} »` : "une étape";
  switch (d.code) {
    case "PRESET_EXPERIENCE_INVALIDE":
      return `Style d'expérience inconnu (attendu : ${d.attendu ?? "BASIC, GUIDED, TREASURE_HUNT, ESCAPE_GAME, OPEN_EXPLORATION"}).`;
    case "IDENTITY_NAME_VIDE":
      return "Le nom d'identité du style est vide.";
    case "GAMEMODE_INVALIDE":
      return `Mode de jeu inconnu (attendu : ${d.attendu ?? "NORMAL, ANIMATEUR, SOIREE, HARDCORE"}).`;
    case "DIFFICULTY_INVALIDE":
      return `Difficulté inconnue (attendu : ${d.attendu ?? "ENFANT, FAMILLE, EXPERT"}).`;
    case "BRANDING_PRIMARY_INVALIDE":
    case "BRANDING_SECONDARY_INVALIDE":
      return `Couleur invalide (attendu : ${d.attendu ?? "#RRGGBB, ex. #1a7f37"}).`;
    case "HOLD_EXIT_MANQUANT":
      return "Le verrouillage kiosque exige une méthode de sortie (code animateur…), voir la configuration HOLD.";
    case "NEEDSLOCK_SANS_HOLD":
      return `L'étape ${etape} exige le verrouillage kiosque, actuellement inactif.`;
    case "PRESET_OBSOLETE":
      return "Ancien réglage « preset » : utilise le preset du style d'expérience (migration proposée).";
    case "MAP_INDOOR_EXCLUSIFS":
      return "Carte extérieure et plans d'intérieur ne peuvent pas coexister : choisis l'un ou l'autre.";
    case "FENETRE_VIDE":
      return `L'étape ${etape} a une fenêtre de temps vide (le début est après la fin).`;
    case "PLANID_INCONNU":
      return `L'étape ${etape} vise un plan d'étage qui n'existe pas.`;
    case "INDOOR_GEOFENCE":
      return `L'étape ${etape} mélange intérieur et GPS, incompatibles : choisis l'un ou l'autre.`;
    case "TILESTRATEGY_NONE_MAP":
      return "Carte configurée mais tuiles désactivées : rien ne s'affichera sur la carte.";
    case "REF_INCONNUE":
      return `L'étape ${etape} attend une étape qui n'existe plus. Supprime ce déclencheur ou recrée l'étape.`;
    case "CYCLE":
    case "CYCLE_INTERPOOLS":
      return `Boucle interdite : ${d.message.replace(/^C2 (cycle|cycle inter-pools) : /, "")}. Autorise-la explicitement ou casse-la.`;
    case "DRAWCOUNT_TROP_GRAND":
      return `Le tirage demande plus d'étapes qu'il n'y a de candidates (${d.attendu ?? ""}).`;
    case "CANDIDAT_DOUBLE_POOL":
      return "Une étape ne peut appartenir qu'à un seul tirage.";
    case "CANDIDAT_INCONNU":
    case "CANDIDAT_SANS_FIN":
      return `Le tirage contient une étape à relier : ${d.noeud ?? ""} — relie-la à une fin.`;
    case "POOL_BOOT_DEPENDANCE":
      return "Tirage de démarrage dépendant d'un tirage ultérieur : impossible, inverse la dépendance.";
    case "AUCUN_ISENDING":
      return "Le jeu n'a pas de fin : désigne une étape « Fin du jeu ».";
    case "ISENDING_INATTEIGNABLE":
      return "Aucune fin ne peut être atteinte depuis le départ : vérifie les déclencheurs.";
    case "AND_EXCLUSIF":
      return "Fin impossible : elle exige 2 étapes dont une seule peut être tirée. Passe en « au moins une » ou change les candidates.";
    case "CONDITION_CODE_MANQUANT":
    case "MODULE_CODE_MANQUANT":
      return `L'étape ${etape} attend un code : renseigne-le dans la famille épreuve.`;
    case "ITEM_REQUIRED_ORPHELIN":
    case "ITEM_USED_ORPHELIN":
    case "HINT_ITEM_ORPHELIN":
    case "DISCOVERY_ITEM_ORPHELIN":
    case "INVENTORYREF_ORPHELIN":
    case "RECETTE_ENTREE_ORPHELINE":
      return `L'étape ${etape} référence un objet qui n'existe plus. Supprime la référence ou recrée l'objet.`;
    case "CLUE_ORPHELINE":
    case "DISCOVERY_CLUE_ORPHELIN":
      return `L'étape ${etape} référence un indice qui n'existe plus.`;
    case "TIMER_ANCRE_ORPHELINE":
      return `L'étape ${etape} attend la fin d'une étape qui n'existe plus.`;
    case "DISCOVERY_SOURCE_ORPHELINE":
    case "DISCOVERY_PUZZLE_ORPHELINE":
    case "DISCOVERY_PROXIMITY_ORPHELINE":
      return `L'étape ${etape} dépend d'une étape source qui n'existe plus.`;
    case "RECETTE_CONSOMMABLE":
      return `Recette ${d.noeud ?? ""} : un objet consommé doit être marqué consommable.`;
    case "RECETTE_SORTIE_ORPHELINE":
      return `Recette ${d.noeud ?? ""} : l'objet produit n'existe pas.`;
    case "RECETTE_AUTOPRODUCTION":
      return `Recette ${d.noeud ?? ""} : la sortie figure parmi les entrées (auto-production impossible).`;
    case "CONSUMABLE_INUTILISE":
      return `L'objet ${etape} est consommable mais jamais utilisé : il ne servira à rien.`;
    case "DRAFT_BLOQUE":
      return `Étape ${etape} en brouillon (hors mode animateur) : passe-la en relu dans Relire.`;
    case "MEDIA_HORS_PACK":
      return `Média hors-pack (URL réseau) ${d.champ ?? ""} : embarque le fichier dans le pack.`;
    case "MEDIA_ABSENT_MANIFEST":
      return `Média ${d.champ ?? ""} absent du manifest : ajoute le fichier au manifest.`;
    case "OPERATOR_MANQUANT":
      return `${d.noeud ? `Étape ${etape} : ` : ""}il manque la logique « Tous / Au moins un » (2 déclencheurs ou plus exigent AND ou OR — famille « Déclenchement »).`;
    case "OPERATOR_INTERDIT":
      return `${d.noeud ? `Étape ${etape} : ` : ""}logique « Tous / Au moins un » interdite ici (un seul déclencheur).`;
    case "C1_MAXREENTRIES":
      return "« Rejouable » exige un nombre de rejouées.";
    case "C1_CHAMP_REQUIS":
      return `Il manque « ${d.champ ?? "un champ"} »${d.noeud ? ` dans l'étape ${etape}` : ""}.`;
    case "C1_CHAMP_INCONNU":
      return `« ${d.champ ?? "un champ"} » n'existe pas à cet endroit${d.noeud ? ` (étape ${etape})` : ""} : retire-le.`;
    case "C1_ENUM_INVALIDE":
      return `Valeur non autorisée${d.champ ? ` pour « ${d.champ} »` : ""}${d.attendu ? ` (attendu : ${d.attendu})` : ""}.`;
    case "C1_FORME_INVALIDE":
      return d.message;
    default:
      return d.message;
  }
}
