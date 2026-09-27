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
}

// Table centrale de sévérité : un seul point de vérité pour la
// requalification. Tout code absent = "erreur" (sûr par défaut).
export const niveauParCode: Record<string, Niveau> = {
  INDOOR_GEOFENCE: "avertissement",
  TILESTRATEGY_NONE_MAP: "avertissement",
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
