## MODIFIED Requirements

### Requirement: Panneau de propriétés module (propertiesPanel)

Le `propertiesPanel` SHALL remplacer ou compléter le formulaire de configuration existant dans l'Inspector. Les 9 familles de l'Inspector actuel (épreuve, déclenchement, comportement, tirage, validation, découverte, effets, inventaire, position) SHALL être accessibles depuis le propertiesPanel du module.

Le propertiesPanel SHALL être affiché dans le panneau droit du WYSIWYG quand le ModuleWidget est sélectionné. Les configurations existantes (questions quiz, polygones 7-erreurs, etc.) SHALL être conservées.

Quand le module est un mini-jeu, le propertiesPanel SHALL afficher un bloc de configuration du mini-jeu : paramètres de mécanique (questions, découpe, essais, temps) et champs de style couverts par `customizableStyles`. Les valeurs issues des défauts globaux SHALL être signalées comme héritées tant qu'aucune surcharge locale n'est renseignée.

#### Scenario: Configuration quiz dans le propertiesPanel
- **GIVEN** un nœud QUIZ sélectionné dans le WYSIWYG
- **WHEN** l'auteur ouvre le panneau de propriétés
- **THEN** le formulaire de configuration du quiz (questions, options, score, timer) est affiché dans le panneau droit

#### Scenario: Les 9 familles restent accessibles
- **GIVEN** un nœud QUIZ avec des conditions d'activation et un inventaire lié
- **WHEN** l'auteur configure le module dans le propertiesPanel
- **THEN** les sections activation, discovery, effects, inventoryRef sont accessibles dans le même panneau

#### Scenario: Défaut global signalé comme hérité
- **GIVEN** `global.minigameDefaults: { maxAttempts: 3 }` et un nœud QUIZ sans surcharge
- **WHEN** l'auteur ouvre le bloc mini-jeu du propertiesPanel
- **THEN** maxAttempts affiche 3 comme valeur héritée, modifiable en renseignant la surcharge locale

### Requirement: Styles personnalisables (customizableStyles)

Le `customizableStyles` SHALL déclarer quels styles l'auteur peut modifier dans le WYSIWYG pour ce module. Les options sont :
- `backgroundColor` : couleur de fond du conteneur du module
- `textColor` : couleur du texte
- `fontSize` : taille de police
- `fontFamily` : famille typographique
- `fontWeight` : graisse (`normal`|`bold`)
- `borderRadius` : arrondi des bords

Ces styles SHALL être affichés dans le panneau de propriétés quand le ModuleWidget est sélectionné. Les valeurs SHALL être stockées dans `node.screen.zones.content.widgets[].styles` (nouveau sous-objet optionnel dans le Widget).

#### Scenario: Personnalisation du quiz
- **GIVEN** un module QUIZ avec `customizableStyles: { backgroundColor: true, textColor: true }`
- **WHEN** l'auteur sélectionne le ModuleWidget dans le canvas
- **THEN** le panneau de propriétés affiche des champs pour la couleur de fond et la couleur du texte du quiz

#### Scenario: Style non personnalisable
- **GIVEN** un module avec `customizableStyles: {}` (vide)
- **WHEN** l'auteur sélectionne le ModuleWidget
- **THEN** le panneau de propriétés n'affiche aucun champ de style pour ce module

#### Scenario: Typo personnalisée du module
- **GIVEN** un module avec `customizableStyles: { fontFamily: true, fontSize: true, fontWeight: true }`
- **WHEN** l'auteur renseigne Georgia / 18 / bold
- **THEN** les valeurs sont stockées dans `widgets[].styles` et l'aperçu éditeur les reflète

## ADDED Requirements

### Requirement: Bloc de configuration QCM

Le bloc mini-jeu du module QUIZ SHALL permettre de configurer : le nombre de réponses proposées (2 à 6), chaque réponse en mode texte et/ou image (`{ text?: string, image?: string }`, au moins l'un des deux requis), l'index de la bonne réponse, et une explication optionnelle affichée après réponse.

Le bloc SHALL refuser une question sans bonne réponse désignée et une réponse sans texte ni image. Ces refus SHALL être des erreurs de formulaire (pas de rejet Draft-07 si le champ reste absent — la validation applicative du quiz existante s'applique).

#### Scenario: QCM mixte texte et images
- **GIVEN** une question avec 4 réponses dont 2 images
- **WHEN** l'auteur enregistre la question
- **THEN** l'aperçu éditeur affiche les 4 réponses (texte et vignettes) et la bonne réponse est marquée

#### Scenario: Réponse vide refusée
- **GIVEN** une réponse sans texte ni image
- **WHEN** l'auteur tente d'enregistrer
- **THEN** le formulaire signale l'erreur et l'enregistrement est bloqué

### Requirement: Bloc de configuration puzzle image

Le bloc mini-jeu du module PUZZLE SHALL permettre de configurer : l'image source (asset du pack), le nombre de cases de découpe sous forme lignes × colonnes (ex. 3×3, 4×4, minimum 2×2, maximum 6×6), et l'aperçu de la grille découpée.

Le bloc SHALL afficher la grille résultante (nombre de pièces = lignes × colonnes) avant validation. Un découpage hors bornes SHALL être refusé par le formulaire.

#### Scenario: Puzzle 4×4 configuré
- **GIVEN** une image source et un découpage 4×4
- **WHEN** l'auteur valide la configuration
- **THEN** 16 pièces sont définies dans `module.data` et l'aperçu montre la grille 4×4

#### Scenario: Découpe 1×1 refusée
- **GIVEN** un découpage lignes=1, colonnes=1
- **WHEN** l'auteur tente de valider
- **THEN** le formulaire refuse (minimum 2×2)

### Requirement: Défauts globaux mini-jeux surchargeables

Le registre SHALL exposer `global.minigameDefaults` comme source des paramètres transverses des mini-jeux : `maxAttempts` (nombre d'essais, entier ≥ 1) et `timeLimitSeconds` (temps alloué, entier ≥ 0, 0 = illimité). Chaque nœud MAY surcharger ces valeurs dans son `module.data` (`maxAttempts`, `timeLimitSeconds`).

La résolution SHALL être : valeur locale si renseignée, sinon défaut global, sinon comportement actuel du module. Le propertiesPanel SHALL afficher la valeur résolue avec son origine (locale / globale / défaut module).

#### Scenario: Surcharge locale du temps
- **GIVEN** `global.minigameDefaults: { timeLimitSeconds: 60 }` et un nœud avec `module.data.timeLimitSeconds: 30`
- **WHEN** le joueur atteint le nœud
- **THEN** le mini-jeu applique 30 secondes (origine locale)

#### Scenario: Défaut global appliqué
- **GIVEN** `global.minigameDefaults: { maxAttempts: 3 }` et un nœud sans surcharge
- **WHEN** le joueur atteint le nœud
- **THEN** le mini-jeu applique 3 essais (origine globale)
