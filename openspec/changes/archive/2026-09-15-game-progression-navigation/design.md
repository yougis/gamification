## Context

Le moteur GeoPlay actuel est conçu autour d'un modèle unique : la navigation géographique via GPS et géofences. Le graphe de jeu (`LOCKED → UNLOCKED → ACTIVE → COMPLETED`) et les conditions d'activation (`GEOFENCE`, `NODE_COMPLETED`, `TIMER`, `POOL_DRAWN`, `PROXIMITY_MASTER`, `CONDITIONAL`, `WINDOW`) sont déjà flexibles mais confondent la notion de "comment le joueur se déplace" avec "comment une étape est activée".

L'architecture existante comprend :
- Studio MCP (TypeScript) produisant le même JSON que le runtime consomme
- Runtime natif Kotlin avec GameEngine, GameMcp, GameDao, GameDatabase, GameRepository, PackManager
- SQLite pour la persistance, manifest SHA-256 pour les packs
- Registre de modules extensible (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE)
- Validation double couche (Draft-07 + applicative)

La séparation entre discovery, activation, effects et presentation est nécessaire pour supporter les modèles de navigation variés sans casser la compatibilité ascendante.

## Goals / Non-Goals

**Goals:**
- Séparer les couches de progression, discovery, activation, effects, inventaire et présentation
- Permettre à un même moteur de supporter BASIC, GUIDED, TREASURE_HUNT, ESCAPE_GAME, OPEN_EXPLORATION
- Maintenir la compatibilité totale avec les jeux existants
- Rendre le GPS optionnel
- Ajouter un système d'inventaire sans imposer de paradigme

