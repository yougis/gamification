## Purpose

Évaluer si un jeu donné tourne sur tel player (natif ou PWA) à partir de son graphe, de ses conditions et des besoins de ses modules, et rendre un verdict par canal affiché à l'export comme au lancement.

## ADDED Requirements

### Requirement: Matrice des capacités par player

Le registre SHALL exposer, pour chaque canal (`NATIVE`, `PWA`), ses capacités :
GPS premier plan, GPS de fond, boussole, caméra/AR, cartes hors-ligne,
verrouillage OS, persistance garantie. La matrice SHALL être lue depuis une
donnée versionnée, jamais codée en dur dans le validateur. Valeurs de
référence : la PWA ne SHALL jamais déclarer le GPS de fond ni le
verrouillage OS.

#### Scenario: Matrice PWA sans fond GPS

- **GIVEN** la matrice des capacités versionnée
- **WHEN** on lit la ligne `PWA`
- **THEN** GPS de fond et verrouillage OS sont absents, GPS premier plan et cartes hors-ligne sont présents

### Requirement: Évaluation jeu et modules par canal

Le validateur SHALL évaluer chaque jeu contre chaque canal en croisant :
conditions d'activation (`GEOFENCE` exigeant le fond, `PROXIMITY_MASTER`
exigeant le BLE), besoins des modules (`needsGPS`, `needsCompass`,
`needsCamera`, `needsMap`, `needsLock`), `holdMode`, et stratégies de
tuiles. Pour chaque canal il SHALL rendre : `compatible`, `dégradé` (avec la
liste des replis appliqués : fallback 2D, sans-capteur, Guided Access), ou
`refusé` (avec chaque motif fautif nommé : nœud, champ, capacité manquante).

Un jeu QUIZ/PUZZLE/DIFFERENCE sans capteur SHALL être `compatible` partout.
Un jeu exigeant le GPS de fond SHALL être `refusé` en PWA et `compatible` en
natif. Un `AR_MARKER` SHALL être `dégradé` (fallback 2D) en PWA.

#### Scenario: Jeu GPS de fond refusé en PWA

- **GIVEN** un jeu dont une activation exige un `dwell` GPS écran verrouillé
- **WHEN** la compatibilité est évaluée
- **THEN** verdict PWA `refusé` (motif nommé), verdict natif `compatible`

#### Scenario: AR dégradé avec repli

- **GIVEN** un jeu avec un nœud `AR_MARKER` et fallback 2D déclaré
- **WHEN** la compatibilité est évaluée
- **THEN** verdict PWA `dégradé` (repli : fallback 2D), verdict natif `compatible`

#### Scenario: Quiz public compatible partout

- **GIVEN** un jeu QUIZ sans capteur ni verrouillage
- **WHEN** la compatibilité est évaluée
- **THEN** verdicts `compatible` en natif comme en PWA

### Requirement: Verdicts visibles à l'export et au lancement

L'écran d'export du Studio SHALL afficher le verdict par canal avant
génération et SHALL bloquer l'export vers un canal `refusé` (un canal
`dégradé` exporte avec l'avertissement des replis). Au lancement, le player
SHALL réévaluer son propre canal et refuser avec motifs si le pack ne lui
convient pas, même si le pack est intègre.

#### Scenario: Export PWA bloqué avec motif

- **GIVEN** un jeu refusé en PWA (GPS de fond)
- **WHEN** l'auteur choisit le canal `PWA` à l'export
- **THEN** l'export est bloqué, chaque motif est nommé, le canal natif reste proposé
