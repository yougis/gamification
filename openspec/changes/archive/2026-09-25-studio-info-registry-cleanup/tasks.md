## 1. Correctifs (déjà appliqués, à consigner et verrouiller)

- [x] 1.1 Dédupliquer `TYPES_MODULE` (`App.tsx`) : filtre anti-doublon, ordre conservé ; vérifier : aucune clé dupliquée, INFO premier
- [x] 1.2 Nœuds `start` par défaut (`App.tsx` jeu vide, `mcp.ts` import sans nœud) avec `data` INFO valide ; vérifier : aucune erreur C1 sur `module/data`

## 2. Garde-fous

- [x] 2.1 Test d'unicité de la liste des types proposés (registre + `RANDOM_POOL`, chaque type exactement une fois, INFO inclus via le registre) ; vérifier : ajout d'un type fictif au registre → présent une fois sans retouche UI
- [x] 2.2 Revalider `tsc`, smokes Studio ; vérifier et consigner
