## ADDED Requirements

### Requirement: Invariant navigation moteur

La navigation SHALL ne jamais ecrire : ouvrir, fermer, revenir, changer d'onglet = zero transition, zero event. Seuls Valider et Abandonner SHALL toucher le moteur.

#### Scenario: Aller-retour carte
- **WHEN** le joueur ouvre un volet puis revient HOME
- **THEN** aucun event n'est emis et les etats sont inchanges

### Requirement: Consultation selon decouverte

Non decouvert SHALL rester invisible et non ouvrable. LOCKED decouvert SHALL ouvrir en apercu (titre, sans questionnaire). UNLOCKED SHALL ouvrir en jouable. COMPLETED SHALL ouvrir en relecture/rejeu.

#### Scenario: Etape cachee non eventee
- **WHEN** un noeud ON_CLUE non revele existe
- **THEN** aucun marqueur ni volet n'apparait

### Requirement: Effets une seule fois

Les effets SHALL s'appliquer a la premiere completion uniquement, sauf regle explicite contraire. Le moteur SHALL decider score selon `scoreOnReplay`.

#### Scenario: Rejeu sans double don
- **WHEN** le joueur rejoue une etape GIVE_ITEM
- **THEN** l'objet n'est pas redonne et le score suit `scoreOnReplay`
