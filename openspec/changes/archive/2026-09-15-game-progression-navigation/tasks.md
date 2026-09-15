## 1. Schema et validation

- [x] 1.1 Ajouter les nouveaux types de conditions (ITEM_REQUIRED, ITEM_USED, CODE_INPUT, CLUE_RESOLVED) au schéma JSON Draft-07 avec `additionalProperties:false` par variante
- [x] 1.2 Ajouter les champs optionnels `discovery`, `effects`, `inventoryRef` au schéma du nœud avec valeurs par défaut (`VISIBLE_NOW`, tableau vide, null)
- [x] 1.3 Ajouter `global.navigationModel` et `global.presentation` au schéma racine
- [x] 1.4 Ajouter `global.preset` (optionnel) au schéma racine et définir la table des préfixes de référence dans le schéma JSON
- [x] 1.5 Ajouter la définition des objets dans le schéma JSON (`objects[]` avec id, name, icon, description, consumable, stackable)
- [x] 1.6 Valider le schéma mis à jour avec `openspec validate --changes` et le jeu-5poi existant
- [x] 1.7 Ajouter les règles de validation applicative : objets référencés doivent exister, consistency consumable, réferences de discovery valides

## 2. Moteur de progression et discovery

- [x] 2.1 Implémenter le système de discovery dans le runtime Kotlin : évaluation des conditions de discovery selon le mode (ON_COMPLETED, ON_CLUE, ON_ITEM, ON_PROXIMITY, ON_TIME)
- [x] 2.2 Implémenter le système de progression : relations entre nœuds, fan-out, branches, progression libre et conditionnelle
- [x] 2.3 Implémenter le système d'effets (GIVE_ITEM, REMOVE_ITEM, REVEAL_NODE, HIDE_NODE, UNLOCK_NODE, MODIFY_VARIABLE, MODIFY_SCORE, TRIGGER_EVENT)
- [x] 2.4 Intégrer les nouvelles conditions d'activation (ITEM_REQUIRED, ITEM_USED, CODE_INPUT, CLUE_RESOLVED) dans l'orchestrateur d'évaluation
- [x] 2.5 Ajouter la persistance SQLite pour la découverte (états de discovery) et les variables du jeu
- [x] 2.6 Implémenter la compatibilité : si discovery/effects sont absents, valeurs par défaut

## 3. Système d'inventaire

- [x] 3.1 Créer le modèle d'inventaire dans le runtime Kotlin (GameRepository, GameDao pour inventaire)
- [x] 3.2 Implémenter les opérations : GIVE_ITEM, REMOVE_ITEM, CHECK_ITEM, USE_ITEM
- [x] 3.3 Implémenter la persistance SQLite de l'inventaire avec écriture immédiate
- [x] 3.4 Ajouter la reprise : même sessionId relit l'inventaire depuis SQLite
- [x] 3.5 Implémenter la logique de consommation (consumable: true/false) dans l'orchestrateur
- [x] 3.6 Ajouter la validation applicative des références d'objets

## 4. Modèles de navigation et présentation

- [x] 4.1 Ajouter `global.navigationModel` et `global.presentation` à la configuration du jeu
- [x] 4.2 Définir les préfixes de référence avec leurs configurations 6 dimensions (progression, discovery, activation, inventory, effects, presentation)
- [x] 4.3 Implémenter la logique de sélection du modèle de navigation dans le runtime
- [x] 4.4 Implémenter le mécanisme select-then-modify : sélection d'un preset puis surcharge individuelle des mécanismes
- [x] 4.5 Créer les présentations dans le Player Kotlin : MAP, LIST, STORY, CLUE, TOOLBOX, TIMELINE
- [x] 4.6 Implémenter la combinaison de présentations simultanées
- [x] 4.7 Adapter l'orchestrateur d'évaluation aux modèles de navigation (activation automatique pour GUIDED, activation par objet pour ESCAPE_GAME)
- [x] 4.8 Ajouter le support du mode triche pour les nouveaux types d'activation (ITEM_USED, CODE_INPUT, CLUE_RESOLVED)

## 5. Studio MCP

- [x] 5.1 Ajouter les opérations MCP pour la configuration de la progression : `setDiscovery`, `setEffects`, `setInventory`
- [x] 5.2 Ajouter les opérations MCP pour la configuration de la navigation : `setNavigationModel`, `setPresentation`
- [x] 5.3 Mettre à jour le canvas Studio pour afficher les nouvelles arêtes de progression et les relations discovery/activation
- [x] 5.4 Ajouter les formulaires dynamiques pour discovery, effects, inventaire (générés depuis les sous-schémas du registre)
- [x] 5.5 Mettre à jour `validateGame` pour inclure la validation des nouvelles couches (objets référencés, consistency consumable, réferences de discovery)
- [x] 5.6 Mettre à jour `exportPack` pour inclure les nouvelles propriétés dans le JSON exporté

## 6. Module registry

- [x] 6.1 Ajouter les nouveaux types de modules au registre : CODE_INPUT, CLUE_RESOLVER, ITEM_DROPPER, ITEM_CONSUMER
- [x] 6.2 Ajouter le champ `needsInventory` au module registry
- [x] 6.3 Ajouter le champ `presentationNeeds` au module registry
- [x] 6.4 Ajouter le champ `producesEffects` au module registry
- [x] 6.5 Ajouter les sous-schemas des nouveaux types de modules

## 7. Tests et validation

- [x] 7.1 Créer un jeu de test ESCAPE_GAME complet (indice → objet → utilisation → énigme → nouvel objet)
- [x] 7.2 Créer un jeu de test GUIDED sans GPS (diaporama)
- [x] 7.3 Créer un jeu de test TREASURE_HUNT (indice → coordonnées → geofence → mini-jeu)
- [x] 7.4 Tester la compatibilité : le jeu-5poi existant doit fonctionner sans modification
- [x] 7.5 Tester la reprise : même sessionId avec inventaire et discovery restaurés
- [x] 7.6 Tester la validation applicative : objet référencé inexistant, consistency consumable
- [x] 7.7 Exécuter `openspec validate --changes` et vérifier que le change passe

## 8. Documentation et ROADMAP

- [x] 8.1 Mettre à jour `docs/dev/api-reference.md` avec les nouvelles couches fonctionnelles
- [x] 8.2 Mettre à jour `docs/dev/classes-reference.md` avec les nouvelles classes d'inventaire et de discovery
- [x] 8.3 Mettre à jour `ROADMAP.md` avec la référence à ce change
- [x] 8.4 Archive le change `game-progression-navigation`
