---
name: GeoPlay Studio
description: Atelier sobre pour composer, relire et exporter des jeux géolocalisés offline.
colors:
  accent: "#1a7f37"
  accent-deep: "#116329"
  accent-soft: "#dff3e5"
  alert: "#b42318"
  alert-soft: "#fdecea"
  pool: "#5f3dc4"
  pool-soft: "#ede9fe"
  ending: "#8a5a00"
  ending-soft: "#fff4d6"
  surface: "#ffffff"
  surface-2: "#f2f4f6"
  surface-3: "#e8ebee"
  ink: "#13171c"
  ink-2: "#4b5563"
  line: "#d7dce1"
  line-strong: "#b9c1ca"
  focus: "#0b5fff"
typography:
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
---

# Design System: GeoPlay Studio

## Overview

**Creative North Star: "La table d'atelier"**

Le Studio est un outil de travail, pas une vitrine. Une table claire, des outils alignés, un seul accent vert réservé aux actions qui font avancer (Valider, Exporter). Chaque fonction parle par icône + libellé français, jamais par couleur seule. Le graphe se lit en deux vues synchronisées — canvas visuel et liste filtrable — du brouillon à l'export vérifié.

Densité opératoire, hiérarchie calme, états explicites. Lisible en plein soleil, utilisable au clavier et au doigt (44 px minimum), en français d'abord avec le glossaire centralisé.

**Key Characteristics:**
- Sobre et tracé : neutres + un accent, statuts toujours en texte.
- Parlant : icônes SVG un trait + libellés, pas d'emoji.
- Double vue : graphe canvas + liste, sélection partagée, fautif surligné.

## Colors

Restrained : neutres dominants, un accent vert pour l'action, trois teintes sémantiques cantonnées aux pastilles et nœuds.

