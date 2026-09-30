## Why

Un overlay non-`fermable` est aujourd'hui un voile modal définitif : plein cadre, sans geste de sortie, il rend tout l'écran (dont une carte de fond) inatteignable en simu comme côté joueur. L'auteur ne peut ni tester le fond ni même l'overlay lui-même, et le joueur peut rester bloqué. Le schéma n'a pas à changer pour corriger ça : c'est le contrat de rendu qui doit garantir une sortie.

## What Changes

- **BREAKING** : tout overlay, `fermable` ou non, affiche un contrôle de fermeture (icône message, état conservé, reprise = affichée). La distinction `fermable` ne porte plus que sur le clic-fond (masquage au clic si `true`, fond inerte si `false`).
- Les jeux existants avec overlay non-fermable gagnent ce contrôle au runtime sans modification de leur JSON (aucune migration de données).
- Simu : le terminal affiche le contrôle de masquage sur tout overlay (même mécanique, badge SIMULÉ), débloquant le test du fond et de l'overlay dans tous les cas.
- Le runtime natif applique le même contrat (tâche dédiée dans ce change).

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `viewer-orchestrator`: fermeture universelle des overlays (contrôle message systématique, `fermable` restreint au clic-fond).
- `studio-screen-builder`: reflet auteur du contrôle (édition inchangée, pas de nouveau champ).
- `compose-web-simulator`: contrôle de masquage simu sur tout overlay.

## Impact

- Code : `PhoneCanvas` (voile + icône message), terminal simu, renderer natif (contrat + implémentation KMP).
- Schéma Draft-07 inchangé (`fermable` conservé, défaut `false`) : aucune migration de JSON, validation C1/C2 inchangée.
- Comportement : les overlays non-fermables existants deviennent refermables (BREAKING assumé, documenté).
- Non-couvert : creux cliquables sous overlay affiché (le voile reste modal tant qu'affiché), textes actionnables.
