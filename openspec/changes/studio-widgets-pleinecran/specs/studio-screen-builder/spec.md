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
