## MODIFIED Requirements

### Requirement: Regles applicatives obligatoires

Le validateur applicatif SHALL verifier : construction du graphe de
dependances en ignorant les aretes `allowCycle:true` puis rejet de tout
cycle residuel ; atteignabilite d'un `isEnding` sous hypothese explicite
d'environnement favorable ; `RANDOM_POOL` et `OR` comme alternatifs ;
chaque candidat de pool vers un `isEnding` ; detection AND-sur-branches-
exclusives limitee au cas direct (enfants `NODE_COMPLETED` directs vers
candidats distincts d'un meme pool `drawCount:1`, sans fermeture
transitive) ; ordre topo des pools `ON_GAME_START` et rejet des cycles
inter-pools ; rejet d'un pool `ON_GAME_START` dependant d'un candidat de
pool `ON_POOL_ACTIVATION` ; `drawCount<=candidates.length` ; unicite d'un
`nodeId` dans un seul pool. La limite transitive SHALL etre documentee
comme volontaire (pas de solveur complet au socle) avec consigne de garder
les convergences de branches peu profondes.
Exemption HOME-seul : quand `HOME` figure dans `global.presentation` et que
`nodes` est vide, les contrôles `isEnding` et atteignabilité sont sautés
(session sans fin assumée, sortie par Quitter) ; toutes les autres règles
restent applicables aux jeux non vides.

#### Scenario: Convergence profonde non garantie

- **GIVEN** deux branches de pool qui convergent apres 3 noeuds intermediaires vers un AND
- **WHEN** le validateur applicatif controle
- **THEN** il ne promet pas de detecter l'inatteignabilite et le documente comme limite connue

#### Scenario: Jeu HOME-seul exempté d'isEnding

- **GIVEN** un jeu avec `global.presentation: ["HOME"]` et `nodes: []`
- **WHEN** le validateur applicatif controle
- **THEN** il est accepté sans erreur `isEnding`, avec mention de la session sans fin
