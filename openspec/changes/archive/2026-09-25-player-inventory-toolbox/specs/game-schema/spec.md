## MODIFIED Requirements

### Requirement: Objet Noeud complet

Chaque Nœud SHALL porter : `id` (unique dans le Jeu), `module {type, data}`,
`activation {requires[] (>=1), operator}`, `latch` (booléen, défaut `true`),
`onReentry` (`ignore` défaut | `replay`), `maxReentries` (requis si `replay`),
`scoreOnReplay` (défaut `false`), `isEnding` (défaut `false`), `randomPool`
(si Nœud `RANDOM_POOL`), `inventoryAccess` (booléen optionnel, défaut `true` :
`false` masque l'icône d'inventaire sur cet écran). Types inconnus en `module.type` SHALL rester valides
en couche 1 (compatibilité traitée en applicatif).

#### Scenario: Replay sans borne rejeté en couche 1

- **GIVEN** un Nœud `onReentry:replay` sans `maxReentries`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle rejette (requis conditionnel via `if/then`)

#### Scenario: Accès inventaire masqué sur une épreuve

- **GIVEN** un Nœud avec `inventoryAccess: false`
- **WHEN** la validation Draft-07 tourne
- **THEN** elle accepte (champ optionnel déclaré)
