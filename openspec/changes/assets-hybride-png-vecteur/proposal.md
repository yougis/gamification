## Why

Les jeux référencent 26 SVG (116 Ko au total) : parfaits dans le navigateur, invisibles sur Android (`BitmapFactory` ne décode pas le SVG). Tout-rasteriser gonflerait les packs pour rien et perdrait la netteté des icônes ; tout-garder-en-SVG laisse le téléphone aveugle. La règle est donc hybride : contenu en raster, icônes en vectoriel natif par plateforme, SVG conservés comme sources.

## What Changes

- **Contenu en PNG/JPG partout** : illustrations d'écrans, sources puzzle/7-différences, marqueurs et fallbacks RA, photos — rasterisés depuis les SVG quand nécessaire (`rsvg-convert`), PNG commités à côté des sources, refs JSON basculées vers les PNG (le navigateur les affiche aussi bien).
- **Icônes en vectoriel natif** : refs JSON en `.svg` conservées (Studio direct) ; sur Android, résolution vers `VectorDrawable` convertis au build (zéro dépendance runtime) ; iOS inchangé (pont PNG existant, icônes concernées à traiter dans le même esprit au besoin).
- **`game-5poi.json`** : remplace les liens morts (`assets/c.png`, `assets/e.mind`, jamais existés) par 2 visuels neutres générés assumés (fixture abstraite).
- Manifests régénérés (SHA-256 réels), revalidation C1+C2, `SherlockParityJvmTest` vert, transfert pack `.zip` pour preuve device.

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `offline-pack`: politique d'assets hybride (contenu raster PNG/JPG, icônes SVG sources + vecteurs plateforme).
- `sherlock-holmes`: habillage sur PNG (refs, manifest), SVG conservés comme sources.

## Impact

- Code : assets PNG + `VectorDrawable` Android, loader Android (mapping `.svg` → drawable, repli bitmap), JSON des 2 fixtures, manifests.
- Schéma jeu inchangé (chemins d'assets déjà opaques) ; validation C1/C2 inchangée.
- Poids : PNG contenu (photos/illustrations déjà lourdes par nature) + 116 Ko de SVG sources ; pas de variantes densité grâce au vecteur.
- Non-couvert : PDF vectoriels iOS (pont PNG actuel conservé), décodeur SVG runtime (écarté), conversion auto par pipeline (manuelle, auditée fichier par fichier).
