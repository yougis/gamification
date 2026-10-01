## 1. Correction taille en octets

- [x] 1.1 Remplacer `size: gameJson.length` par le nombre d'octets UTF-8 aux 2 endroits de `studio/src/game/mcp.ts` (helper partagé si pertinent) et vérifier `tsc` passe sans nouvelle erreur
- [x] 1.2 Ajouter un test client avec `gameJson` accentué (publication acceptée, `size` égal aux octets reçus) et vérifier le test échoue sans le fix puis passe avec

## 2. Non-régression et documentation

- [x] 2.1 Relancer les tests serveur catalogue et les smokes Studio existants et vérifier 100 % verts (aucune entrée existante impactée)
- [x] 2.2 Vérifier le message d'aide / l'écran de publication mentionne que le catalogue clé sur l'identifiant stable (`gameId`), et ajuster le texte si absent
