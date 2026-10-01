# GeoPlay — Framework de jeux geolocalises offline (natif iOS + Android)

Ce projet suit une methodologie **Spec-Driven Development** pilotee par
**OpenSpec** (`openspec/config.yaml`, `openspec/changes/`,
`openspec/specs/`). Voir `ROADMAP.md` pour l'ordre des changes
(jalons M1-M6, changes `900`-`982`) a proposer via
`/opsx:propose` -> `/opsx:continue` (ou `/opsx:ff`)
-> `/opsx:apply` -> `/opsx:archive` dans opencode. Etat au 2026-10-01 :
socle 000 -> 500 archive, 102 changes archives,
30 specs actives dans `openspec/specs/`. Studio Web mature, player natif
en bascule KMP. La feuille de route couvre la suite : livraison (M1),
finitions (M2), comptes (M3), catalogues (M4), monetisation et IA (M5),
marketplace plus tard (M6). Ce fichier fixe que des regles de code
generales ; les regles de spec vivent dans `openspec/config.yaml`.

## Principes structurants du systeme

Le projet GeoPlay est une **plateforme de production de jeux** et non un jeu
en soi. Ces principes gouvernent toutes les decisions de l'agent et du
projet :

1. **Genericite par defaut** : tout ce qui est specifie doit rester generic
   (valable pour n'importe quel jeu cree par n'importe quel createur),
   jamais cable pour un cas particulier.
2. **Source de verite des donnees** : `openspec/specs/` + schema Draft-07
   (change `100`). Toute modification du schema doit etre propagee au
   Studio MCP, au runtime natif, a l'orchestrateur et aux modules du registre.
3. **Offline-first natif** : aucune fonctionnalite joueur ne suppose du
   reseau apres le telechargement (fichiers app + SQLite, manifest SHA-256
   par fichier verifie).
4. **Registre de modules ouvert** : types socle `QUIZ`, `DIFFERENCE_GAME`,
   `PUZZLE`, `AR_MARKER`, `BOUSSOLE`, `CODE_INPUT`, `INFO`. Toute extension est une entree
   registre, jamais une retouche du schema Noeuds/Liens.
5. **Geofencing par JSON** : rayon, overrides et predicats toujours lus
   depuis le JSON du jeu, jamais codes en dur dans le viewer.
6. **Studio MCP symetrique** : meme schema des deux cotes (auteur et runtime),
   statuts `draft|reviewed|published`, graphe de reference neutre comme
   fixture de test.
7. **Separation des responsabilites** : discovery, activation, progression
   et presentation sont conceptuellement independantes. Le cycle
   `LOCKED → UNLOCKED → COMPLETED` reste valide pour tous les
   modeles de navigation.
8. **Donnees jamais en dur** : rayon GPS, overrides, seuils capteurs, URLs,
   bbox/zooms, tout lu depuis le JSON du jeu.
9. **Compatibilite ascendante** : un jeu BASIC existant fonctionne sans
   modification fonctionnelle. Les nouvelles proprietes (discovery, effects,
   inventory) sont optionnelles.
10. **Validation en double couche** : Draft-07 (forme) + validateur
    applicatif (cycles, atteignabilite, topo pools, etc.).
11. **Joueur sans compte** : offline-first conserve, aucun login bloquant sur
    mobile. Seuls les createurs s'authentifient (Keycloak).
12. **Droits portes par le createur** : licence signee EdDSA dans le package,
    verifiee offline. Achats sur le Studio Shop web, aucun achat dans l'app mobile.
13. **Monolithe modulaire** : backend Node.js/TypeScript + PostgreSQL + Barman.
    Pas de microservices (sauf worker LLM, asynchrone).
14. **Documentation dans le meme change** : guide createur, reference API/MCP
    et glossaire mis a jour avec la fonctionnalite.
15. **Validation triple couche** : C1 Draft-07 + C2 applicative + C3 droits
    (serveur autoritaire, Studio indicatif).
16. **i18n en fichiers separes** : `game.json` en cles `{"$t"}`, textes dans
    `i18n/fr.json` + `en.json` inclus au manifest.
17. **Schema versionne** : `schemaVersion` entier + migrations pures testees
    vN -> vN+1 ; runtime refuse un jeu trop recent avec message clair.
