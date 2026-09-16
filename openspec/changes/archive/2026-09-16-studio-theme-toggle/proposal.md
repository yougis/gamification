## Why

Le Studio utilise un thème sombre imposé — aucun moyen de basculer vers un thème clair. L'éditeur de nom du jeu est enfoui dans le panneau Configuration globale, inaccessible sans naviguer vers cet écran. Ces deux manques réduisent l'ergonomie du Studio pour les auteurs travaillant en environnement peu lumineux ou souhaitant un accès rapide au nom du jeu.

## What Changes

- **Bouton de bascule sombre/clair** dans la barre globale du Studio. Le thème clair définit les variables CSS `:root` sur des fonds clairs et textes sombres. Le choix est persisté dans `localStorage`.
- **Nom du jeu éditable dans la barre globale** : un champ texte inline à côté du nom de l'écran, permettant de modifier `game.branding.name` sans ouvrir le panneau Configuration globale. Le même `edit` + `setBranding` est utilisé, pas de nouveau MCP.
- **Fix du build error** : correction de la référence `type` sur `RequestInit` dans `mcp.ts` (propagation OXC de la propriété).

## Capabilities

### New Capabilities

- `studio-theme-toggle`: Bascule sombre/clair pour le Studio, avec persistance `localStorage` et application via classe CSS sur `<html>`.

### Modified Capabilities

- `branding-identity`: Ajout d'un scénario « Nom éditable dans la barre globale » pour rendre le `branding.name` accessible depuis l'en-tête du Studio (le panneau Configuration globale reste la source d'édition complète).

## Impact

- **Code** : `studio/src/styles/theme.css` (ajout `.theme-light`), `studio/src/App.tsx` (bouton toggle + champ nom dans le header), `studio/src/game/mcp.ts` (fix build error).
- **Aucun changement de schéma** : pas de modification du JSON jeu, du Draft-07, ni du runtime natif.
- **Aucun impact offline** : le thème est un choix UI local, jamais synchronisé.
- **Compatibilité ascendante** : les jeux existants ne sont pas affectés. La classe `.theme-light` est ajoutée uniquement côté Studio.
