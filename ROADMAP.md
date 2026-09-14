# Feuille de route — GeoPlay Framework (natif iOS + Android)

Chaque ligne = un `change` OpenSpec, a creer et faire avancer dans cet
ordre via le workflow `/opsx:propose` -> `/opsx:continue` (ou `/opsx:ff`)
-> `/opsx:apply` -> `/opsx:archive`, depuis opencode.

Principe premier : ce n'est pas "un jeu" mais une plateforme de production
de jeux. Tout ce qui est specifie doit rester generique, jamais cable pour
un cas particulier. Socle resserre d'abord, extensions ensuite.

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 0 | `000-framework-architecture` | Socle : lexique, Jeu=graphe Nœuds + `activation.requires/operator`, conditions `GEOFENCE/NODE_COMPLETED/TIMER/POOL_DRAWN`, `RANDOM_POOL` router + `drawTiming`, `CONDITIONAL/WINDOW` reserves, etats + `latch` + `allowCycle/onReentry/maxReentries/scoreOnReplay` + `isEnding`, validation 2 couches (norme JSON + applicative), cas test 5 POI (1 tire -> FIN) | — |
| 1 | `100-define-game-schema` | Schéma de validation JSON du graphe + registre + branding + donnees globales, exemple graphe 5 POI valide | 000 |
| 2 | `200-studio-mcp-authoring` | Studio MCP hyperstructure (meme schema que runtime), provenance providers, statuts `draft/reviewed/published`, graphe de reference neutre comme fixture, difficultes/modes en overrides, i18n cles + glossaire | 100 |
| 3 | `300-offline-native-engine` | Moteur natif : fichiers app + SQLite, manifest SHA-256 par fichier + diff + resume + background download, packs carte offline configurables + fallback statique | 100 |
| 4 | `400-map-viewer-orchestrator` | Viewer + orchestrateur : `UNLOCKED/ACTIVE` + file 1 modale, latch/desactivation + hysteresis, boussole service (fleche POI, non-validante), trace GPX display seule | 100 |
| 5 | `500-minigames-modules-registry` | Registre modules : QUIZ, 7-erreurs (Alpha->polygones % + dilatation), PUZZLE, AR_MARKER + fallback 2D, BOUSSOLE (lit le service heading, valide en interne), extensible sans toucher Noeuds/Liens | 100 |
| 8 | `800-add-framework-docs` | Documentation : créateur (Studio MCP, modes système), développeur (architecture moteur, orchestrateur, MCP, capteurs), mainteneur (référence fonctionnelle exhaustive), glossaire | — |
| 9 | `ecosystem-presentation-docs` | Documentation de présentation de l'écosystème pour les créateurs : termes non techniques, logique implémentée, possibilités de création de jeux | 800 |
| 10 | `dev-api-mcp-reference` | Documentation développeur : API reference, MCP reference, classes/objets/fonctions | 800 |
| 11 | `add-quickstart-readme` | README racine : guide démarrage rapide pour créateur, intégrateur, développeur + mise à jour ROADMAP | — |
Differes explicites (pas au socle, changes dedies plus tard) :
`600-sync-scoring-master` (events P2P natif + resync serveur,
`mergeRule`, flag triche), `610-branding-system-modes` (tokens,
triche/test + preview Studio), `620-i18n-difficulty-validation`,
`630-window-conditional` (`WINDOW onMiss/recurrence`, gamebook),
`640-a11y-battery-sos-tests`, `710-hold-kiosk-mode` (verrouillage
terminal kiosque pour flotte fournie, sortie animateur,
journalisation des I/O pour tous les modes).

## Demarrage
```bash
openspec init --tools opencode
```

Puis dans opencode, pour le change fondateur :

```
/opsx:propose Architecture socle du framework GeoPlay (graphe Nœuds/activation,
registre extensible, orchestrateur avec latch, POOL, terminaison). Voir
openspec/config.yaml pour le contexte et les regles.
```

Une fois `000` archive, son contenu passe dans `openspec/specs/`, qui devient
la reference que les changes 100 a 500 doivent lire avant de proposer quoi
que ce soit.
