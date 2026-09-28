## Context

Voir `proposal.md` (Why). État observé : `PlayerTerminal.tsx:91` et `ApercuAccueil.tsx:40` codent `viewport="phone-portrait"` ; Screen pilote `PhoneCanvas` via `screenViewport` (`App.tsx:349`) + `BarreViewports` (`App.tsx:206`, accordéon P2 replié avec badge) + mesure plein-cadre (`cadreEcranRef`, `scaleEcran`, `formatEcran`). `PhoneCanvas` accepte déjà `viewport?: ViewportId` et `scale?` — aucun changement de son côté.

## Goals / Non-Goals

**Goals:**
- Mêmes 4 formats, mêmes dimensions, même plein-cadre paysage dans le terminal et la salle d'attente.
- Un seul état (`screenViewport`), jamais persisté.
- Simulation strictement inchangée (transitions, triche, FIFO, sortie).

**Non-Goals:**
- Pas de changement de `PhoneCanvas`, du schéma, des renderers de modules ni de la logique de simulation.
- Pas de persistance du choix (ni JSON, ni localStorage — comme Screen aujourd'hui).
- Pas de refonte de la barre du terminal (le sélecteur s'y insère, compact comme ailleurs).

## Decisions

- **Prop `viewport: ViewportId` sur `PlayerTerminal` et `ApercuAccueil`** (défaut `phone-portrait` pour les autres appelants) plutôt qu'un contexte : 2 consommateurs, signature explicite, aucun provider à maintenir.
- **État partagé `screenViewport` passé depuis App** plutôt qu'un état local au terminal : le besoin exprimé est la continuité Screen ↔ Mode Jeux ; rouvrir le terminal conserve le format (scénario du delta).
- **Sélecteur compact réutilisant `VIEWPORTS`** dans la barre du terminal (mêmes libellés/tooltips que `BarreViewports`) : pas de second composant divergent ; si `BarreViewports` est factorisable sans cycle d'import (il vit dans App), l'implémentation l'extraira, sinon un sélecteur local minimal aux mêmes libellés.
- **Mise à l'échelle comme Screen** : mesure de la zone centrale du terminal (ref locale, même calcul que `scaleEcran`) pour le plein-cadre paysage ; en portrait, rendu natif comme aujourd'hui.

## Risks / Trade-offs

- [Cycle d'import App ↔ wysiwyg] → Mitigation : le terminal ne reçoit que des props (`viewport`, pas de composant App) ; aucune importation depuis App dans wysiwyg.
- [Tablette paysage plus large que la fenêtre] → Mitigation : même calcul d'échelle que Screen (facteur < 1, cadre intégral, pas d'ascenseur).
- [Autres appelants d'ApercuAccueil] → Mitigation : défaut `phone-portrait` = comportement actuel inchangé pour eux.
