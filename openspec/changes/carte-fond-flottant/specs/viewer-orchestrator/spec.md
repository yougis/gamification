## ADDED Requirements

### Requirement: Strates player avec parité natif/PWA

Le player (natif via le partagé KMP, et PWA, via leurs renderers respectifs) SHALL rendre le même empilement à 3 strates que le Studio : FOND (widget d'arrière-plan déclaré, navigable : drag/zoom tactiles et boutons), FLOTTANT (contenu par-dessus, lisible, carte visible dans les creux), OVERLAY (modale existante au sommet). Le fond SHALL rester interactif sous le flottant : un geste démarrant sur un creux (ni widget, ni volet, ni contrôle) SHALL naviguer la carte ; un geste démarrant sur un widget SHALL aller au widget. Naviguer SHALL ne produire ni transition d'état ni event, comme toute interaction strate 2. Le rendu SHALL rester offline (fonds pack-only existants).

#### Scenario: Drag dans un creux navigue

- **GIVEN** un joueur sur un écran à carte en fond avec texte flottant
- **WHEN** il glisse depuis une zone vide entre les textes
- **THEN** la carte se déplace, sans event ni transition

#### Scenario: Texte flottant lisible et cliquable

- **GIVEN** le même écran
- **WHEN** le joueur touche le widget texte
- **THEN** le texte réagit (sélection/lecture) et la carte ne bouge pas

#### Scenario: Parité des trois rendus

- **GIVEN** un écran à strates validé
- **WHEN** il s'affiche dans le Studio, le natif et la PWA
- **THEN** l'ordre fond → flottant → overlay est identique partout (test de parité : même écran, 3 rendus comparés)
