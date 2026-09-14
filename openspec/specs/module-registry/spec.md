# module-registry Specification

## Purpose

Definit le registre de modules GeoPlay permettant d'ajouter des mini-jeux sans toucher au schema Noeuds/Liens.

## Requirements

### Requirement: Registre extensible versionne

Chaque type de Module (socle : QUIZ, DIFFERENCE_GAME/7-erreurs, PUZZLE,
AR_MARKER, BOUSSOLE ; futurs types) SHALL
s'enregistrer avec son sous-schema versionne, ses besoins
(`needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock` optionnel) et son rendu.
Ajouter un module ne SHALL jamais modifier le schema des Noeuds/Liens,
seulement ajouter une entree au registre. Le moteur SHALL ignorer
gracieusement un type inconnu avec message au lieu de crasher.

#### Scenario: Nouveau type sans refonte

- **GIVEN** un Jeu existant valide et un nouveau type enregistre
- **WHEN** le moteur v0 lit un Jeu sans ce type puis un Jeu avec ce type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le module sans changement du schema graphe

#### Scenario: Type inconnu non bloquant

- **GIVEN** un Jeu referencant un type que le moteur v0 ne connait pas
- **WHEN** le moteur charge le Jeu
- **THEN** le Noeud est marque non jouable avec message au lieu de faire echouer le Jeu

#### Scenario: Nouveau type avec needsLock

- **GIVEN** un 7e type enregistre avec `needsLock: true` dans le registre
- **WHEN** le moteur v0 lit un Jeu sans ce type puis un Jeu avec ce type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le module avec le verrouillage kiosque actif si holdMode != none

### Requirement: Module flag needsLock

Chaque module enregistre SHALL pouvoir contenir le champ optionnel
`needsLock` (bool, defaut `false`). Un module `needsLock: true`
NE PEUT ETRE JOUE QUE si `global.holdMode != "none"`. Si un jeu
avec un module `needsLock: true` est configure avec `holdMode: "none"`,
le validateur applicatif rejette le jeu (couche 2) avec une erreur
explicitement liee au module.

#### Scenario: Module besoin de LOCK valide

- **GIVEN** un module AR_MARKER avec `needsLock: true`
- **WHEN** le jeu est configure avec `holdMode: "guidedAccess"`
- **THEN** le module est jouable, le verrouillage kiosque est actif
  pendant la session AR

#### Scenario: Module LOCK sans HOLD rejeté

- **GIVEN** un module AR_MARKER avec `needsLock: true`
- **WHEN** le jeu est configure avec `holdMode: "none"`
- **THEN** le validateur applicatif rejette le jeu avec erreur :
  "Module AR_MARKER necessite holdMode != none"

#### Scenario: Module sans needsLock fonctionne dans HOLD

- **GIVEN** un module QUIZ avec `needsLock: false` (defaut)
- **WHEN** le jeu est en `holdMode: "guidedAccess"`
- **THEN** le module fonctionne normalement, le verrouillage kiosque
  s'applique globalement mais le module n'a pas de contrainte
  supplementaire

### Requirement: Donnees jamais en dur et assets versionnes

Toutes les valeurs de configuration (rayons et overrides, predicats,
seuils capteurs, URLs, `bbox/minZoom/maxZoom`, tailles) SHALL etre lues
depuis le JSON du Jeu. Les assets SHALL etre references par un manifest
`{path, version, size, sha256}` avec stockage natif fichiers app + SQLite,
archive pre-tuilee dezippee en worker, verification SHA-256, diff par
version, reprise et background download ; un telechargement partiel SHALL
rester non lancable. Fond imagerie configurable avec fallback image
statique. Trace GPX SHALL servir de base auteur pour poser les POI plus
polyline display globale optionnelle ; toute trace par module est differee
hors socle.

#### Scenario: Manifest partiel bloque le lancement

- **GIVEN** un manifest dont 1 fichier sur 20 a un SHA-256 faux
- **WHEN** le moteur verifie le pack offline
- **THEN** seul ce fichier est retelecharge et le Jeu ne se lance pas avant integrite complete

### Requirement: BOUSSOLE service moteur reutilisable en module

La boussole SHALL etre un service moteur non-validant (fleche vers le POI +
distance texte + haptique redondant, jamais couleur seule), alimente par le
heading nord vrai lisse avec accuracy. L'orchestrateur ne SHALL jamais
valider un cap. Un module enigme BOUSSOLE SHALL pouvoir consommer le meme
flux heading et valider en interne (`toleranceDeg`, stabilisation,
`onTimeout`) avec fallback non-capteur. Si le capteur manque ou est
interfere (metal, coque magnetique), le Jeu SHALL rester jouable (carte +
distance, fleche masquee avec message discret).

#### Scenario: Interferences sans blocage jeu

- **GIVEN** un POI avec guidance boussole pres d'une grille metallique
- **WHEN** le heading devient instable
- **THEN** la fleche tremble ou se masque mais le POI reste activable par geofence et carte

### Requirement: 7-erreurs Alpha vers polygones au build

Le module 7-erreurs SHALL consommer source + derivee + masque Alpha auteur
(meme dimensions, 1 valeur alpha par difference) convertis hors-ligne au
build (MCP) en polygones en % avec `simplifyPx`, stockes dans le JSON avec
`touchDilatation` pour le doigt/gants (cible tactile minimale). Le player ne
SHALL jamais charger le masque brut. La validation humaine SHALL voir
l'overlay source + polygones avec statuts `draft|reviewed|published` ;
`draft` SHALL etre refuse au joueur sauf mode animateur-triche.

#### Scenario: Zone fine jouable au doigt

- **GIVEN** une difference filiforme de 4 px delimitee exactement
- **WHEN** le joueur tape a cote de 10 px avec dilatation parametree
- **THEN** le tap est valide comme dans la zone

### Requirement: Branding objet et modes systeme socle

Le branding SHALL etre un objet de donnees (global + surcharge par Noeud,
ex. AR plein ecran sans bandeau) pilote par le Studio, jamais une feuille
en dur. Les modes systeme socle SHALL se limiter a triche/test (bypass
`GEOFENCE` + auto-validation Quiz + `forceDraw`), preview Studio (meme
mecanisme de bypass, entree Studio), et HOLD kiosque (verrouillage
terminal pour flotte fournie + sortie animateur), avec flag triche
propage au scoring. Rejouabilite sans perte de stats, accessibilite
voix haute/contraste et autres modes sont en roadmap, hors socle.

#### Scenario: Triche tracee au score

- **GIVEN** un parcours realise avec bypass `GEOFENCE`
- **WHEN** les events remontent vers le scoring
- **THEN** chaque event porte le flag triche et n'est jamais confondu avec un parcours terrain

#### Scenario: Mode HOLD trace au scoring

- **GIVEN** un parcours realise avec HOLD actif, bypass `GEOFENCE`
  via panneau admin
- **WHEN** les events remontent vers le scoring
- **THEN** chaque event porte le flag triche et le flag `holdMode`,
  et n'est jamais confondu avec un parcours terrain normal

#### Scenario: Triche en mode HOLD non confondue

- **GIVEN** un mode HOLD actif, l'animateur active le bypass
- **WHEN** le scoring analyse les events
- **THEN** le flag `holdMode: "guidedAccess"` est present sur chaque
  event, distinguant le parcours kiosque d'un parcours terrain
