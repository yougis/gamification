## ADDED Requirements

### Requirement: Sélecteur de viewport en icônes compactes

Les boutons de choix de viewport d'aperçu (téléphone portrait/paysage, tablette portrait/paysage) SHALL être des boutons icônes compacts : une icône par format (écran vertical ou horizontal, taille téléphone ou tablette), sans libellé texte permanent. Le libellé complet (format + dimensions) SHALL rester accessible via infobulle (`title`) et `aria-label`, et le viewport courant SHALL rester signalé (état actif + pastille de dimensions existante).

#### Scenario: Choix tablette paysage en un clic

- **GIVEN** la barre des viewports affichée avec 4 boutons icônes
- **WHEN** l'auteur clique l'icône tablette paysage
- **THEN** le canvas passe en 1024×768, le bouton porte l'état actif, et l'infobulle annonçait « Tablette paysage (1024×768) »

#### Scenario: Accessibilité conservée

- **GIVEN** les boutons icônes affichés
- **WHEN** l'auteur navigue au clavier avec un lecteur d'écran
- **THEN** chaque bouton annonce son format et ses dimensions via `aria-label`
