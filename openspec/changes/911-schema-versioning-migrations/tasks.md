## 1. Schema et framework

- [ ] 1.1 Ajouter `schemaVersion` requis (jeux sans version = v1 implicite) et constater l'acceptation d'un jeu legacy + le refus motive d'un jeu trop recent (`E_SCHEMA_TOO_NEW`).
- [ ] 1.2 Implementer le framework de migrations pures `vN -> vN+1` (chaine, test unitaire par pas) et constater la rejouabilite deterministe sur fixture.

## 2. Integration et non-regression

- [ ] 2.1 Brancher la migration a l'ouverture Studio (avec undo) et constater un jeu v1 migre editable sans perte.
- [ ] 2.2 Brancher le refus runtime (message « mettez a jour l'application ») et constater le refus sans lecture partielle.
- [ ] 2.3 Revalider `game-5poi.json` et `sherlock-holmes` C1+C2 apres migration et constater zero erreur.
