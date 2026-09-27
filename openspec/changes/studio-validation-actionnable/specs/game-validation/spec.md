## ADDED Requirements

### Requirement: Niveaux de sévérité erreur/avertissement/info

Chaque constat du validateur (C1 comme C2) SHALL porter un niveau : `erreur`
(le jeu ne peut pas tourner : cycle, fin inatteignable, référence orpheline,
`drawCount` impossible, module inexploitable, rupture de schéma), `avertissement`
(le jeu tourne mais un point est louche), `info` (conseil non bloquant).
Seules les `erreur` SHALL bloquer l'export. Les `avertissement` SHALL permettre
l'export après confirmation explicite de l'auteur (« je sais ce que je fais »),
tracée dans l'historique. Les `info` SHALL ne jamais bloquer ni exiger de confirmation.

Sont requalifiés (liste fermée, tout le reste reste `erreur`) : nœud indoor avec
`GEOFENCE`, `tileStrategy: "none"` avec `map` configuré (déjà exigés comme
avertissements par la spec, poussés à tort dans `errors[]` par le code),
`consumable` jamais utilisé par `ITEM_USED`, couleurs `branding` invalides,
`gameMode`/`difficulty`/`experienceStyle.preset` invalides, `identity.name` vide.
Rétrograder une règle SHALL ne jamais rendre invalide un jeu valide aujourd'hui.

#### Scenario: Avertissement exportable avec confirmation
- **GIVEN** un jeu valide sauf un objet `consumable` jamais utilisé
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** le bouton propose « Exporter quand même (1 avertissement) », la confirmation est journalisée, l'export réussit

#### Scenario: Erreur toujours bloquante
- **GIVEN** un jeu avec un cycle `A<->B` non autorisé
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** le bouton reste désactivé, aucune confirmation ne le débloque

#### Scenario: Spec conforme au code sur les avertissements existants
- **GIVEN** un nœud indoor avec condition `GEOFENCE`
- **WHEN** la validation tourne
- **THEN** un avertissement est émis et le jeu reste exportable (fin de l'écart spec/code actuel)

### Requirement: Erreurs structurées à glossaire fermé

Le validateur SHALL émettre des constats structurés `{code, noeud, champ, attendu}`
au lieu de chaînes libres à parser. L'UI SHALL les rendre via un glossaire fermé
non technique : « étape » (jamais « nœud »), « déclencheur » (jamais « condition »),
« tirage » (jamais « pool »), « fin » (jamais « isEnding »), « rejouées » (jamais
`maxReentries`). Chaque constat affichable SHALL proposer l'action « Voir »
(navigation Composer existante). Le pattern-matching textuel (`erreurFR` sur
`msg.includes(...)`) SHALL ne plus être étendu et SHALL être supprimé quand tous
les constats seront structurés.

#### Scenario: Référence orpheline lisible
- **GIVEN** `C2 start : reference inconnue etape-2` sous forme structurée
- **WHEN** l'auteur lit l'écran Valider
- **THEN** il voit « L'étape « start » attend l'étape « etape-2 », qui n'existe plus. Supprime ce déclencheur ou recrée l'étape. » + bouton « Voir »

### Requirement: Correction automatique en trois tas

Les corrections SHALL passer par des opérations MCP nommées annulables (undo natif)
et journalisées explicitement, jamais par patch silencieux :
- **Sans demander** (sémantique inchangée) : migration `global.preset` →
  `experienceStyle.preset`, enum invalide → valeur par défaut avec mention,
  `operator` surnuméraire à 1 déclencheur → retiré.
- **Proposée en un clic** (décision d'auteur) : `operator` manquant (AND vs OR),
  `maxReentries` manquant, `drawCount > len` (réduire ou ajouter des candidates),
  doublon de tirage, référence orpheline (supprimer la référence).
- **Jamais** : cycles, fins inatteignables, AND-sur-exclusifs (exigent de
  repenser le parcours).

#### Scenario: Migration preset sans demander
- **GIVEN** un jeu avec `global.preset: "BASIC"`
- **WHEN** la validation tourne
- **THEN** le jeu est migré vers `experienceStyle.preset`, une mention « migré automatiquement, annulable » est journalisée

#### Scenario: Operator proposé, jamais deviné
- **GIVEN** un nœud à 2 déclencheurs sans `operator`
- **WHEN** l'auteur clique « Corriger »
- **THEN** le panneau propose AND (« toutes les conditions ») vs OR (« au moins une ») avec l'effet expliqué, sans défaut pré-coché

#### Scenario: Cycle jamais rapiécé
- **GIVEN** un cycle `A<->B` non autorisé
- **WHEN** l'auteur clique « Corriger »
- **THEN** aucune correction n'est proposée, seule l'explication et la navigation vers les fautifs
