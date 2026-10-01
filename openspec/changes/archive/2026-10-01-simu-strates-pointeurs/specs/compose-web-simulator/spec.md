## ADDED Requirements

### Requirement: Conteneurs traversants en simu

En simu (lecture seule), les conteneurs de mise en page SHALL être traversants aux pointeurs : cadre, conteneurs des couches (`coucheFond`, `couchePleinEcran`), zones et wrappers de widgets. Aucun conteneur SHALL former un rectangle attrape-clics invisible : un geste qui ne touche aucun contrôle opaque SHALL atteindre la couche du dessous, jusqu'au fond.

#### Scenario: Pan sur zone vide au-dessus du fond
- **GIVEN** une carte plein écran en fond avec une zone content vide au-dessus, en simu
- **WHEN** l'auteur glisse sur la zone vide
- **THEN** la carte panne (le geste traverse la zone)

#### Scenario: Couche plein écran sans effet de masque
- **GIVEN** un widget plein écran non-fond affiché avec une carte en fond, en simu
- **WHEN** l'auteur clique en dehors du widget, sur le fond visible
- **THEN** le fond reçoit le geste (la couche ne fait pas écran)

### Requirement: Seuls les contrôles actionnables sont opaques

En simu, SHALL redevenir opaques aux pointeurs : les boutons (widget, volet, marqueur, Terminer/Abandonner), le cadre de la carte interactive (pan/zoom/clics), et le contenu du module (inputs quiz, tuiles puzzle, contrôles du volet). Les widgets texte, image, spacer, progression et les aperçus statiques SHALL rester traversants : cliquer un texte en simu SHALL agir sur le fond dessous, jamais sélectionner (pas de sélection en simu).

#### Scenario: Bouton au-dessus du fond
- **GIVEN** un bouton dans le header avec une carte en fond, en simu
- **WHEN** l'auteur clique le bouton
- **THEN** l'action du bouton s'exécute et la carte ne panne pas

#### Scenario: Texte traversant vers le fond
- **GIVEN** un widget texte au-dessus d'une carte en fond, en simu
- **WHEN** l'auteur clique le texte puis glisse
- **THEN** rien n'est sélectionné et la carte panne

#### Scenario: Quiz jouable au-dessus du fond
- **GIVEN** un module quiz affiché avec une carte en fond, en simu
- **WHEN** l'auteur coche une réponse
- **THEN** la réponse est prise en compte, sans score ni event

### Requirement: Chute vers le fond et overlay modal

Tout geste qui ne touche aucun contrôle opaque SHALL chuter vers le widget de fond (carte : pan/zoom ; autre fond : rien). Derrière un overlay non fermable, le fond SHALL rester inaccessible (voile modal assumé) ; avec `fermable`, le clic-fond masque la surimpression comme aujourd'hui.

#### Scenario: Geste dans le vide
- **GIVEN** un écran simu avec carte en fond et aucun contrôle sous le curseur
- **WHEN** l'auteur glisse
- **THEN** la carte panne

#### Scenario: Overlay non fermable bloque le fond
- **GIVEN** un écran simu avec overlay sans `fermable` par-dessus une carte en fond
- **WHEN** l'auteur glisse sur le voile
- **THEN** rien ne panne (modal assumé), sans erreur
