# GeoPlay — Framework de jeux geolocalises offline (natif iOS + Android)

Ce projet suit une methodologie **Spec-Driven Development** pilotee par
**OpenSpec** (`openspec/config.yaml`, `openspec/changes/`,
`openspec/specs/`). Voir `ROADMAP.md` pour l'ordre des changes
(`000` socle, `100`-`500`, differes `600`-`640`) a proposer via
`/opsx:propose` dans opencode. Ce fichier ne fixe que des regles de code
generales ; les regles de spec vivent dans `openspec/config.yaml`.

## Regles transverses

- **Source de verite des donnees** : `openspec/specs/` + schema Draft-07
  (change `100`). Toute modification du schema doit etre propagee au
  Studio MCP, au runtime natif, a l'orchestrateur et aux modules du registre.
- **Offline-first natif** : aucune fonctionnalite joueur ne suppose du
  reseau apres le telechargement (fichiers app + SQLite, manifest SHA-256
  par fichier verifie).
- **Registre de modules ouvert** : types socle `QUIZ`, `DIFFERENCE_GAME`,
  `PUZZLE`, `AR_MARKER`, `BOUSSOLE`. Toute extension est une entree
  registre, jamais une retouche du schema Noeuds/Liens.
- **Geofencing** : rayon, overrides et predicats toujours lus depuis le
  JSON du jeu, jamais codes en dur dans le viewer.
- **Studio MCP** : meme schema des deux cotes (auteur et runtime),
  statuts `draft|reviewed|published`, graphe de reference neutre comme
  fixture de test.