**Non-Goals:**
- Multijoueur et synchronisation P2P (déjà dans roadmap 600)
- Mécanismes AR avancés (déjà dans 500)
- Génération automatique de jeux
- Système économique / achats
- Mécaniques RPG complexes
- Interface Studio complète pour les nouvelles fonctionnalités (c'est un evolvement, pas une refonte du Studio)

## Decisions

### D1 : Les nouvelles couches sont des propriétés optionnelles des nœuds

Les champs `discovery`, `effects`, `inventoryRef` sont ajoutés aux nœuds du graphe comme propriétés optionnelles. Si absents, le moteur applique des valeurs par défaut (`VISIBLE_NOW`, aucun effet, pas d'inventaire).

**Pourquoi :** La compatibilité ascendante est une règle non-négociable. Les jeux existants fonctionnent sans modification.

**Alternative considérée :** Ajouter un système parallèle de "couches fonctionnelles" séparées du graphe. Rejetée car cela complexifie le moteur et le Studio.

### D2 : Les modèles de navigation sont des presets fonctionnels, pas des moteurs distincts

Les modèles (BASIC, GUIDED, etc.) sont des configurations qui combinent 6 dimensions fonctionnelles : progression, discovery, activation, inventory, effects, presentation. Chaque preset définit une configuration de référence pour ces dimensions.

Un preset NE verrouille PAS le jeu. L'auteur sélectionne un preset puis modifie individuellement chaque mécanisme. Le preset est un point de départ, pas une contrainte.

| Dimension | BASIC | GUIDED | TREASURE_HUNT | ESCAPE_GAME | OPEN_EXPLORATION |
|-----------|-------|--------|---------------|-------------|------------------|
| Progression | GRAPH | SEQUENTIAL | CLUE | GRAPH | GRAPH |
| Discovery | MAP | NEXT | CLUE | CONDITIONAL | MAP |
| Activation | GEOFENCE | AUTO | GEOFENCE | ITEM_REQUIRED | GEOFENCE |
| Inventory | OFF | OFF | ITEM_REQUIRED | ON | OFF |
| Effects | NONE | NONE | REVEAL | GIVE_ITEM/REVEAL | NONE |
| Presentation | MAP | STORY | CLUE+MAP | CLUE+TOOLBOX | MAP |

**Pourquoi :** Éviter la multiplication de moteurs et permettre des combinaisons hybrides. L'ajout d'un nouveau type de jeu ne nécessite pas de nouveau moteur — il suffit de combiner des mécanismes existants différemment.

**Alternative considérée :** Des moteurs de gameplay séparés par type. Rejetée car elle crée de la duplication et empêche les hybrides.

### D3 : Discovery est indépendante de l'activation

La découverte (comment une étape devient visible) est séparée de l'activation (ce qui permet de lancer une étape). Une étape peut être visible mais non activable, et vice versa.

**Pourquoi :** Dans un escape game, un indice peut être visible (découvert) sans être activable (il faut d'abord obtenir un objet). Confondre ces deux concepts rend le moteur incompréhensible.

**Alternative considérée :** Fusionner discovery et activation. Rejetée car cela empêche le scénario où un joueur voit un objectif mais ne peut pas l'atteindre immédiatement.

### D4 : L'inventaire est optionnel et persistant en SQLite

L'inventaire est un système optionnel qui s'intègre à la persistance existante en SQLite. Si aucun objet n'est défini, l'inventaire est inactif.

**Pourquoi :** Les jeux BASIC ne doivent pas avoir la complexité d'un inventaire. L'inventaire est une couche ajoutable, pas obligatoire.

**Alternative considérée :** Inventaire toujours actif. Rejetée car elle impose une complexité inutile pour les jeux simples.

### D5 : Le Player adapte son interface selon la configuration

Le Player mobile sélectionne les modes de présentation selon `global.presentation` et `global.navigationModel`. Le player ne force jamais une vue carte.

**Pourquoi :** Un jeu narratif n'a pas besoin de carte. Un escape game a besoin de la boîte à outils. Le player doit être adaptable.

**Alternative considérée :** Interface fixe avec carte toujours visible. Rejetée car elle empêche les jeux non-geographiques.

### D7 : Presets comme configuration JSON modifiable

Le preset est représenté dans le JSON du jeu via `global.navigationModel` et `global.preset` (optionnel). L'auteur peut sélectionner un preset puis surcharger individuellement chaque mécanisme. Le moteur résout la configuration finale en fusionnant le preset avec les surcharges.

```json
{
  "global": {
    "navigationModel": "ESCAPE_GAME",
    "preset": "ESCAPE_GAME",
    "activation": { "override": "PHYSICAL" }
  }
}
```

**Pourquoi :** Permettre la combinaison hybride sans complexifier le Studio. L'auteur commence par un preset, puis ajuste.

**Alternative considérée :** Configuration manuelle complète sans preset. Rejetée car trop complexe pour l'auteur.

**Alternative considérée :** Préfixes comme contraintes figées. Rejetée car l'utilisateur doit pouvoir créer des jeux hybrides.

## Risks / Trade-offs

- **Complexité du validateur** : L'ajout de nouveaux types de conditions augmente la complexité du validateur applicatif → Mitigation : validation par type via `$ref` discriminant, test systématique avec le jeu-5poi existant
- **Surface du Studio** : Le Studio doit afficher de nouveaux formulaires pour discovery, effects, inventaire → Mitigation : Les formulaires sont générés depuis les sous-schémas du registre, découplés de la logique graphe
- **Performance de l'orchestrateur** : L'évaluation des conditions de discovery et effects ajoute des vérifications → Mitigation : Évaluation lazy, cache des états de discovery
- **Risque de surcharge schema** : Trop de nouvelles propriétés sur les nœuds → Mitigation : Toutes les nouvelles propriétés sont optionnelles, le schema racine reste lisible

## Migration Plan

1. Le moteur charge les jeux existants sans propriétés `discovery`, `effects`, `inventoryRef` → application des valeurs par défaut
2. Le validateur traite les nouveaux types comme des extensions des conditions existantes
3. Le Player BASIC existant ne change pas son comportement
4. Les jeux peuvent migrer progressivement vers les nouvelles fonctionnalités sans casser le fonctionnement existant

## Open Questions

- Comment le Studio doit-il visualiser les graphes de progression complexe (branches, convergence) ? Le canvas actuel supporte déjà les arêtes d'activation ; il faut décider si les arêtes de progression sont visuelles ou implicites
- L'inventaire doit-il supporter des quantités (stackable) ou uniquement des objets individuels ? Pour le MVP, les objets sont individuels (stackable par défaut mais non implémenté)
- Le système de variables (MODIFY_VARIABLE) doit-il être générique ou spécifique à l'inventaire ? MVP : variables limitées aux états liés à l'inventaire et à la progression
- Les effets doivent-ils être exécutés de manière synchrone ou asynchrone ? MVP : synchrone (écriture SQLite immédiate)
