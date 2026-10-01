## Context

Chaîne de publication : `exportPackFull` (`studio/src/game/mcp.ts`, 2 copies du calcul `size` de `game.json`) → `publishGame` (`studio/src/game/catalog.ts`, transport pur) → `POST /publish` (`catalog/server.js:179`, compare octets et SHA). Le SHA est cohérent (UTF-8 des deux côtés) ; seul `size` diverge (`String.length` vs `Buffer.byteLength`). Voir proposal.md (Why) et le delta de spec pour le contrat.

## Goals / Non-Goals

**Goals:**
- Rendre la publication robuste à tout contenu UTF-8, sans toucher au serveur (qui a raison).
- Verrouiller par test le cas accentué qui a révélé le bug.
- Clarifier par écrit l'identité catalogue, sans changer de comportement.

**Non-Goals:**
- Renommage de `gameId`, double affichage, migration d'entrées existantes (écart assumé, pas de code).
- Refonte du pipeline de publication ou du manifest.

## Decisions

### D1: Corriger côté Studio, pas côté serveur

**Choix:** `size = new TextEncoder().encode(gameJson).length` aux 2 endroits de `mcp.ts`, via un helper partagé si le doublon s'y prête ; `server.js` inchangé.

**Raison:** Le contrat manifest (`size` = octets, comme l'assument déjà `estimateSize`, `checkQuota`, `launchGate` et la vérification serveur) est correct — c'est l'émetteur qui le viole. Assouplir le serveur masquerait de futurs émetteurs fautifs.

### D2: Écart d'identité documenté, zéro code

**Choix:** La distinction `gameId` (clé stable) vs `branding.name` (libellé) vit uniquement dans la spec et, si pertinent, dans le message d'aide existant — aucune action de renommage, aucun affichage supplémentaire.

**Raison:** Option retenue par l'auteur en exploration ; tout comportement de renommage créerait une rupture (nouveau code, nouvelle entrée) disproportionnée au besoin exprimé.

## Risks / Trade-offs

- **[Doublon mcp.ts]** → Les 2 copies peuvent re-diverger. Mitigation : helper unique + test couvrant les deux chemins d'export s'ils partagent le helper.
- **[Faux sentiment côté tuiles/assets]** → Eux sont déjà en octets (`bytes.length`, `File.size`) ; le test accentué porte sur `game.json` uniquement, sans régression sur le reste (smokes existants).
