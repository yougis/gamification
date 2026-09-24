## ADDED Requirements

### Requirement: Hiérarchie de priorité des contrôles

Chaque contrôle du Studio (bouton, menu, action, champ de configuration, message, information) SHALL appartenir à exactement un tier de priorité, dérivé du `WorkflowStepper` 1→5 (Graphe → Épreuves → Relecture → Validation → Export) :
- **P0 « prioritaire »** : fait avancer l'étape courante du workflow (créer un nœud, renseigner un mini-jeu, passer en relu, corriger une erreur, lancer la fixture, exporter). Toujours visible.
- **P1 « contextuel »** : n'a de sens que pour la sélection courante (config du widget cliqué, famille du nœud, pastille). Visible quand pertinent, jamais autrement.
- **P2 « avancé »** : exige de comprendre le schéma ou a un effet dangereux en production (édition JSON experte, rotation d'identifiant radio, secours par code, overrides, viewports d'aperçu, reset de layout, effacement du brouillon, triche de prévisualisation). Replié par défaut.

Les tiers P0/P1/P2 (visibilité des contrôles) sont sans rapport avec les « Garanties P0 » (traçabilité des opérations MCP), qui restent inchangées.

Sont sanctuarisés tel quel (hors tri) : le menu principal de gauche (7 écrans), la pastille validation, les rails d'actions, les tabs de l'Inspecteur et les accordéons « contexte seul ».

#### Scenario: Bouton destructif classé avancé
- **GIVEN** l'action « Effacer brouillon » (suppression locale irréversible)
- **WHEN** sa priorité est évaluée
- **THEN** elle est classée P2 (n'avance aucune étape, effet dangereux) et vit repliée avec confirmation

#### Scenario: Création classée prioritaire
- **GIVEN** les boutons Étape/Lieu/Tirage/Fin à l'étape 1 (Graphe)
- **WHEN** leur priorité est évaluée
- **THEN** ils sont classés P0 (font avancer l'étape courante) et restent visibles en permanence

#### Scenario: Config module classée contextuelle
- **GIVEN** les champs d'un widget texte quand aucun widget n'est sélectionné
- **WHEN** leur priorité est évaluée
- **THEN** ils sont classés P1 et restent masqués tant que le widget n'est pas sélectionné

### Requirement: Regroupement avancé par module

Les contrôles P2 SHALL vivre repliés dans des sections « Avancé » en bas de chaque module/famille (composant `Accordeon` existant, fermé par défaut, badge d'état, mémoire locale réutilisée), jamais au premier plan des formulaires. Les contrôles P2 transverses (bbox/zooms bruts, tileStrategy, glossaire verrouillé, reset de layout) SHALL vivre dans une section avancée de l'écran Config. Déplacer un contrôle en Avancé ne SHALL jamais changer son effet (même opération MCP, mêmes validations).

#### Scenario: Rotation master repliée
- **GIVEN** le bouton « Changer d'identifiant » (rotation = révocation radio terrain)
- **WHEN** l'auteur ouvre la famille Position d'un nœud PROXIMITY_MASTER
- **THEN** le bouton est dans la section « Avancé » fermée, le reste de la famille restant identique et fonctionnel

#### Scenario: Effet inchangé après déplacement
- **GIVEN** un contrôle P2 déplacé en section Avancé
- **WHEN** l'auteur l'ouvre et l'utilise
- **THEN** la même opération MCP est journalisée avec les mêmes validations qu'avant le déplacement
