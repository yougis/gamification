## 1. Documentation Créateur (user guide)

- [ ] 1.1 Créer `docs/user/creator-guide.md` — Introduction au Studio : canvas graphe, glisser-déposer, types de modules, configuration globale (branding, carte, modes système)
- [ ] 1.2 Ajouter section MCP : `composeNodes`, `setActivation`, `registerAsset`, `validateGame`, `buildManifest`, `exportPack` — comment utiliser les opérations MCP
- [ ] 1.3 Ajouter section modes système : triche/test, preview Studio, HOLD kiosque — configuration et utilisation
- [ ] 1.4 Ajouter section validation et export : double couche Draft-07 + applicative, messages d'erreur courants
- [ ] 1.5 Ajouter section exemples : workflow complet de création d'un jeu 5 POI
- [ ] 1.6 Vérifier que le guide est complet et cohérent avec les specs validées

## 2. Documentation Développeur (architecture)

- [ ] 2.1 Créer `docs/dev/architecture.md` — Vue d'ensemble du moteur natif : Kotlin, SQLite, Studio MCP TypeScript
- [ ] 2.2 Ajouter section orchestrateur : boucle d'évaluation continue, file FIFO à modale unique, machine à états LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED
- [ ] 2.3 Ajouter section MCP interface : `setHoldMode`, `setHoldExit`, `getHoldConfig`, `setHoldMode` — contrat et validation
- [ ] 2.4 Ajouter section capteurs : GPS, boussole, caméra AR — service moteur et module BOUSSOLE
- [ ] 2.5 Ajouter section persistence : SQLite schema, `randomDraws[sessionId][poolNodeId]`, journal d'événements
- [ ] 2.6 Ajouter section offline-first : manifest SHA-256, diff, resume, background download
- [ ] 2.7 Vérifier que l'architecture correspond au code Kotlin et TypeScript existant

## 3. Documentation Fonctionnelle Globale (maintainer reference)

- [ ] 3.1 Créer `docs/maintainer/functional-reference.md` — Référence exhaustive de toutes les capacités du framework
- [ ] 3.2 Ajouter tableau des conditions d'activation : GEOFENCE, NODE_COMPLETED, TIMER, POOL_DRAWN, PROXIMITY_MASTER, CONDITIONAL, WINDOW
- [ ] 3.3 Ajouter tableau des états de nœuds et transitions : LOCKED, UNLOCKED, ACTIVE, COMPLETED avec latch et onReentry
- [ ] 3.4 Ajouter référence du registre de modules : QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, besoins et contrats
- [ ] 3.5 Ajouter référence des règles de validation : double couche Draft-07 + applicative, cohérence HOLD, needsLock
- [ ] 3.6 Ajouter historique des changements : liens vers les changes archivés 000 à 710
- [ ] 3.7 Vérifier la cohérence avec les specs sous `openspec/specs/`

## 4. Mise à jour de la ROADMAP

- [ ] 4.1 Ajouter la ligne `800-add-framework-docs` à `ROADMAP.md` dans le tableau des changes
- [ ] 4.2 Ajouter la documentation dans la section "Différés" ou la section principale selon le cas
- [ ] 4.3 Vérifier que les dépendances sont correctes (pas de dépendance de changement, documentation autonome)

## 5. Vérification Finale

- [ ] 5.1 Valider la cohérence de toute la documentation avec les specs OpenSpec archivées
- [ ] 5.2 Vérifier que `openspec validate --changes` passe pour le change add-framework-docs
- [ ] 5.3 Vérifier que la ROADMAP.md est à jour et cohérente
