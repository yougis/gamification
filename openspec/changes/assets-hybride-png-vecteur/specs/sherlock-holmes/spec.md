## MODIFIED Requirements

### Requirement: Images embarquées et widgets image

Chaque écran de Nœud SHALL afficher au moins un widget `image` dont le `src` référence un asset PNG/JPG du pack (`assets/…`). Les assets existants SHALL être réutilisés (`baker-street`, marqueur et fallback Holmes rasterisés) et de nouveaux assets SHALL être créés pour les Nœuds sans visuel. Toute image référencée SHALL être enregistrée au manifest du pack (`path`, `size`, `sha256`) ; aucune image ne SHALL être chargée depuis le réseau pendant le jeu (offline-first). Les SVG originaux restent des sources hors-pack (jamais référencés par le JSON).

#### Scenario: Widget image vers asset du pack

- **GIVEN** un widget `{ type: "image", src: "assets/baker-crime.png" }` sur un Nœud et l'entrée correspondante au manifest avec son SHA-256
- **WHEN** le joueur ouvre le Nœud offline sur Android comme dans le Studio
- **THEN** l'image s'affiche depuis les fichiers locaux des deux côtés

#### Scenario: Image hors-pack refusée

- **GIVEN** un widget image référençant une URL réseau ou un fichier absent du manifest
- **WHEN** l'export du pack tourne
- **THEN** l'export est refusé avec le fichier fautif nommé
