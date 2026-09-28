## MODIFIED Requirements

### Requirement: Regles applicatives obligatoires

Le validateur applicatif SHALL verifier sans ACTIVE : graphe sans cycle non autorise, atteignabilite `isEnding` sous hypothese favorable (sauf HOME-seul vide), pools topo, `drawCount<=len`, unicite, AND-exclusif direct. Il SHALL verifier replay/abandon budgetes et vocabulaire `hors-delai` sans solveur temporel. Exemption HOME-seul inchangee.

#### Scenario: Convergence profonde non garantie
- **GIVEN** deux branches de pool qui convergent apres 3 noeuds intermediaires vers un AND
- **WHEN** le validateur applicatif controle
- **THEN** il ne promet pas de detecter l'inatteignabilite et le documente comme limite connue

#### Scenario: Jeu HOME-seul exempté d'isEnding
- **GIVEN** un jeu avec `global.presentation: ["HOME"]` et `nodes: []`
- **WHEN** le validateur applicatif controle
- **THEN** il est accepté sans erreur `isEnding`, avec mention de la session sans fin
