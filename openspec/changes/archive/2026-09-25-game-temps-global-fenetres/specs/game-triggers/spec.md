## ADDED Requirements

### Requirement: Fenêtre temporelle relative WINDOW

Le type réservé `WINDOW` SHALL être défini comme fenêtre sur le temps écoulé depuis
`GAME_START` (jamais d'horloge murale : offline-cohérent) : `{ apresSecondes?, avantSecondes? }`
(numbers ≥ 0, au moins un des deux requis via `anyOf`), `additionalProperties: false`.
La condition SHALL être vraie quand `elapsed >= apresSecondes` (si posé) ET `elapsed < avantSecondes`
(si posé). Comme `GEOFENCE`, `WINDOW` est révocable : à l'échéance (`elapsed >= avantSecondes`),
le nœud SHALL retomber `LOCKED` même si `latch: true`, sortir de la file d'attente, et ne peut plus
redevenir éligible par cette condition. Une modale déjà ACTIVE à l'échéance SHALL se terminer
normalement, puis le nœud retombe `LOCKED` (pas d'expulsion, pas de ré-entrée).
`WINDOW` SHALL se combiner avec les autres conditions via `operator` (`AND`/`OR`) existant.

#### Scenario: Déverrouillage à 120s

- **GIVEN** un nœud avec `activation: {requires: [{type: WINDOW, apresSecondes: 120}]}`
- **WHEN** le temps écoulé passe 120s
- **THEN** la condition devient vraie (puis le reste)

#### Scenario: Verrouillage après 600s

- **GIVEN** un nœud `latch: true` avec `activation: {requires: [{type: WINDOW, avantSecondes: 600}]}`, joueur éligible à 500s
- **WHEN** le temps écoulé passe 600s
- **THEN** le nœud retombe `LOCKED` et sort de la file

#### Scenario: Fenêtre sans borne rejetée en couche 1

- **GIVEN** une condition `WINDOW {}` sans `apresSecondes` ni `avantSecondes`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (au moins une borne requise via `anyOf`)

#### Scenario: Combinaison TIMER et WINDOW

- **GIVEN** un nœud avec `activation: {requires: [{type: TIMER, anchor: GAME_START, delaySeconds: 120}, {type: WINDOW, avantSecondes: 600}], operator: AND}`
- **WHEN** le temps écoulé vaut 300s
- **THEN** les deux conditions sont vraies et le nœud est éligible
