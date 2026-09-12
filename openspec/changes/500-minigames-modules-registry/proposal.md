## Why

Le registre 000 est une mécanique vide : sans les 5 contrats de modules socle,
aucun Nœud n'est rendable et le framework ne produit aucun jeu. Ce change fige
les sous-schémas, besoins et fallbacks des 5 types, prouvant l'extensibilité sur
du concret (dont les pipelines AR et 7-erreurs les plus exigeants).

## What Changes

- `QUIZ` : questions/options/index/explication/points, `timeLimitSeconds` +
  `onTimeout` internes, auto-validation traçée en triche.
- `DIFFERENCE_GAME` : source + dérivée + **polygones %** (Alpha→polygones au
  build MCP, `simplifyPx`) + `touchDilatation` ; masque brut jamais embarqué ;
  relecture overlay `draft|reviewed|published`.
- `PUZZLE` : image + découpage + configuration, tactile + clavier.
- `AR_MARKER` : marqueur + modèle 3D + **fallback 2D obligatoire**, ARKit/ARCore
  seuls (Leaflet/WebXR/Unity exclus), lissage anti-saut d'ancres.
- `BOUSSOLE` : `toleranceDeg`, stabilisation, `onTimeout`, fallback non-capteur ;
  lit le service heading, valide en interne.
- Chaque type déclare `needs*`, version de sous-schéma, fallbacks (métal,
  permission, capteur absent) ; type inconnu = non jouable avec message.

## Capabilities

### New Capabilities

- `minigame-modules`: contrats des 5 types socle (données, besoins, fallbacks).

### Modified Capabilities

- Aucune (remplit le registre 000 sans toucher Nœuds/Liens ni le schéma 100
  au-delà du montage `$ref` prévu).

## Impact

- 5 sous-schémas consommés par : Studio (formulaires dynamiques), runtime
  (rendu + validation interne), pipeline build (Alpha→polygones, assets 3D).
- Réseau : 0 (assets dans le pack manifesté).
- Dépend de : `100` (`$ref`), `400` (hôte isolé, services), `000` (archivé).
