## ADDED Requirements

### Requirement: Contenu raster PNG/JPG

Tout asset de contenu (illustration d'écran, source puzzle/7-différences, marqueur et fallback RA, photo) SHALL être référencé et embarqué en PNG ou JPG, jamais en SVG : les moteurs bitmap (découpe puzzle, vision RA, `BitmapFactory`) l'exigent et le navigateur les affiche aussi bien. Le SVG d'origine SHALL être conservé à côté comme source (même nom, extension `.svg`).

#### Scenario: 7-différences jouable sur téléphone
- **GIVEN** `moriarty` avec `source`/`derivee` en PNG issus des SVG
- **WHEN** le joueur ouvre le nœud sur Android
- **THEN** les deux images s'affichent et les zones tactiles sont validées

#### Scenario: Source conservée
- **GIVEN** `assets/moriarty-source.png` référencé
- **WHEN** l'auteur cherche la source
- **THEN** `assets/moriarty-source.svg` existe à côté pour régénération

### Requirement: Icônes vectorielles natives

Les icônes (objets d'inventaire, pictogrammes, pastilles) SHALL rester référencées en `.svg` dans le JSON (rendu direct côté Studio). Sur Android, le loader SHALL résoudre chaque `.svg` vers le `VectorDrawable` converti au build (même basename), avec repli bitmap si absent. Aucune dépendance runtime de décodage SVG SHALL être introduite.

#### Scenario: Icône toolbox sur Android
- **GIVEN** un objet avec `icon: "loupe.svg"` et `loupe.xml` converti
- **WHEN** la boîte à outils s'affiche
- **THEN** le pictogramme vectoriel s'affiche, net à toute densité

#### Scenario: Icône non convertie signalée
- **GIVEN** un `.svg` référencé sans `VectorDrawable` correspondant
- **WHEN** le loader cherche l'icône
- **THEN** le repli bitmap s'applique (ou état explicite), jamais de crash
