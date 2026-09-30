## Why

Quand la carte est plein écran en fond, ses actions de navigation meurent : les boîtes des widgets en flux (textes, spacers, images — opaques aux pointeurs mais sans action en simu) avalent les gestes au-dessus d'elle, et les conteneurs des couches breakout (`absolute inset-0`) forment des rectangles attrape-clics invisibles qui recouvrent cadre, fond et boutons. Symétriquement, un fond opaque peut recouvrir le premier plan. L'auteur ne peut ni travailler ses flottants à l'écran ni voir le rendu final agir correctement en simu.

## What Changes

- Contrat de pointeurs explicite en lecture/simu : conteneurs (cadre, couches, zones, wrappers) toujours traversants ; seuls redeviennent opaques les contrôles réellement actionnables (boutons, cadre de carte interactive, contenu de module : inputs quiz, tuiles puzzle, contrôles de volet).
- Textes, images, spacers, progressions, aperçus statiques et zones vides traversent vers le fond en simu ; un geste sans contrôle opaque tombe sur le fond (pan carte).
- Édition inchangée (clic = sélection, routage par sélecteur de calques conservé).
- Overlay non fermable inchangé : voile modal, fond inaccessible derrière (assumé).

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `compose-web-simulator`: contrat de traversée des pointeurs en simu (conteneurs traversants, contrôles opaques, chute vers le fond, overlay modal inchangé).

## Impact

- Code Studio uniquement : `PhoneCanvas` (conteneurs `coucheFond`/`couchePleinEcran`), `ZoneRenderer`/`WidgetRenderer` (opacité conditionnelle du wrapper), sans toucher au moteur, au graphe, ni aux specs de progression.
- Aucune écriture ajoutée, aucun event ajouté ; budget d'interaction inchangé.
- Non-couvert : proxy `/tiles` et tuiles (inchangés), aperçu auteur statique (inchangé), creux cliquables sous overlay non fermable (refusé : modal assumé).
