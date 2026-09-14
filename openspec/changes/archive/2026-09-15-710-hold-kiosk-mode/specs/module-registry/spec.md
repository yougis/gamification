## Purpose

Le registre de modules GeoPlay permet d'ajouter des mini-jeux sans
toucher au schema Noeuds/Liens. Le mode HOLD ajoute un flag optionnel
`needsLock` pour signaler qu'un module nécessite le verrouillage kiosque.

## MODIFIED Requirements

### Requirement: Registre extensible versionne

Chaque type de Module (socle : QUIZ, DIFFERENCE_GAME/7-erreurs, PUZZLE,
AR_MARKER, BOUSSOLE ; futurs types) SHALL s'enregistrer avec son
sous-schema versionne, ses besoins (`needsGPS`, `needsCompass`,
`needsCamera`, `needsMap`, `needsLock` optionnel) et son rendu.
Ajouter un module ne SHALL jamais modifier le schema des Noeuds/Liens,
seulement ajouter une entree au registre. Le moteur SHALL ignorer
gracieusement un type inconnu avec message au lieu de crasher.

#### Scenario: Nouveau type sans refonte

- **GIVEN** un Jeu existant valide et un nouveau type enregistre
- **WHEN** le moteur v0 lit un Jeu sans ce type puis un Jeu avec ce
  type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le
  module sans changement du schema graphe

#### Scenario: Type inconnu non bloquant

- **GIVEN** un Jeu referencant un type que le moteur v0 ne connait pas
- **WHEN** le moteur charge le Jeu
- **THEN** le Noeud est marque non jouable avec message au lieu de
  faire echouer le Jeu

#### Scenario: Nouveau type avec needsLock

- **GIVEN** un 7e type enregistre avec `needsLock: true` dans le
  registre
- **WHEN** le moteur v0 lit un Jeu sans ce type puis un Jeu avec ce
  type sur moteur a jour
- **THEN** le premier joue a l'identique et le second rend le
  module avec le verrouillage kiosque actif si holdMode != none

### Requirement: Module flag needsLock

Chaque module enregistre SHALL pouvoir contenir le champ optionnel
`needsLock` (bool, defaut `false`). Un module `needsLock: true`
NE PEUT ETRE JOUE QUE si `global.holdMode != "none"`. Si un jeu
avec un module `needsLock: true` est configuré avec `holdMode: "none"`,
le validateur applicatif rejette le jeu (couche 2) avec une erreur
explicitement liee au module.

#### Scenario: Module besoin de LOCK valide

- **GIVEN** un module AR_MARKER avec `needsLock: true`
- **WHEN** le jeu est configuré avec `holdMode: "guidedAccess"`
- **THEN** le module est jouable, le verrouillage kiosque est actif
  pendant la session AR

#### Scenario: Module LOCK sans HOLD rejeté

- **GIVEN** un module AR_MARKER avec `needsLock: true`
- **WHEN** le jeu est configuré avec `holdMode: "none"`
- **THEN** le validateur applicatif rejette le jeu avec erreur :
  "Module AR_MARKER nécessite holdMode != none"

#### Scenario: Module sans needsLock fonctionne dans HOLD

- **GIVEN** un module QUIZ avec `needsLock: false` (defaut)
- **WHEN** le jeu est en `holdMode: "guidedAccess"`
- **THEN** le module fonctionne normalement, le verrouillage kiosque
  s'applique globalement mais le module n'a pas de contrainte
  supplementaire

### Requirement: Branding objet et modes systeme socle

Le branding SHALL etre un objet de donnees (global + surcharge par
Noeud, ex. AR plein ecran sans bandeau) pilote par le Studio,
jamais une feuille en dur. Les modes systeme socle SHALL se limiter
a triche/test, preview Studio, **et HOLD kiosque** (activation du
verrouillage terminal + sortie animateur), avec flag triche propage
au scoring. Rejouabilite sans perte de stats, accessibilite voix
haute/contraste et autres modes sont en roadmap, hors socle.

#### Scenario: Triche tracee au score

- **GIVEN** un parcours realise avec bypass `GEOFENCE`
- **WHEN** les events remontent vers le scoring
- **THEN** chaque event porte le flag triche et n'est jamais confondu
  avec un parcours terrain

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