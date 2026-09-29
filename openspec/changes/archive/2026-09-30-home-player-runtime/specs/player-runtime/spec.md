## Purpose

Contrat du runtime joueur partage (Studio simu, PWA, natif) : moteur pur, environnement injectable, navigation explicite, ecritures Valider/Abandon.

## ADDED Requirements

### Requirement: Moteur pur trois etats

Le moteur SHALL exposer `LOCKED | UNLOCKED | COMPLETED` + flags `hors-delai?, replay?, abandon?, triche?`. Aucun etat `ACTIVE` SHALL exister.

#### Scenario: Cycle sans ACTIVE
- **WHEN** un noeud eligible est valide
- **THEN** il passe `UNLOCKED --> COMPLETED` en une ecriture

### Requirement: Environnement injectable

Le moteur SHALL recevoir `horloge`, `position`, `inventaire`, `tirages` injectes. La simu SHALL fournir un environnement simule (position deplacable, horloge acceleree).

#### Scenario: Simu sans GPS reel
- **WHEN** la position simulee entre dans le rayon
- **THEN** l'eligibilite est calculee comme avec un fix reel

### Requirement: Navigation explicite

L'etat navigation SHALL etre `HOME | Volet(id) | ETAPE(id, mode) | PLEIN_ECRAN | TOOLBOX`, sans ecriture ni event.

#### Scenario: Navigation libre
- **WHEN** le joueur navigue entre HOME et volet
- **THEN** aucun etat moteur ne change et aucun event n'est emis

### Requirement: Ecritures Valider et Abandon

Seuls `Valider` et `Abandonner` SHALL ecrire. `Valider` SHALL produire `COMPLETED` (+ effets premiere fois, + `hors-delai` si grace). `Abandonner` SHALL produire `ABANDON` sans effet ni score, idempotent par ouverture.

#### Scenario: Validation simple
- **WHEN** le joueur valide une etape UNLOCKED eligible
- **THEN** une ecriture `COMPLETED` est journalisee et la vue revient HOME

#### Scenario: Abandon trace
- **WHEN** le joueur abandonne une tentative jouable
- **THEN** un event `ABANDON` est journalise sans effet ni score

### Requirement: Snapshot et droit a finir

Le snapshot SHALL etre pris a l'entree etape (`t0`). Eligible a `t0` mais plus a `t1` SHALL valider avec flag `hors-delai`. Ineligible a `t0` SHALL ouvrir en apercu sans Valider possible.

#### Scenario: Grace temporelle
- **WHEN** la fenetre expire pendant la saisie
- **THEN** la validation reussit avec flag `hors-delai`

### Requirement: PlayerShell unique

Le simulateur Studio, la PWA et le natif SHALL consommer le meme PlayerShell. Simuler SHALL equivaloir a fournir un Environnement simule.

#### Scenario: Parite simu joueur
- **WHEN** le jeu de test 2 points tourne en simu puis en PWA
- **THEN** les transitions et events sont identiques
