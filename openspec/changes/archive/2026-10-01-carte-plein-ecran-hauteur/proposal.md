## Why

Un widget carte avec `pleinEcran: true` ne remplit pas le cadre téléphone : la couche breakout (`absolute inset-0`, ordre correct) existe, mais la hauteur ne se propage pas — le renderer carte peint un bandeau fixe (`h-40`) en haut, laissant voir l'écran normal et ses fantômes (« + Pied de page », « + Surimpression ») en dessous. La spec exige déjà que le widget « remplisse le cadre téléphone » : c'est une non-conformité du rendu, pas un manque de spec.

## What Changes

- Propager `h-full` dans la chaîne breakout en contexte plein écran : wrapper PhoneCanvas → `WidgetRenderer` (contexte breakout) → `MapWidgetRenderer` / `CarteInteractiveSimu` (hauteur pleine au lieu de `h-40`) ; tuiles `object-cover` et marqueurs en % suivent sans autre changement.
- Réévaluer le seuil de grille tuiles (`zoomApercu`, 12 max) pour un cadre plein écran.
- Empilement inchangé (zones puis breakout puis overlay au sommet), fantômes inchangés et toujours dessous/cliquables en édition.

## Capabilities

### Modified Capabilities
- `studio-screen-builder`: hauteur effective des widgets `pleinEcran` (remplissage réel du cadre, pas seulement sortie du flux).

## Impact

- `studio/src/components/wysiwyg/PhoneCanvas.tsx` (wrapper breakout), `WidgetRenderer.tsx` (contexte), `MapWidgetRenderer.tsx` + `CarteInteractiveSimu.tsx` (hauteur pleine), `studio/src/game/pack.ts` (`zoomApercu`, seuil éventuel).
- Schéma Draft-07 inchangé (`pleinEcran` déjà déclaré) ; validateur inchangé ; runtime joueur natif/PWA inchangé (rendu Studio uniquement).
- Aucune valeur réservée touchée ; aucun réseau ajouté ; aucune dépendance à un change non archivé.
