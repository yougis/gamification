# player-compatibility Specification

## Purpose

Évaluer si un jeu donné tourne sur le player natif à partir de son graphe, de ses conditions et des besoins de ses modules, et rendre un verdict natif affiché à l'export comme au lancement.

## Requirements

### Requirement: Verdict natif unique

Le validateur SHALL evaluer chaque jeu contre le seul canal natif en croisant : conditions d'activation, besoins des modules (`needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock`), `holdMode` et strategies de tuiles. Pour le canal natif il SHALL rendre : `compatible` ou `refuse` (avec chaque motif fautif nomme : noeud, champ, capacite manquante). Il n'existe plus ni verdict PWA ni etat degrade avec repli.

#### Scenario: Quiz compatible natif
- **GIVEN** un jeu QUIZ sans capteur ni verrouillage
- **WHEN** la compatibilite est evaluee
- **THEN** le verdict natif est `compatible`

#### Scenario: Module sans verrouillage refuse sans HOLD
- **GIVEN** un jeu avec un module `needsLock: true` et `holdMode: "none"`
- **WHEN** la compatibilite est evaluee
- **THEN** le verdict natif est `refuse` avec le module fautif nomme

