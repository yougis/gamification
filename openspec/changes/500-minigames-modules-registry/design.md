## Context

Voir `proposal.md` (Why). Registre 000 (mécanique), `$ref` 100 (montage), hôte
isolé + services 400 (exécution). Contrainte : 5 contrats testables sans mobile
pour 4 d'entre eux, AR sur appareil.

## Goals / Non-Goals

**Goals:**

- 5 sous-schémas versionnés + fallbacks documentés + relecture humaine.
- Preuve d'extension : un 6e type s'ajoute sans toucher racine ni graphe.
- Pipelines build (Alpha→polygones, assets 3D) définis en entrées/sorties.

**Non-Goals:**

- Nouveaux types au-delà des 5 (exercés en exemple seulement).
- Le rendu pixel-par-pixel (maquettes en implémentation).
- Les outils MCP de conversion (contrats d'interface ici, code au 200/300).

## Decisions

- **Validation interne aux modules, jamais remontée brute.** Pourquoi : temps,
  tolérances et stabilisations sont du gameplay, pas de l'orchestration ; le
  Nœud ne connaît que `COMPLETED`/abandon (+ flag capteur journalisé).
- **Polygones % + dilatation, masque jamais embarqué.** Pourquoi : responsive,
  poids divisé, jouabilité gantée ; le raster auteur reste côté build.
- **Fallback 2D obligatoire pour l'AR.** Pourquoi : soleil, permissions, vieux
  appareils — une étape non complétable bloque le Jeu entier (`isEnding`
  inatteignable). Le fallback est une exigence, pas une option.
- **Seuils depuis le JSON, y compris `toleranceDeg`.** Pourquoi : même épreuve
  réglable enfant/expert via overrides sans changer le module.
- **Crash isolé par l'hôte 400.** Pourquoi : un modèle 3D corrompu marque le
  nœud non jouable au lieu de tuer la session.

## Risks / Trade-offs

- [Modèles 3D lourds vs pack offline] → Mitigation : budgets de taille par
  module + fallback 2D, vérifiés au manifest.
- [Polygones trop simplifiés (`simplifyPx` agressif)] → Mitigation : relecture
  overlay obligatoire avant `reviewed`.
- [Tolérance boussole trop stricte près du métal] → Mitigation : fallback
  systématique + `onTimeout` court.
