## Why

La sélection des étapes est aujourd'hui incohérente : aucun bouton ne permet de tout sélectionner / tout désélectionner, un clic simple dans le graphe laisse l'ancienne sélection multiple intacte, et la liste ne connaît que la sélection simple — graphe et liste affichent donc deux sélections différentes pour le même jeu.

## What Changes

- **Action « Tout sélectionner / Tout désélectionner »** : un bouton (barre du graphe + en-tête de la liste, même action) sélectionne toutes les étapes du jeu ou vide toute sélection (`sel` + `selMulti`). Le libellé SHALL refléter l'état (tout sélectionner quand rien/une partie est sélectionné, tout désélectionner quand tout est sélectionné).
- **Sélection unique partagée graphe ↔ liste** : la sélection affichée est identique des deux côtés — union de `sel` (primaire, panneau détail) et `selMulti` (additive) ; sélectionner dans la liste surligne le nœud du canvas et inversement.
- **Sémantique clic / Maj+clic unifiée** : un clic simple sur un bloc (graphe) ou une ligne (liste) remplace la sélection par ce seul nœud (vide `selMulti`) ; Maj+clic ajoute/retire le nœud de la sélection courante sans toucher aux autres ; un clic sur le fond vide du canvas désélectionne tout.
- **Détail préservé** : le panneau détail suit toujours `sel` (le dernier nœud cliqué simplement, ou le dernier ajouté en Maj+clic) ; une sélection multiple n'ouvre jamais plusieurs panneaux.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : précision de l'exigence « Canvas graphe détaillé » — action tout sélectionner/désélectionner, sémantique clic-remplace / Maj-ajoute identique dans le graphe et la liste, sélection unique partagée entre les deux vues.

## Impact

- **Code** : `studio/src/App.tsx` (handlers `onNodeClick`/`onPaneClick`/`onSelectionChange`, `choisirNoeud` étendu au Maj+clic, bouton barre graphe), `studio/src/components/NodeList.tsx` (Maj+clic, bouton tout sélectionner, affichage `selMulti`).
- **Schéma graphe** : aucune modification — aucun consommateur impacté (Studio MCP, runtime natif, orchestrateur, modules du registre, packaging offline).
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre.
- **Réseau** : aucun — sélection 100 % locale, rien dans le JSON exporté.
- **Coordination** : `studio-graph-selection` (pipeline de sélection, 20/22 — `onPaneClick` et sync liste y sont promis en proposition mais non spécifiés) ; `studio-screen-wysiwyg` (reset de la sélection d'écran dans `choisirNoeud`, in-progress). Ce change spécifie ce que `studio-graph-selection` laissait en suspens côté sélection.
