# compose-web-simulator Specification

## Purpose

The Studio needs a way for authors to see the current screen and interact with it (click, navigate, type, mock sensors) without ever playing a real game, and the web is no longer a player channel, so this capability defines the Compose-wasm simulator contract.

## Requirements

### Requirement: Simulateur Compose web sans session

Le Studio SHALL offrir un simulateur rendant l'ecran courant via le renderer unique de `commonMain`, consomme en appel direct (jeu en memoire, jamais d'URL ni de telechargement). Le simulateur SHALL permettre : naviguer entre ecrans, cliquer boutons et widgets, repondre un quiz sans score, saisir un code sans validation moteur, deplacer la carte et ouvrir les volets, mocker GPS/boussole au clavier/souris. Le simulateur SHALL NE JAMAIS : creer de session, persister quoi que ce soit, scorer, journaliser des events de progression, consommer l'inventaire, ni fonctionner offline comme un player.

#### Scenario: Interaction sans ecriture
- **WHEN** l'auteur clique un bouton et repond un quiz dans le simulateur
- **THEN** l'ecran reagit visuellement et aucune session, aucun score, aucun event n'existe apres fermeture

#### Scenario: Mock capteur au clavier
- **WHEN** l'auteur simule une position GPS au clavier devant un noeud GEOFENCE
- **THEN** le noeud s'affiche eligible dans le simulateur sans toucher au JSON source

### Requirement: Budget d'interaction ferme

Seules les interactions listees au Requirement precedent SHALL exister dans le simulateur. Toute interaction de vraie partie (terminer, scorer, persister, consommer, telecharger tuiles ou pack offline) SHALL rester exclusive aux players natifs. Ajouter une interaction au simulateur SHALL exiger un change dedie, jamais un glissement silencieux.

#### Scenario: Tentative hors budget
- **WHEN** l'auteur cherche a valider definitivement une etape depuis le simulateur
- **THEN** le simulateur ne propose aucun controle de validation moteur, seulement la navigation et la saisie d'essai

### Requirement: Mocks capteurs clavier/souris

Le simulateur SHALL substituer chaque capteur physique indisponible sur ordinateur (GPS, gyroscope, boussole) par un mock manipulable au clavier/souris via injection de dependance. Aucun mock SHALL fuir vers les builds natifs.

#### Scenario: Boussole mockee
- **WHEN** l'auteur oriente la boussole simulee a 90 degres a la souris sur un noeud BOUSSOLE
- **THEN** le renderer affiche le cap simule et le JSON du jeu reste inchange

### Requirement: Carte simu navigable au pointeur et au tactile

Dans le simulateur, le cadre de la carte SHALL suivre le glissé (pan) et le zoom quel que soit le point de départ du geste (fond, tuile, marge) : la capture du pointeur SHALL être posée sur le cadre, jamais sur la cible. Sur tactile, le cadre SHALL porter `touch-action: none` pour que le glissé panne la carte au lieu de faire défiler la zone. Les boutons de zoom et Recentrer SHALL rester disponibles.

#### Scenario: Pan depuis une tuile
- **GIVEN** une carte simu affichant des tuiles, curseur sur une tuile
- **WHEN** l'auteur glisse vers la droite
- **THEN** le centre se déplace vers la gauche et de nouveaux marqueurs peuvent entrer dans la fenêtre

#### Scenario: Pan tactile sans défilement
- **GIVEN** la même carte sur écran tactile
- **WHEN** l'auteur glisse verticalement sur la carte
- **THEN** la carte panne et la zone d'écran ne défile pas

### Requirement: Marqueurs ouvrables selon l'état simulé

Dans le simulateur, chaque marqueur SHALL refléter l'état simulé de son étape (lignes d'essai transmises jusqu'à la carte, jamais recalculées localement) : un marqueur éligible SHALL proposer `Ouvrir` (présentation d'éligible existant, sans event), un marqueur verrouillé SHALL rester désactivé avec son motif. Sans lignes d'essai, le comportement historique (tout verrouillé) SHALL s'appliquer.

#### Scenario: Ouverture depuis la carte simu
- **GIVEN** un POI éligible dans l'essai, auteur devant la carte simu
- **WHEN** l'auteur clique le marqueur puis `Ouvrir`
- **THEN** l'écran de l'étape s'ouvre dans le terminal, sans écriture au JSON

#### Scenario: Sans essai, tout verrouillé
- **GIVEN** la carte simu sans lignes d'essai
- **WHEN** l'auteur clique un marqueur
- **THEN** le volet affiche `Verrouillé`, désactivé, sans effet

### Requirement: Tailles de viewport cohérentes entre aperçus

Pour un même viewport sélectionné, tous les rendus du Studio (vue Screen, terminal simulé, aperçu du tableau de bord) SHALL afficher le cadre aux mêmes dimensions : le calcul de mise à l'échelle plein-cadre (réduction seule, jamais d'agrandissement) SHALL s'appliquer partout, jamais seulement à certains aperçus.

#### Scenario: Tablette paysage identique partout
- **GIVEN** le viewport tablette paysage sélectionné avec un panneau plus petit que 1024×768
- **WHEN** l'auteur regarde la vue Screen, le terminal puis l'aperçu du tableau
- **THEN** les trois cadres ont la même taille mise à l'échelle, intégralement visibles

### Requirement: Image puzzle résolue dans le renderer joueur

Le renderer joueur du puzzle SHALL résoudre l'image source via le même mécanisme que l'aperçu éditeur (URL de session dans le Studio, chemin de pack côté natif) : une image configurée SHALL afficher ses tuiles découpées et mélangées, jamais des tuiles vides. Sans image source, l'état vide incitatif SHALL s'afficher comme dans l'éditeur.

#### Scenario: Tuiles visibles côté joueur
- **GIVEN** un PUZZLE avec image source et découpe 3×3, auteur dans le terminal
- **WHEN** l'écran du nœud s'affiche
- **THEN** 9 tuiles d'image mélangées sont visibles et jouables (tap-à-tap ou glisser selon `mode`)

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

### Requirement: Contrôle de masquage simu systématique

Dans le simulateur, tout overlay affiché SHALL proposer le contrôle de masquage (icône message, badge SIMULÉ), que `fermable` vaille `true` ou non : aucun écran simu SHALL rester bloqué derrière un voile sans sortie. Le masquage SHALL suivre la même sémantique que côté joueur (état conservé en mémoire, reprise = affichée, aucune transition, aucun event).

#### Scenario: Overlay non fermable masquée en simu
- **GIVEN** un écran simu avec overlay sans `fermable` par-dessus une carte en fond
- **WHEN** l'auteur touche le contrôle de masquage puis la carte
- **THEN** l'overlay se masque et la carte panne, sans écriture au JSON

#### Scenario: Réaffichage simu
- **GIVEN** le même écran avec l'overlay masquée
- **WHEN** l'auteur touche l'icône « message »
- **THEN** l'overlay réapparaît avec son état conservé
