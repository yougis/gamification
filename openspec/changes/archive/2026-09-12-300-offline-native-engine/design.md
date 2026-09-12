## Context

Voir `proposal.md` (Why). Le schéma 100 définit manifest et structure ; les
specs 000 imposent partiel-non-lançable et SQLite. Contrainte : iOS + Android,
arrière-plan OS hétérogène, packs pouvant dépasser 500 Mo.

## Goals / Non-Goals

**Goals:**

- Installation intègre prouvée, mises à jour au différentiel, reprise fiable.
- Carte offline configurable avec dégradés gracieux documentés.
- Progression et tirages survivant au crash et au redémarrage.

**Non-Goals:**

- Le rendu carte lui-même au-delà de l'intégration MapLibre (400).
- La sync P2P/serveur (différé 600 ; le hub MASTER physique est noté, pas implémenté).
- L'optimisation "ultrarapide" magique : parallèle + delta + reprise suffisent.

## Decisions

- **SHA-256 par fichier, pas de hash global seul.** Pourquoi : localise la faute
  et autorise le différentiel ; le global seul forcerait le re-téléchargement total.
- **Dézip en worker, pas sur le fil UI.** Pourquoi : archives de centaines de Mo
  sans geler l'app ; progression rapportée.
- **Partiel = non lançable (strict).** Pourquoi : un Jeu à moitié installé ment
  (POI sans quiz, carte sans tuiles). Alternative rejetée : lancement dégradé —
  imprévisible à tester et à supporter.
- **MapLibre Native, pas Mapbox/Leaflet.** Pourquoi : licence offline compatible,
  packs natifs, pas de WebView ; Leaflet/WebXR réintroduiraient le web abandonné.
- **SQLite unique pour progression + tirages.** Pourquoi : atomicité d'écriture
  (tirage + état en une transaction), survie au crash, pas de stores multiples.

## Risks / Trade-offs

- [Quota iOS purgeant les fichiers] → Mitigation : marquage no-backup/no-purge +
  revérification SHA au lancement.
- [Background download tué par l'OS] → Mitigation : reprise systématique + état
  explicite, jamais de reprise silencieuse supposée complète.
- [Pack > Go sur petit appareil] → Mitigation : chiffrage avant + packs par zone,
  refus poli si espace insuffisant.
