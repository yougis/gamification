## MODIFIED Requirements

### Requirement: Définitions Widget

Le schéma SHALL définir les types de widgets suivants via un discrimant sur `type` :

- `TextWidget` : `{ type: "text", text: string, style?: "heading"|"subtitle"|"body"|"caption", fontSize?: number, color?: string, align?: "left"|"center"|"right" }`
- `ImageWidget` : `{ type: "image", src: string, width?: number|string, height?: number|string, fit?: "cover"|"contain"|"fill", alt?: string }`
- `ButtonWidget` : `{ type: "button", label: string, action?: string, icon?: string, variant?: "primary"|"secondary"|"ghost" }`
- `ProgressBarWidget` : `{ type: "progress", progressType?: "steps"|"score", showLabel?: boolean, color?: string }`
- `ModuleWidget` : `{ type: "module" }` — slot pour le plugin du module associé au nœud
- `SpacerWidget` : `{ type: "spacer", height?: number|string }`

Chaque variante SHALL imposer ses champs requis et interdire les champs des autres variantes (`additionalProperties: false` par variante).

Tout widget MAY porter un sous-objet optionnel `styles` : `{ fontFamily?: string, fontSize?: number, fontWeight?: "normal"|"bold", color?: string, align?: "left"|"center"|"right" }`. Les `styles` du widget SHALL prendre le pas sur les styles de l'écran et les styles globaux. `additionalProperties: false` SHALL être appliqué au sous-objet `styles`.

Tout widget visuel (image, carte, module, et par extension texte/bouton/progression) MAY porter des props de mise en page communes et optionnelles : `largeurPct` / `hauteurPct` (numbers 0-100, relatifs à la zone ; absents = comportement actuel auto/flux) et `pleinEcran` (booléen, défaut `false` ; à `true` le widget sort du flux et remplit le cadre téléphone en `absolute inset-0`, sous la zone overlay qui reste au sommet). Ces props SHALL être déclarées explicitement dans chaque variante visuelle du schéma (jamais implicites, `additionalProperties: false` conservé).

Un widget `pleinEcran` SHALL occuper effectivement toute la hauteur du cadre téléphone dans le rendu (chaîne de hauteur pleine du wrapper breakout jusqu'au contenu : aucune hauteur fixe résiduelle de type `h-40`) ; seul le contenu peint change (tuiles étirées, marqueurs relatifs), jamais l'empilement (zones puis breakout puis overlay) ni l'interactivité par mode (édition non-interactive, lecture seule active).

L'ordre de peinture intra-zone SHALL suivre l'ordre du tableau `widgets` (dernier = dessus) ; réordonner (drag existant, monter/descendre) SHALL changer l'empilement sans toucher aux autres props. L'empilement des zones SHALL rester fixe : header → content → footer → overlay.

#### Scenario: TextWidget valide

- **GIVEN** un widget `{ type: "text", text: "Bienvenue", style: "heading" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Widget avec type inconnu

- **GIVEN** un widget `{ type: "unknown_widget" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (type non dans l'enum)

#### Scenario: TextWidget avec champ étranger

- **GIVEN** un widget `{ type: "text", text: "test", src: "image.png" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (champ `src` étranger à TextWidget)

#### Scenario: Widget avec styles valides

- **GIVEN** un widget `{ type: "text", text: "Titre", styles: { fontFamily: "Georgia", fontSize: 20, fontWeight: "bold" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Widget avec style inconnu

- **GIVEN** un widget `{ type: "text", text: "Titre", styles: { shadow: true } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (champ étranger à `styles`)

#### Scenario: Carte plein écran valide

- **GIVEN** un widget `{ type: "map", source: { kind: "steps" }, pleinEcran: true }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Taille hors bornes rejetée

- **GIVEN** un widget `{ type: "image", src: "a.png", largeurPct: 150 }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (hors 0-100)

#### Scenario: Carte plein écran remplit le cadre

- **GIVEN** un écran avec un widget carte `pleinEcran: true` et des fantômes « + Pied de page » / « + Surimpression » visibles en édition
- **WHEN** le canvas affiche l'écran
- **THEN** la carte occupe toute la hauteur du cadre (aucun bandeau fixe), les fantômes restant peints dessous et l'overlay éventuelle au sommet

#### Scenario: Terminal plein écran sans bandeau

- **GIVEN** le même widget ouvert dans le terminal simulé (lecture seule)
- **WHEN** l'écran s'affiche
- **THEN** la carte interactive occupe tout le cadre et reste navigable (pan/zoom/clic), sans zone vide résiduelle
