## Context

Voir `proposal.md` (Why) pour la motivation. État actuel (`studio/src/App.tsx`, ~2950 lignes) : le Composer affiche graphe + liste + détail + un footer validation (`pied` + `listeErreurs`). Chaque panneau se replie via un bouton texte « Replier » doublé d'une entrée « Replier » dans un menu molette (état `molette`), qui contient aussi des réglages de layout (Recentrer, Aligner H/V, Largeur 340, Panneau 400). L'état replié (`mep.repliees` : graphe/liste/detail, persisté en localStorage) rend un rail `w-12` pour graphe/liste mais une barre horizontale texte pour détail. L'écran Valider (avec `BlocValidation`) existe déjà et duplique le footer. L'Inspecteur utilise des tabs à icônes + tooltip ; `PropertiesPanel` et les formulaires modules empilent tout en pile verticale sans aucun repli.

## Goals / Non-Goals

**Goals:**
- Une seule commande de repli par panneau, direction prévisible, rails homogènes.
- Zéro bouton molette : chaque action de réglage a un nouvel emplacement découvrable.
- Validation détaillée uniquement dans Valider, signal permanent dans Composer.
- Un seul composant accordéon pour tout le panneau droit et les formulaires.

**Non-Goals:**
- Aucun changement au schéma de jeu, aux opérations MCP, à la validation bi-couche, au runtime player.
- Aucun nouveau pattern visuel (on généralise icône + tooltip, chevrons, cartes existants).
- Pas de refonte des 6 écrans ni de la navigation latérale (hors périmètre).

## Decisions

### 1. Cascade de repli sur l'état existant

Étendre `mep.repliees` (localStorage, format rétro-compatible : clés absentes = déplié) plutôt qu'un nouveau système d'état. Règle : graphe→gauche (rail à gauche du `main`, contre la nav), liste/détail→droite (rails empilés à droite dans l'ordre, à la place du panneau droit). Les voisins flex s'étendent ; aucun déplacement DOM, seul le CSS change (rail `w-12` existant généralisé au détail).
Alternative écartée : repli de chaque panneau vers son bord adjacent strict — indéfini pour la liste (coincée entre graphe et détail).

### 2. Chevron + rail partagés, boutons texte supprimés

Un composant `ChevronRepli` (props : direction, label/tooltip, état replié, callback) ancré au bord du panneau ouvert, et un composant `RailReplie` (icône + tooltip + chevron inverse) pour l'état replié. Suppression de tous les boutons « Replier »/« Déplier »/« Détail » et des props `boutonPlier`/`boutonMolette`/`panneauMolette` de `NodeList`. Le sens du chevron exprime toujours le mouvement (ouvert : vers le bord de fuite ; rail : vers le retour), jamais un état statique.

### 3. Relocalisation des actions molette (suppression pure)

- Recentrer / Aligner H/V → mini-toolbar flottante en haut à droite du graphe (emplacement actuel des boutons graphe), réutilisant les handlers `fitView`/`aligner` et la règle d'activation existante (Aligner désactivé si < 2 sélectionnés, tooltip explicatif conservé).
- Largeur 340 / Panneau 400 → double-clic sur le `Splitter` correspondant (reset à la valeur de `LAYOUT_DEFAUT`), tooltip du Splitter étendu (« Double-cliquer pour réinitialiser »). Aucun état, aucun bouton : le Splitter possède déjà le handler de drag et le label accessible.
- L'état `molette` et `basculerMolette` disparaissent ; les dialogs `role="dialog"` associés aussi (moins de focus management).

### 4. Pastille validation dans la barre du graphe, footer migré

La pastille se calcule depuis `erreurs` existant (comptes C1 + C2 déjà en mémoire dans `App`) : `✓ Valide` / `⚠ N problèmes`, onClick → `setEcran("valider")`, tooltip « Voir le détail dans Valider ». Placement : barre d'outils du graphe, à côté de la mini-toolbar (là où l'auteur travaille, sans consommer de hauteur de layout).
Le footer (`pied` : puces étapes/fin/impasses ; `listeErreurs`) déménage dans l'écran Valider, au-dessus de `BlocValidation`, en conservant la navigation cliquable vers les nœuds fautifs (exigence existante « Verdicts séparés et actionnables »). Le `main` du Composer perd sa `section-validation` et redevient une rangée unique.

### 5. Accordéon unique, piloté par le contexte

Un composant `Accordeon` (props : id stable pour la persistance, titre, badge, ouvert, onToggle, enfants). Règle d'ouverture : à chaque changement de sélection (nœud / zone / widget), seule la section pertinente s'ouvre ; ensuite tout toggle est mémorisé en localStorage (même tiroir que `mep`). Badges alimentés par données existantes : nombre de widgets/questions, `resolveStyles` pour l'origine Global/Écran/Widget.
Application : `PropertiesPanel` (Style Écran/Contenu/Global, ZoneProperties, config widget, TemplatePicker), formulaires quiz/puzzle/minigame-params, sous-sections dans une famille Inspecteur. Les tabs à icônes des 9 familles restent le seul niveau de navigation (pas d'accordéon de familles).
Alternative écartée : tout-ouvert par défaut — conserve le mur de scroll et reporte le rangement sur l'auteur.

## Risks / Trade-offs

- [Découvrabilité du double-clic Splitter] → Mitigation : tooltip explicite + curseur adapté ; usage rare (reset ponctuel, pas action quotidienne).
- [Accessibilité chevrons/accordéon] → Mitigation : reprendre les patterns existants (`aria-expanded`, `aria-label`, `aria-controls`, navigation clavier déjà en place sur les tabs Inspecteur) ; chaque chevron/rail est un vrai `<button>` focusable.
- [Clé localStorage étendue] → Mitigation : lecture tolérante (clés absentes = défauts contexte-seul), jamais de migration destructive ; l'ancien `mep` reste lisible tel quel.
- [Correspondance sélection → section (contexte seul)] → Mitigation : table explicite (clic widget texte → « Contenu », clic zone → « Zone », clic fond → « Fond/Écran », sélection nœud → « Module ») ; tout cas non mappé ouvre « Module »/première section par défaut, jamais tout.
- [Footer migré : perte du clic impasse depuis Composer] → Accepté : la pastille mène en un clic à Valider où la navigation existe ; compromis validé en exploration (option B).

## Migration Plan

Ordre de déploiement (chaque étape indépendamment livrable, pure UI, aucun changement de données) :
1. Pastille + migration du footer vers Valider (libère le bas du Composer).
2. Chevrons + rails + cascade (supprime boutons texte ; étend `mep.repliees`).
3. Suppression molette + toolbar graphe + double-clic Splitter.
4. Composant `Accordeon` + application (PropertiesPanel, formulaires modules, sous-sections Inspecteur).
Rollback : revert Git par étape ; aucun état persistant ne devient illisible (tolérance de lecture).
