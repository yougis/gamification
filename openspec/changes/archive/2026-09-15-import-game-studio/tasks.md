# Tâches — Import de fichier dans le Studio

## Tâches

- [x] T1. Ajouter la fonction `importGame` au MCP Studio — `studio/src/game/mcp.ts` : fonction `importGame(file: File): Promise<Game>` qui lit le fichier, parse le JSON, retourne le Game object. Dépendances : aucune.
- [x] T2. Ajouter le bouton "Importer" dans la barre d'outils — `studio/src/App.tsx` : bouton "Importer" à côté de "Exporter", via `window.showOpenFilePicker` avec fallback `<input type="file">`. Dépendances : T1.
- [x] T3. Implémenter la logique d'import dans le state — `studio/src/App.tsx` : `handleImport(file)` → `importGame(file)` → `validateGame(game)` → si OK dispatch `{ t: "set", snap: { game, meta: emptyMeta() } }`, sinon afficher `brut`/`rapport`. Dépendances : T1, T2.
- [x] T4. Ajouter le glisser-déposer — `studio/src/App.tsx` : handlers `onDrop`/`onDragOver` sur le conteneur principal. Dépendances : T3.
- [x] T5. Ajouter l'historique des imports — `studio/src/App.tsx` : chemins récents dans `localStorage` (max 10), proposés au menu "Importer". Dépendances : T3. Note : les navigateurs ne fournissent pas le chemin réel du fichier ; à clarifier (noms seuls vs File System Access API).
- [x] T6. Remplacer `chargerFixture` par `importGame` générique — `studio/src/App.tsx` : le bouton "Exemple" devient ou est complété par "Importer" via sélecteur de fichiers. Dépendances : T3.
- [x] T7. Ajouter les libellés FR dans i18n-ui.ts — `studio/src/game/i18n-ui.ts` : `IMPORTER: { nom: "Importer", aide: "Charger un fichier JSON de jeu" }`. Dépendances : T2.
- [x] T8. Créer le fichier démo `game-sherlock-holmes.json` — `studio/src/game/game-sherlock-holmes.json` : "L'Affaire Moriarty", 6 objets, 9 nœuds, ESCAPE_GAME, holdMode. Dépendances : aucune.
- [x] T9. Créer les assets du jeu démo — `studio/src/game/assets/` : icons SVG par objet, image Baker Street, marqueur AR, manifest SHA-256. Dépendances : T8.
- [x] T10. Mettre à jour le thème CSS — `studio/src/styles/theme.css` : `.theme-victorian` (burgundy/or/sépia). Dépendances : aucune.
- [x] T11. Ajouter les icônes partagées — `studio/src/assets/*.svg` : copies des SVG du jeu. Dépendances : aucune.
- [x] T12. Tester la validation complète — `game-sherlock-holmes.json` passe Draft-07 + applicative et se charge dans le Studio. Dépendances : T1, T3, T8.

## Priorité

| Priorité | Tâches |
|----------|--------|
| Haute | T1, T2, T3, T8, T9, T10, T11 |
| Moyenne | T4, T5, T6, T7 |
| Basse | T12 |