18. **Tokens semantiques** : aucune couleur en dur dans les widgets, heritage
    global -> screen -> widget, contraste WCAG AA.

## Regles de code generales

- Le projet utilise **OpenSpec** comme systeme de specification et de gestion des changes, combine a **CodeGraph** pour la cartographie sémantique du code.
- **Cartographie obligatoire** : Avant chaque proposition (`/opsx:propose`), l'agent doit utiliser CodeGraph pour identifier l'impact exact d'un changement de schéma sur les modules indexés (Studio MCP, runtime natif, validateur).
- Tout changement de schema graphe (Noeuds/activation/registre/branding/manifest) doit identifier les consommateurs impactes via CodeGraph pour garantir la non-regression.
- Les modules GeoPlay (geoplay-spec-validator, geoplay-graph-architect, geoplay-studio-authoring, geoplay-runtime-engine, geoplay-module-registry, geoplay-offline-pack) sont les outils de l'agent. Ils ne sont pas modifies mais leur integration est documentee dans les profils de documentation.
- Pour le developpement des runtime et modules IOS et Android approche "base Kotlin + modules natifs ciblés" (kmp-native-boundary) est l'outil de l'agent.


## Profils de parties prenantes

Ce projet s'adresse a 5 profils de parties prenantes. L'agent adapte ses
reponses selon le profil cible (voir `docs/profiles/`) :

| Profil | Fichier de documentation | Focus |
|--------|--------------------------|-------|
| **Utilisateur** | `docs/profiles/utilisateur.md` | Comment jouer, naviguer, interagir avec les POI |
| **Createur** | `docs/profiles/createur.md` | Composer un jeu dans le Studio, utiliser le MCP |
| **Developpeur** | `docs/profiles/developpeur.md` | Architecture, integration des modules, schema Draft-07 |
| **Maintaineur** | `docs/profiles/mainteneur.md` | Cycle de vie des changes, archive, compatibilite |
| **Financeur/Partenaire** | `docs/profiles/financeur-partenaire.md` | Valeur commerciale, modele economique, ROI |

### Filtrage par profil

L'agent utilise les regles suivantes pour adapter ses reponses :

- **Utilisateur** : langage simple, pas de jargon technique, focus sur
  l'experience joueur et la navigation.
- **Createur** : focus sur le MCP, le canvas graphe, la validation humaine,
  les statuts `draft|reviewed|published`.
- **Developpeur** : schema Draft-07, validation bi-couche, architecture
  des modules, integration des skills GeoPlay.
- **Maintaineur** : cycle de vie des changes, archive, mise a jour du
  schema, compatibilite ascendante.
- **Financeur/Partenaire** : valeur commerciale, modele economique,
  integration en borne, ROI.

## Skills GeoPlay references

Les skills suivants sont disponibles pour l'agent :

- `geoplay-spec-validator` — Validation bi-couche Draft-07 + applicative
- `geoplay-graph-architect` — Modélisation de graphes de jeu
- `geoplay-studio-authoring` — Authoring dans le Studio GeoPlay
- `geoplay-runtime-engine` — Runtime natif (lifecycle, capteurs)
- `geoplay-module-registry` — Registre de modules extensible
- `geoplay-offline-pack` — Pack offline (manifest SHA-256, diff)
- `geoplay-backend-ops` — Backend monolithe (Node/TS, PostgreSQL + Barman, S3, Keycloak)
- `geoplay-entitlement-catalog` — Droits (entitlements, catalogue, C3, licence, quotas, Shop)
- `geoplay-i18n-migrations` — i18n fichiers separes, schemaVersion, tokens
- `openspec-propose` — Proposer un nouveau change
- `openspec-apply-change` — Appliquer un change
- `openspec-archive-change` — Archiver un change
- `openspec-sync-specs` — Synchroniser les specs
- `openspec-update-change` — Mettre a jour un change
- `openspec-explore` — Explorer des ideas
- `kmp-native-boundary` - développer le  runtime Player (android et Ios) avec de modules parfois natifs.
- `impeccable` — Amelioration d'interface
- `geoplay-compose-engine` — Interpreteur d'ecrans Compose en `commonMain` (rendu des noeuds via le registre, jamais de code plateforme)
- `geoplay-wasm-architect` — Simulateur web Compose-Wasm du Studio (`wasmJsMain`, mocks capteurs clavier/souris, sans PWA)