### Primary
- **Vert atelier** (#1a7f37, foncé #116329, doux #dff3e5): actions primaires (Valider, Exporter, Terminer), sélections validées. Jamais décoratif.

### Secondary
- **Violet tirage** (#5f3dc4, doux #ede9fe): nœuds et pastilles RANDOM_POOL, bordure pointillée.
- **Ambre fin** (#8a5a00, doux #fff4d6): nœuds et pastilles isEnding.

### Tertiary
- **Rouge alerte** (#b42318, doux #fdecea): erreurs, impasses, blocages d'export. Toujours avec icône + texte.

### Neutral
- **Encre** (#13171c): texte principal.
- **Encre secondaire** (#4b5563): aides, métadonnées (contraste ≥4,5:1 sur blanc).
- **Surface** (#ffffff): cartes, champs, nœuds.
- **Surface atelier** (#f2f4f6): fond de travail.
- **Ligne** (#d7dce1) / **Ligne forte** (#b9c1ca): bordures sobres.
- **Focus** (#0b5fff): anneau de focus et sélection, jamais une couleur de statut.

### Named Rules
**The One Voice Rule.** L'accent vert ne porte que l'action qui fait avancer. Ni pastille d'info, ni décoration.
**The Never Color Alone Rule.** Statut = pastille texte + icône + couleur. Un daltonien comprend sans la couleur.

## Typography

**Display Font:** System-ui (avec -apple-system, Segoe UI, Roboto)
**Body Font:** System-ui (avec -apple-system, Segoe UI, Roboto)

**Character:** Sans-outil lisible en extérieur, aucune police distante (offline-first). Chiffres tabulaires pour statuts et manifests.

### Hierarchy
- **Title** (700, 16px, 1.3): nom du Studio, nom de l'étape sélectionnée.
- **Body** (400, 14px, 1.45, 65–75ch pour les aides): formulaires, listes, journaux.
- **Label** (600, 12px, 1.3): pastilles, aides, en-têtes de palette, stepper.

### Named Rules
**The System Face Rule.** Pas de display serif ni de mono costume. Le mono ne sert que le JSON expert.

## Layout

Grille d'atelier : palette (240px) + centre graphe/liste + inspecteur (360–400px) sur grand écran (≥1024px). En dessous, onglets Graphe / Liste / Détail / Essai + barre basse à portée de pouce (56px, safe-area). Stepper workflow en tête, barre d'état en pied, erreurs cliquables vers le nœud fautif. États visuels du chrome (vue, étape, filtre) locaux, jamais dans le JSON exporté.

## Elevation & Depth

Ombres douces avec offset + flou, jamais de halo coloré ni d'ombre dure. Le relief répond à l'état, pas à la décoration.

### Shadow Vocabulary
- **Atelier** (`box-shadow: 0 1px 2px rgb(19 23 28 / 0.08), 0 4px 14px rgb(19 23 28 / 0.08)`): cartes, panneaux, contrôles ReactFlow.
- **Sélection** (`box-shadow: 0 0 0 3px #fff, 0 0 0 5px #0b5fff`): nœud ou étape courante, liste et canvas.

### Named Rules
**The Flat-By-Default Rule.** Les surfaces sont plates au repos. L'ombre n'apparaît qu'en carte et en sélection.

## Shapes

Coins calmes et constants : 6px champs, 10px boutons et lignes de liste, 14px cartes et nœuds. Bordures fines 1px, 2px pour erreur/sélection, pointillés 2px pour les tirages. Pastilles pilule avec point + icône + texte.

## Components

### Buttons
- **Shape:** coins arrondis (10px), hauteur 44px minimum, icône 15–17px + libellé.
- **Primary:** fond vert, texte blanc, bordure vert foncé. Hover vert foncé. Disabled grisé, jamais cliquable.
- **Hover / Focus:** hover assombrit, focus anneau bleu 3px + offset 2px, actif surface-3.
- **Secondary / Ghost:** fond blanc, bordure ligne forte, texte encre. Danger : bordure et texte rouges sur fond blanc.

### Chips
- **Style:** pilule bordure fine, fond surface ou teinte douce, texte 12px semi-gras avec icône.
- **State:** OK vert, erreur rouge, tirage violet, fin ambre — toujours texte explicite.

### Cards / Containers
- **Corner Style:** arrondi large (14px).
- **Background:** blanc sur fond atelier.
- **Shadow Strategy:** ombre atelier, aucune carte imbriquée sauf liste d'erreurs.
- **Border:** 1px ligne, 2px sur erreur ou sélection.
- **Internal Padding:** 8–12px.

### Inputs / Fields
- **Style:** bordure ligne forte, fond blanc, rayon 8px, 44px minimum, placeholder encre secondaire.
- **Focus:** anneau bleu, pas de glow coloré.
- **Error / Disabled:** erreur bordure rouge + message texte ; disabled opacité 0,55, curseur interdit.

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.** Stepper 5 étapes (Graphe, Épreuves, Relecture, Validation, Export) : numéro ou coche + icône + nom + aide, courant anneau bleu + aria-current. Petit écran : 4 onglets bas avec icône + nom, page courante anneau bleu. Relecture <900px : ajout désactivé, pastille explicative, sélection et validation conservées.

### Graphe
Nœuds sobres : fond blanc, teinte douce par nature (fin ambre, tirage violet, erreur rouge, sélection bleu clair), libellé id + nom du module + statut. Arêtes fines grises, rouges animées si impasse, étiquette nom français. Mini-carte + contrôles sobres, zoom 0,3–2, drag désactivé en relecture.

## Do's and Don'ts

### Do:
- **Do** accompagner chaque icône d'un libellé visible (aria-label + title en icon-only).
- **Do** surligner le nœud fautif au clic sur une erreur et bloquer l'export tant que couches 1+2 ou brouillons (hors animateur) subsistent.
- **Do** garder workflow, vue et filtres hors du JSON — seul le graphe s'exporte.
- **Do** tester desktop large + mobile 390px, clavier seul, et contraste en plein soleil.

### Don't:
- **Don't** utiliser d'emoji, de glyphe Unicode ou de couleur seule comme signal.
- **Don't** créer de dégradé texte, verre décoratif, bordure latérale colorée épaisse ou ombre dure.
- **Don't** empiler des cartes identiques icône+titre+texte comme structure de page.
- **Don't** masquer une fonction cœur sur mobile — la relecture garde liste, statuts et validation.
