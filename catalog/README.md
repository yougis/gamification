# GeoPlay Catalog

Service de distribution des jeux : le Studio publie, les players récupèrent
par code à 4 chiffres. Zéro dépendance (Node 20+Lar suffit).

```bash
npm test          # 6 tests, ~200 ms
CATALOG_DATA_DIR=./data CATALOG_PORT=3000 npm start
```

Routes : `GET /health`, `POST /publish`, `GET /games`,
`GET /games/:code[?v=n]`, `GET /games/:code/versions`,
`GET /games/:code/assets/*`.

Le code n'est **pas** une sécurité (simple identifiant). L'intégrité est
garantie côté player par le manifest SHA-256, jamais par le serveur.
