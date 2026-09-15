# Import de fichier JSON dans le Studio

## Contexte

Le Studio GeoPlay est une application React + TypeScript qui édite des jeux via un canvas graphe (ReactFlow). Actuellement, seul le chargement d'une fixture figée (`game-5poi.json`) est possible via `import()`. L'utilisateur ne peut pas ouvrir un fichier JSON arbitraire.

## Architecture actuelle

```
Studio (App.tsx)
  ├── State (useReducer) → Snap { game: Game, meta: StudioMeta }
  ├── validateGame(game) → { ok, layers[] }
  ├── chargerFixture() → import("./game/game-5poi.json")
  ├── validateGame → setBrut, setRapport
  └── exportPack(game, meta, manifest) → download
```

## Décisions de conception

### 1. File API pour l'import

Utiliser l'API `window.showOpenFilePicker` (Web API standard) pour sélectionner le fichier. Fallback vers `<input type="file">` pour les navigateurs qui ne supportent pas `showOpenFilePicker`.

```typescript
async function importGameFile(): Promise<Game | null> {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON GeoPlay', accept: { 'application/json': ['.json'] } }],
  });
  const file = await fileHandle.getFile();
  const text = await file.text();
  const game = JSON.parse(text);
  // Validation...
  return game;
}
```

### 2. Validation à l'import

Appeler `validateGame(game)` immédiatement après le parsing. Si `ok` est `false`, afficher les erreurs dans l'interface et **ne pas** mettre à jour l'état du Studio.

```typescript
const result = validateGame(game);
if (!result.ok) {
  setBrut(result.layers.flatMap(l => l.errors));
  setRapport(result.layers.flatMap(l => l.errors.map(erreurFR)));
  return; // Ne charge pas le jeu
}
```

### 3. Glisser-déposer

Ajouter des handlers `onDrop` et `onDragOver` sur le conteneur principal de l'application.

### 4. Historique des imports

Stocker les chemins récents dans `localStorage` sous la clé `geoplay-import-history`. Maximum 10 entrées.

```typescript
const history = JSON.parse(localStorage.getItem('geoplay-import-history') || '[]');
history.unshift(filePath);
localStorage.setItem('geoplay-import-history', JSON.stringify(history.slice(0, 10)));
```

### 5. Intégration avec le State

Le jeu importé remplace le `present` dans le reducer, comme `chargerFixture()`. Le `history` du reducer est préservé (undo fonctionne).

```typescript
dispatch({ t: "set", snap: { game: importedGame, meta: emptyMeta() } });
```

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `App.tsx` | Ajout bouton "Importer", handlers import, drag-and-drop |
| `mcp.ts` | Ajout fonction `importGame(file)` |
| `i18n-ui.ts` | Ajout libellés FR pour "Importer" |
| `App.tsx` | `chargerFixture` → `importGame` générique |

## Contraintes

- Offline-first : aucune requête réseau
- Validation bi-couche systématique
- Pas de modification du schéma JSON
- Le format pack (manifest + SHA-256) est distinct de l'import JSON brut
