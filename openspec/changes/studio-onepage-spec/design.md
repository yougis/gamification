## Context

État actuel : le Studio (`studio/src/App.tsx`) est une page unique à sections (graphe, liste, détail/inspecteur, essai, manifest, i18n) sans navigation par écrans, sans règle centrale de blocage d'export (deux portes `exportPack` / `exportPackFull` coexistent), et sans file de relecture dédiée. Le chantier `studio-layout-revamp` (en cours, `skip_specs`) remodèle l'enveloppe — panneaux redimensionnables/repliables, drill-down, reprise du rendu graphe — sans toucher au comportement. Voir `proposal.md` pour la motivation. Voir `specs/studio-authoring/spec.md` pour le contrat d'interface à atteindre.

## Goals / Non-Goals

**Goals:**
- Donner à chaque écran un état et des responsabilités propres, tous branchés sur le même état JSON + historique undo/redo.
- Centraliser la règle "export possible" en un seul point de calcul consommé par la barre globale, Relire et Exporter.
- Réduire les deux portes d'export à une seule voie visible par défaut.

**Non-Goals:**
- Aucun changement du schéma Draft-07, du validateur, du MCP, du runtime ou du packaging (l'interface reflète, elle ne redéfinit pas).
- Aucune refonte visuelle au-delà du découpage en écrans (le visuel reste du ressort de `studio-layout-revamp`).
- Pas de persistance serveur ni de requêtes réseau nouvelles (offline-first inchangé).

## Decisions

**1. Navigation par écrans au-dessus de l'état existant, pas nouvel état par écran.**
Chaque écran lit le même `{ game, meta }` + historique ; seul l'écran Prévisualiser possède un état local (simulateur), jamais persisté dans le JSON. Alternative écartée : un store par écran — rejeté car il recréerait le problème du "mode import" à capacités réduites et multiplierait les sources de vérité.
*Pourquoi :* garantit la parité d'état Importer/Composer et l'unicité de la règle de blocage.

**2. Règle "export possible" calculée une fois, consommée partout.**
Un sélecteur central `canExport(game, meta)` = C1 ∧ C2 ∧ (pas de `draft` hors animateur, `reviewed` requis si HOLD). Barre globale, compteur Relire et bouton Exporter le consomment ; personne ne recalcule. Alternative écartée : logique dupliquée par écran — rejetée car c'est exactement la fuite P0 visée.
*Pourquoi :* une seule règle à tester, un seul endroit à corriger.

**3. Porte d'export unique visible par défaut.**
`exportPackFull` (validation objets/indices incluse) devient la voie par défaut. Si `exportPack` historique est conservé transitoirement, il est marqué déprécié et masqué derrière un accès explicite. Alternative écartée : deux boutons côte à côte — rejeté car l'auteur ne peut pas arbitrer une différence de validation qu'il ne voit pas.
*Pourquoi :* la garantie "rien ne sort sans validation" ne doit pas dépendre du bouton choisi.

**4. Navigation erreur → nœud via la sélection partagée.**
Le clic sur une erreur C2 pose la sélection du nœud fautif dans l'état partagé et bascule sur Composer avec surlignage temporaire. Pas de navigation ad hoc par écran.
*Pourquoi :* réutilise le mécanisme existant (sélection + surlignage) au lieu d'en créer un second.

**5. Calques transverses en surimpression, pas en écrans.**
i18n et difficultés/modes s'ouvrent par-dessus Composer via le sélecteur de barre globale et se referment sans changer d'écran.
*Pourquoi :* ce sont des surcouches du graphe, et en faire des écrans inviterait à les traiter comme des copies du graphe.

**6. HOLD rangé avec la config globale, exclu du sélecteur difficulté/mode.**
*Pourquoi :* évite la confusion conceptuelle entre mode système (kiosque) et overrides de gameplay ; la spec l'exige.

## Risks / Trade-offs

- [Risque] `studio-layout-revamp` (enveloppe) et ce contrat (contenu) avancent en parallèle et peuvent se contredire sur le découpage → Mitigation : ce contrat ne décrit que des comportements, jamais de dimensions/positions ; tout conflit visuel se tranche en faveur de l'enveloppe.
- [Risque] Centraliser `canExport` casse les appels existants aux deux portes d'export → Mitigation : la tâche de tranchage (tâche 1) précède tout recâblage ; la porte non retenue est dépréciée d'abord, supprimée ensuite.
- [Trade-off] L'avertissement inline non bloquant (needs non satisfaits) ajoute du bruit visuel dans l'inspecteur → accepté car le blocage muet est pire ; l'avertissement reste repliable.

## Migration Plan

Aucune migration de données (aucun changement de schéma ni de format). Déploiement : fusion UI uniquement, derrière aucune bascule. Rollback : revert du commit UI, le JSON produit avant/après reste identique et valide.

## Open Questions

1. Porte d'export définitive (`exportPack` vs `exportPackFull`) — tranchée en tâche 1 ; la spec couvre les deux branches, donc le choix ne change ni la spec ni le découpage des tâches suivantes.
2. Config globale : écran séparé ou modal depuis Composer ? — sans effet sur la spec (le contrat reste neutre) ; à trancher selon la densité d'usage observée.
3. Niveau de détail de l'overlay de relecture pour les modules sans représentation visuelle naturelle — à prototyper, sans effet sur le contrat.
