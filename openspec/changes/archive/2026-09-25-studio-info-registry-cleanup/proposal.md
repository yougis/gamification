## Why

L'enregistrement d'INFO au registre (change module-info-story) a laissé deux régressions d'intégration : la liste des types proposés à la création contenait `INFO` deux fois (warning React « same key », option dupliquée), et les nœuds `start` par défaut portaient `data: {}` devenu invalide C1 depuis que le sous-schéma INFO exige `schemaVersion` + `steps`. Le registre doit être la source unique des types, et tout jeu produit par le Studio (y compris vide) doit naître avec des données de module valides.

## What Changes

- **Liste de création dédupliquée** : les types proposés à la création d'étape = entrées du registre (+ `RANDOM_POOL` structurel), sans doublon, sans liste fermée codée en dur qui dérive.
- **Nœud `start` valide** : le `start` par défaut (jeu vide, import sans nœud) porte des données INFO valides C1 (`schemaVersion` + un step de bienvenue générique).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `module-registry`: la liste des types proposés à la création dérive du registre, sans doublon.
- `studio-authoring`: le nœud `start` par défaut porte des données de module valides C1.

## Impact

- **Code** : Studio uniquement (`App.tsx` liste de types, `App.tsx` + `mcp.ts` nœuds `start`) ; schéma graphe inchangé, aucun consommateur impacté.
- **Compatibilité** : jeux existants inchangés ; l'import d'un fichier sans nœud produit désormais un `start` C1-valide côté module.
- **Hors périmètre** : `activation.requires: []` du `start` par défaut (tension pré-existante avec C1 `minItems: 1`, à traiter dans un change dédié si besoin).
