## Why

Le terminal du Mode Jeux (Prévisualiser) rend son `PhoneCanvas` en `phone-portrait` codé en dur (`PlayerTerminal.tsx:91`), tout comme la salle d'attente HOME (`ApercuAccueil.tsx:40`). L'auteur qui compose un écran en tablette paysage ou téléphone paysage dans Screen ne peut pas vérifier son rendu côté joueur : il doit retourner au Composer et comparer de mémoire. Les 4 viewports existent déjà côté Screen (`VIEWPORTS`, `BarreViewports`, `screenViewport`) mais n'atteignent jamais le terminal.

## What Changes

- Le terminal joueur simulé expose le même sélecteur de viewport que Screen (téléphone portrait/paysage, tablette portrait/paysage), avec la même mise à l'échelle plein-cadre sans ascenseur en paysage.
- La salle d'attente du Mode Jeux (aperçu HOME) reçoit le même sélecteur, sur le même état.
- L'état viewport est partagé avec Screen (`screenViewport` existant) : le choix suit entre composition et prévisualisation, reste local d'édition, jamais persisté dans le JSON.
- Comportement de simulation inchangé : transitions, triche tracée, file FIFO, sortie Échap/bouton.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: le terminal joueur simulé et la salle d'attente du Mode Jeux offrent les 4 viewports d'aperçu de Screen sur état partagé (précise « Prévisualisation traçée », muette sur le viewport du terminal).

## Impact

- Code : `studio/src/components/wysiwyg/PlayerTerminal.tsx` (prop `viewport` + sélecteur en barre de terminal), `studio/src/components/ApercuAccueil.tsx` (prop `viewport`), `studio/src/App.tsx` (partage `screenViewport`, mesure plein-cadre zone terminal). `PhoneCanvas` inchangé (accepte déjà `viewport?` + `scale?`).
- Schéma graphe : inchangé ; aucun consommateur impacté (viewport jamais persisté).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
