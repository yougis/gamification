## Context

Voir `proposal.md` (Why). État observé (`studio/src/components/MapView.tsx:68-89`) : style raster dur `/tiles/{z}/{x}/{y}.png`, `map.on("error")` → `console.warn` seul, marqueurs/cercles montés seulement après `load`, aucun listener `webglcontextlost`. Proxy dev Vite (`vite.config.ts:16-27`) vers OSM avec UA dédiée — correct, mais sans défense contre la rafale ni retour visible.

## Goals / Non-Goals

**Goals:**
- Carte toujours utilisable (marqueurs/cercles/clavier) même sans tuiles ni GPU.
- Moins de 502 à la source (parallélisme conforme à la politique OSM).
- Échec visible en dev (pastille + message), pas seulement console.

**Non-Goals:**
- Pas de changement du chemin tuiles du pack (prod/offline inchangé).
- Pas de cache applicatif de tuiles (le cache HTTP navigateur suffit).
- Pas de refonte du rendu indoor (non concerné).

## Decisions

- **Seuil d'erreurs compteur, pas premier échec** : quelques 502 isolés (tuile manquante ponctuelle) ne doivent pas faire basculer toute la carte ; bascule après N erreurs sur fenêtre glissante (ex. 6 en 30 s), réversible si les tuiles reviennent.
- **Pastille + fond uni, marqueurs conservés** : reprend le vocabulaire visuel existant (pastille validation) ; les marqueurs/cercles sont montés indépendamment du `load` tuiles.
- **`maxParallelImageRequests: 2` + retry exponentiel court** : aligné sur la politique OSM (2 connexions), sans librairie ajoutée (options natives MapLibre).
- **Message dev sur échecs proxy en boucle** : pastille cliquable détaillant la cause (proxy/dev), invisible quand tout va bien ; rien en prod.

## Risks / Trade-offs

- [Faux positifs offline] → Mitigation : en l'absence totale de réseau, le compteur bascule vite — c'est le comportement voulu (fond uni immédiat).
- [WebGL perdu puis récupéré] → Mitigation : bascule définitive pour la session (recréer le contexte est fragile) ; rechargement = nouvel essai.
- [Seuil arbitraire] → Mitigation : constante nommée unique, ajustable en une ligne.
