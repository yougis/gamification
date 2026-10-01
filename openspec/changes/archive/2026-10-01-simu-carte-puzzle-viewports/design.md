## Context

Voir proposal.md (Why). État actuel : `CarteInteractiveSimu` pose la capture sur `e.target` (perdue vers l'image, handlers sur le cadre), sans `touch-action` ; `PlayerTerminal` ne transmet pas `lignesApercu` (tout retombe LOCKED) ; `ApercuAccueil` rend `PhoneCanvas` sans `scale` ; `PuzzlePlayerRenderer` utilise `d.image` brut alors que `PuzzleEditorPreview` passe par `urlAssetSession`.

## Goals / Non-Goals

**Goals:**
- Pan/zoom fiables souris + tactile dans la carte simu.
- Marqueurs fidèles à l'essai, ouvrables quand éligibles.
- Même taille de cadre par viewport dans les trois aperçus.
- Tuiles puzzle visibles côté joueur comme côté éditeur.

**Non-Goals:**
- Refonte du moteur tuiles / proxy `/tiles` (inchangés).
- Nouveau mock capteur (le GPS simu existant suffit).
- Changement du budget d'interaction (aucune écriture ajoutée).

## Decisions

- **Capture sur le cadre (`currentTarget`) plutôt que suivi de cible** : garantit la réception des mouvements quel que soit le point de départ ; alternative rejetée : attacher les handlers à chaque tuile (fragile, N écouteurs).
- **`touch-action: none` limité au cadre carte** (comme le puzzle en mode drag) : bloque le défilement navigateur sur la carte sans affecter le reste de l'écran.
- **Prop `lignesApercu` optionnelle sur le terminal** : absent = comportement historique (tout verrouillé), aucun autre appelant impacté.
- **Facteur d'échelle partagé** : extraire le calcul plein-cadre (déjà dupliqué Screen/terminal) dans un helper utilisé aussi par `ApercuAccueil`, plutôt qu'un troisième calcul.
- **Résolution d'image identique éditeur/joueur** : `urlAssetSession(d.image) || d.image` dans le player renderer, avec repli état vide sans image.

## Risks / Trade-offs

- [Risk] `touch-action: none` empêche le défilement tactile démarré sur la carte → Mitigation : périmètre limité au cadre carte (h-40 / plein écran), le reste de l'écran défile normalement.
- [Risk] Marqueurs éligibles ouvrables depuis l'aperçu du tableau : même présentation d'éligible, aucun event → pas de divergence moteur.
- [Risk] `urlAssetSession` indisponible hors session (assets non importés) → Mitigation : repli chemin brut existant, état vide si rien d'affichable.

## Migration Plan

Aucune migration : Studio uniquement, état local, pas de persistance ni de format modifié. Rollback = revert.

## Open Questions

Aucune.
