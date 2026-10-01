## ADDED Requirements

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
