## Purpose

Donne aux 5 modules socle des contrats rendables, validables et dégradables, prouvant que le registre s'étend sans toucher au graphe.

## ADDED Requirements

### Requirement: QUIZ avec temps interne

`QUIZ` SHALL porter questions, options, index correct, explication, points,
`timeLimitSeconds` + `onTimeout` (validation interne, jamais condition graphe).
L'auto-validation triche SHALL être traçée par flag.

#### Scenario: Timeout module sans toucher le graphe

- **GIVEN** un Quiz `timeLimitSeconds:30` non répondu à temps
- **WHEN** le délai expire
- **THEN** le module applique `onTimeout`, le Nœud reste `ACTIVE` jusqu'à sa décision

### Requirement: 7-erreurs polygones + dilatation

`DIFFERENCE_GAME` SHALL consommer source + dérivée + polygones % (+
`touchDilatation` minimale 44 px) ; le masque Alpha brut ne SHALL jamais être
embarqué. Zones exprimées en % (responsive). Relecture overlay avec statuts.

#### Scenario: Tap ganté à côté

- **GIVEN** une zone de 4 px avec dilatation 12 px
- **WHEN** le joueur tape à 10 px du bord exact
- **THEN** le tap est validé dans la zone

### Requirement: PUZZLE tactile et clavier

`PUZZLE` SHALL porter image + découpage + configuration, jouable au tactile et
au clavier (accessibilité de base), progression sauvegardée en SQLite.

#### Scenario: Reprise puzzle

- **GIVEN** un puzzle à moitié fait puis app tuée
- **WHEN** le joueur rouvre le Nœud
- **THEN** l'état est restauré depuis SQLite

### Requirement: AR_MARKER avec fallback 2D

`AR_MARKER` SHALL porter marqueur + modèle 3D + fallback 2D obligatoire,
rendu ARKit/ARCore avec lissage anti-saut. Sans caméra/permission/WebGL
indisponible : le fallback SHALL permettre de compléter l'étape.

#### Scenario: Soleil aveuglant sur marqueur

- **GIVEN** une détection AR impossible en plein soleil
- **WHEN** le joueur bascule en fallback
- **THEN** l'étape reste complétable et le flag capteur est journalisé

### Requirement: BOUSSOLE validante en interne

`BOUSSOLE` SHALL porter `toleranceDeg`, durée de stabilisation, `onTimeout` et
fallback non-capteur, lire le service heading partagé et valider en interne.
L'orchestrateur ne SHALL jamais recevoir de cap.

#### Scenario: Cap instable près d'une grille

- **GIVEN** un heading instable et un fallback code animateur
- **WHEN** la stabilisation échoue avant `onTimeout`
- **THEN** le module propose le fallback au lieu de bloquer
