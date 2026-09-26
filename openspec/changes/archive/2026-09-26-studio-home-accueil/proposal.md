## Why

Le mode `HOME` existe (spec + players) mais reste fantôme côté auteur : `setPresentation` n'est appelé nulle part dans le Studio, `jeuVide` force `["MAP"]`, et sans `HOME` dans le JSON le tableau de bord n'apparaît jamais. Par ailleurs, même avec `HOME`, le tableau n'est qu'une vue par défaut éphémère (remplacée dès qu'une modale ACTIVE s'ouvre, sans retour direct) : il faut en faire un point d'entrée permanent du player.

## What Changes

- **Configurateur présentation dans le Studio** : nouveau panneau `PresentationPanel` dans l'écran Configuration (cases à cocher des 7 modes MAP/LIST/STORY/CLUE/TOOLBOX/TIMELINE/HOME via l'opération MCP `setPresentation` existante, traçée undo/redo) ; rappel du preset `navigationModel` et avertissement si un `presentationNeeds` de module n'est pas couvert (même calcul que l'inspecteur) ; aperçu du tableau de bord quand `HOME` est coché (via le PlayerTerminal ou un aperçu dédié).
- **Onglet Accueil permanent côté player** : quand `presentation` inclut `HOME`, le player expose en permanence une entrée « Accueil » (tab/barre) qui affiche le tableau de bord, y compris quand une autre vue est active ; la règle d'affichage par défaut (tableau si aucune modale ACTIVE) est inchangée ; ouvrir/fermer ne produit ni transition ni event (comme aujourd'hui).
- Vues toujours exclusives (pas de superposition) : le choix acté en exploration (« Onglet Accueil », changement minimal).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: panneau de configuration des présentations (cases, preset, avertissements, aperçu HOME).
- `game-navigation`: `HOME` comme entrée permanente (onglet Accueil), pas seulement vue par défaut.
- `viewer-orchestrator`: règle de rendu de l'onglet Accueil (disponibilité, contenu identique au tableau, sans transition).

## Impact

- Code : Studio (`PresentationPanel` écran Config, câblage `setPresentation`, aperçu), shared Compose (`GeoPlayNav` : entrée Accueil), natif Android (même entrée), PWA (via `GeoPlayApp` partagé).
- Schéma graphe : inchangé (l'enum contient déjà `HOME`) ; aucun consommateur à mettre à jour.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local, offline-first préservé.
- Aucune dépendance à un change précédent non archivé, à une exception près : `player-home-dashboard` (terminé, non archivé) définit le contenu du tableau ; ce change n'ajoute que l'entrée permanente et le configurateur. Ordre d'archive recommandé : `player-home-dashboard` d'abord, puis rebaser ce delta si son contenu a bougé.
