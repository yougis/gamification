## MODIFIED Requirements

### Requirement: Panneau de propriétés contextuel

Le panneau droit du Composer SHALL afficher les propriétés contextuelles selon la sélection :
- **Rien de sélectionné** : propriétés du nœud (module type, activation), sélecteur de template, background global, transitions
- **Zone sélectionnée** : nom de la zone, layout (stack/grid/free), background de la zone, visibilité conditionnelle
- **Widget sélectionné** : type du widget, propriétés spécifiques (texte, source image, label bouton, etc.), style (couleur, taille, alignement)
- **Module widget sélectionné** : propriétés du widget + panneau de configuration du module existant (questions quiz, polygones 7-erreurs, etc.)

Le panneau de propriétés SHALL implémenter le requirement existant "Inspecteur de nœud" : sections module → activation → latch/rejeu → discovery → effects → inventoryRef, mais dans un panneau contextuel plutôt que dans un panneau fixe.

Le panneau SHALL distinguer trois sections de style, affichées selon la sélection :
- **Style global** (aucune sélection écran) : `global.screen.styles` — typo, tailles, couleurs par défaut pour tout le jeu ;
- **Style de l'écran** (écran sans widget sélectionné) : `node.screen.styles` — surcharges de l'écran courant, avec indication des propriétés héritées du global ;
- **Style du contenu sélectionné** (widget sélectionné) : `widgets[].styles` — typo, taille, graisse, couleur, alignement du widget, avec indication des propriétés héritées de l'écran.

Chaque section de style SHALL être rendue comme une barre d'outils compacte genre éditeur de texte riche, groupant les contrôles au lieu d'une ligne par propriété :
- groupe typographie (police, taille, gras/normal),
- groupe couleur (couleur du texte, couleur de fond selon les champs couverts),
- groupe alignement (gauche/centré/droite),
- groupe surcharge (retirer la surcharge = retour à l'héritage).

La sémantique d'héritage SHALL être inchangée : chaque contrôle affiche la valeur résolue et son origine (badge Global/Écran/Widget/défaut) ; renseigner surcharge le niveau édité, effacer retombe sur l'héritage. Seuls les champs couverts par le niveau (et par `customizableStyles` pour un module) SHALL être proposés.

#### Scenario: Sélection du module widget

- **GIVEN** un nœud avec un module QUIZ
- **WHEN** l'auteur clique sur le ModuleWidget dans le canvas
- **THEN** le panneau de propriétés affiche les propriétés du widget ET le formulaire de configuration du quiz (questions, options, score)

#### Scenario: Sélection de zone header

- **GIVEN** le canvas avec un screen
- **WHEN** l'auteur sélectionne la zone header
- **THEN** le panneau affiche : layout selector (stack/grid), widgets list, bouton "Ajouter un widget"

#### Scenario: Surcharge de style d'écran visible

- **GIVEN** `global.screen.styles: { fontSize: 14 }` et un écran sans `styles`
- **WHEN** l'auteur ouvre la section style de l'écran
- **THEN** fontSize affiche 14 comme valeur héritée (non éditable en place), modifiable en renseignant la surcharge

#### Scenario: Barre d'outils groupée

- **GIVEN** un widget texte sélectionné avec `global.screen.styles: { fontFamily: "Georgia" }`
- **WHEN** l'auteur ouvre la section « Style — Contenu »
- **THEN** une seule barre compacte affiche les groupes typographie/couleur/alignement/surcharge, et la police affiche Georgia comme valeur héritée badgée Global

#### Scenario: Gras en un clic

- **GIVEN** la barre d'outils de style du contenu avec graisse héritée « normal »
- **WHEN** l'auteur active le contrôle gras du groupe typographie
- **THEN** `widgets[].styles.fontWeight` vaut `bold`, le badge passe à Widget, et l'aperçu du canvas reflète la graisse
