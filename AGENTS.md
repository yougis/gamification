# GeoPlay — Framework de jeux geolocalises offline (natif iOS + Android)

Ce projet suit une methodologie **Spec-Driven Development** pilotee par
**OpenSpec** (`openspec/config.yaml`, `openspec/changes/`,
`openspec/specs/`). Voir `ROADMAP.md` pour l'ordre des changes
(`000` socle, `100`-`500`, differes `600`-`640`) a proposer via
`/opsx:propose` dans opencode. Ce fichier fixe que des regles de code
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
   `PUZZLE`, `AR_MARKER`, `BOUSSOLE`. Toute extension est une entree
   registre, jamais une retouche du schema Noeuds/Liens.
5. **Geofencing par JSON** : rayon, overrides et predicats toujours lus
   depuis le JSON du jeu, jamais codes en dur dans le viewer.
6. **Studio MCP symetrique** : meme schema des deux cotes (auteur et runtime),
   statuts `draft|reviewed|published`, graphe de reference neutre comme
   fixture de test.
7. **Separation des responsabilites** : discovery, activation, progression
   et presentation sont conceptuellement independantes. Le cycle
   `LOCKED → UNLOCKED → ACTIVE → COMPLETED` reste valide pour tous les
   modeles de navigation.
8. **Donnees jamais en dur** : rayon GPS, overrides, seuils capteurs, URLs,
   bbox/zooms, tout lu depuis le JSON du jeu.
9. **Compatibilite ascendante** : un jeu BASIC existant fonctionne sans
   modification fonctionnelle. Les nouvelles proprietes (discovery, effects,
   inventory) sont optionnelles.
10. **Validation en double couche** : Draft-07 (forme) + validateur
    applicatif (cycles, atteignabilite, topo pools, etc.).

## Regles de code generales

- Le projet utilise **OpenSpec** comme systeme de specification et de
  gestion des changes.
- Tout changement de schema graphe (Noeuds/activation/registre/branding/
  manifest) doit identifier les consommateurs impactes (Studio MCP, runtime
  natif, orchestrateur, modules, packaging offline).
- Les modules GeoPlay (geoplay-spec-validator, geoplay-graph-architect,
  geoplay-studio-authoring, geoplay-runtime-engine, geoplay-module-registry,
  geoplay-offline-pack) sont les outils de l'agent. Ils ne sont pas modifies
  mais leur integration est documentee dans les profils de documentation.

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
- `openspec-propose` — Proposer un nouveau change
- `openspec-apply-change` — Appliquer un change
- `openspec-archive-change` — Archiver un change
- `openspec-sync-specs` — Synchroniser les specs
- `openspec-update-change` — Mettre a jour un change
- `openspec-explore` — Explorer des ideas
- `impeccable` — Amelioration d'interface
