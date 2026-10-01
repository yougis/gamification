## Why

12 changes ouverts audités au 2026-10-01 : 9 sont codés et valides (tâches 100 % cochées, code vérifié en place), 2 sont codés mais à cases non cochées (`indoor-plan-schema`, `pack-zip-diff-tuiles`), 1 est devenu contradictoire avec le socle (`preview-pwa-iframe` : iframe `/emulate` interdite par `compose-web-simulator` + `studio-authoring`). Ce change ne garde que le résidu pertinent et acte l'abandon du reste.

## What Changes

- **Repris (résidu pertinent)** :
  - `indoor-plan-schema` : rafraîchir le delta `game-schema` périmé (recopier les scénarios `dureeTotale/finDeTemps`, `HOME-seul`, `inventoryAccess` ajoutés depuis — `openspec validate` refuse l'archive sinon), cocher les tâches déjà codées (`types`, schéma, `validate.ts`, `setNodePosition`/`computeBbox`, `MapView`), trancher `add/removeIndoorPlan` (ajouter ou déclarer hors-périmètre si l'édition inline suffit).
  - `pack-zip-diff-tuiles` : seule la validation croisée 4.1 reste (`openspec validate` + tests Studio/KMP/app + smokes, zéro régression) — `.zip`, `tiles.json`, diff atomique et cohérence manifest↔index déjà codés (`mcp.ts`, `App.tsx genererZip`, `PackManager.kt`).
  - `screen-subpages` : remplacer le 4.1 « Rejouer sur la PWA déployée » par un test parité KMP (portrait+paysage, swipe+boutons, `paginateContent` Studio ≡ `shared`, Sherlock oracle) — la PWA n'est plus une cible.
- **Retiré (inutile/contradictoire, sans report)** :
  - `preview-pwa-iframe` en entier : iframe PWA, endpoint `/emulate`, `?game/?cheat/?session`, cible configurable — contredit `compose-web-simulator` (« SHALL ne plus exister ») et le simulateur sans-PWA déjà archivé (2026-09-30). Aucune tâche reportée (le 3.1 « parcours émulé » est couvert par le test KMP ci-dessus).
  - Pastille `pack actif`, `predicate` manquant, quiz vide, `size` octets, strates fond/flottant, hauteur `pleinEcran`, viewport carte, tuiles effectives, menu packs, `tilePackId` : déjà codés et couverts par leurs deltas valides — aucun report, archive directe.

## Capabilities

### New Capabilities
- Aucune.

### Modified Capabilities
- `game-schema`: rafraîchir le delta indoor (`indoorPlans`, `node.position`) avec les scénarios socle ajoutés depuis (durée, HOME-seul, inventoryAccess) pour rendre l'archive possible.
- `player-screen-render`: pagination sous-pages vérifiée sur renderer partagé + terminal simu (cible PWA supprimée).

## Impact

- Code : `studio/src/game/schema/game-schema.json`, `types.ts`, `validate.ts`, `mcp.ts` (retouche indoor marginale éventuelle) ; `studio/src/game/screen-utils.ts`, `player/shared` + `PlayerTerminal` (test parité uniquement, pas de comportement nouveau) ; `PackManager.kt` + export `.zip` (vérification uniquement).
- Schéma graphe Noeuds/activation/registre/branding/manifest : inchangé (deltas existants déjà valides).
- Réseau : aucun ajouté (génération tuiles auteur en ligne déjà admise, joueur strictement offline).
- Les 12 changes listés ci-dessous sont archivés (11 en `done`, `preview-pwa-iframe` en rejet documenté comme supplanté) ; seul ce change reste ouvert.
