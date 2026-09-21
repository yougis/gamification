## Why

Le Studio GeoPlay permet aujourd'hui aux créateurs de configurer les *données* de chaque nœud (questions de quiz, coordonnées GPS, règles d'activation) mais offre aucun contrôle sur la *mise en forme des écrans* joueurs. Le Player natif affiche une vue queue-based unique, sans personnalisation visuelle. Les créateurs ne peuvent pas définir un fond d'écran, positionner un titre, choisir la disposition d'un quiz, ou contrôler la navigation entre écrans. Ce gap empêche la production de jeux soignés sans développement natif custom.

Ce change introduit un éditeur WYSIWYG dans le Studio qui remplace l'Inspector actuel par un panneau de propriétés contextuel, ajoute un canvas de prévisualisation en forme de téléphone, et définit un système de zones/widgets/modules plugins pour composer les écrans de jeu. Web-only dans un premier temps, extensible aux modules un par un.

## What Changes

- **Nouveau modèle de données** : `node.screen` (par nœud) et `global.screen` (defaults partagés) ajoutés au schéma Draft-07. Un écran = layout template + zones (header/content/footer/overlay) + widgets (text, image, button, progress, module, spacer) + background + transitions.
- **Éditeur WYSIWYG** : remplace l'Inspector dans le Composer. Canvas central avec prévisualisation phone-size, panneau de propriétés contextuel (sélection zone → propriétés zone, sélection widget → propriétés widget, sélection module → config existante).
- **Système de plugins modules** : chaque type de module (QUIZ, DIFFERENCE_GAME, etc.) enregistre un `ModuleScreenPlugin` avec defaultScreen, editorPreview, propertiesPanel, playerRenderer, et customizableStyles.
- **Fusion global/noeud** : `global.screen` définit le template par défaut ; `node.screen` override les zones spécifiées. Merge récursif, pas d'append.
- **Modification du schéma** : `node.screen` et `global.screen` ajoutés comme champs optionnels. Les widgets et zones sont des definitions nouvelles dans le schéma.
- **Modification de `studio-authoring`** : le requirement "Inspecteur de nœud" est remplacé par le WYSIWYG screen builder. Les formulaires de module existants migrés vers le panneau de propriétés.

## Capabilities

### New Capabilities

- `studio-screen-builder` : système de composition d'écrans WYSIWYG — modèle de données (ScreenDefinition, ZoneContent, Widget), éditeur visuel avec canvas phone-size, panneau de propriétés contextuel, système de plugins modules, fusion global/noeud, template picker.
- `module-screen-plugins` : contrat `ModuleScreenPlugin` pour chaque type de module — defaultScreen, editorPreview, propertiesPanel, playerRenderer, customizableStyles. Commence par QUIZ, étendu aux autres modules un par un.

### Modified Capabilities

- `game-schema` : ajout de `node.screen` (ScreenDefinition optionnel) et `global.screen` (ScreenDefinition par défaut) au schéma Draft-07. Ajout des definitions Widget, ZoneContent, ScreenDefinition. Pas de breaking change — champs optionnels, compatibilité ascendante préservée.
- `studio-authoring` : remplacement du requirement "Inspecteur de nœud" par le WYSIWYG screen builder. Les 9 familles de l'Inspector (épreuve, déclenchement, etc.) migrent vers le panneau de propriétés contextuel. Les formulaires de module restent disponibles via le sélection du module widget.
- `module-registry` : ajout du champ `screenPlugin` dans l'entrée de registre de chaque module. Le registre étendu supporte le contrat `ModuleScreenPlugin` sans toucher au schéma Noeuds/Liens.

## Impact

- **Studio (geoplay-studio)** : refonte majeure de l'interface Composer — l'Inspector est remplacé par le WYSIWYG. Ajout de composants React : PhoneCanvas, ZoneRenderer, WidgetRenderer, PropertiesPanel, TemplatePicker, ModulePluginHost.
- **Schéma Draft-07** : extensions optionnelles (node.screen, global.screen, definitions). Validation AJV étendue. Pas de breaking change.
- **Registre de modules** : chaque module registre un screenPlugin. Les 5 modules socle (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE) sont premiers. Les futurs types (CODE_INPUT, CLUE_RESOLVER, etc.) ajoutent leur plugin à l'enregistrement.
- **Player natif** : impact différé — le Player continue d'afficher la vue queue-based tant que le rendu WYSIWYG n'est pas implémenté nativement. Le screen JSON est produit par le Studio mais non consommé par le Player v0.
- **Dépendances** : aucune nouvelle dépendance npm lourde. Le canvas phone-size est un `<div>` styled, pas un iframe. Les widgets sont des composants React standards.
- **Réseau** : aucun impact. Tout reste offline-first. Le WYSIWYG est un outil d'édition local.
