---
name: geoplay-i18n-migrations
description: Cadre l'i18n fichiers separes et le versionnement de schema GeoPlay (cles $t, migrations vN->vN+1, tokens). A utiliser pour les changes 910-914 et toute evolution de schema ou de theme.
---

# Skill : geoplay-i18n-migrations

Specialiste i18n + migrations + tokens GeoPlay (jalon M2, prerequis de M3).

## i18n (modele fichiers separes)

- `game.json` = cles `{"$t"}` uniquement (aucune chaine affichable en dur, C1 additionalProperties:false + motif) ; `i18n/fr.json` + `en.json` dans le package et au manifest ; `i18n: {defaultLocale: fr, locales: [fr, en]}`.
- Convention de cles `<domaine>.<id>.<champ>[.<sous-id>]`, stables au renommage (Studio migre les cles) ; ICU simplifie (pluriels, variables) ; medias localisables avec repli sur defaut.
- C2 : manquante en defaultLocale = erreur, en autre langue = avertissement, orpheline = info.
- Runtime : joueur -> systeme -> defaultLocale, changement de langue sans quitter la partie ; UI Studio (react-i18next) et mobile (ressources Compose) traduites fr/en avec extraction CI des cles manquantes.
- Migration : outil auto extrayant les chaines des jeux de reference vers `i18n/fr.json` ; editeur Studio (tableau cle x langue, completion, filtre manquantes, import/export, bascule d'apercu).

## schemaVersion et tokens

- `schemaVersion` entier par jeu ; chaque evolution livre une migration pure testee vN -> vN+1 ; Studio migre a l'ouverture, runtime refuse un jeu trop recent avec message clair.
- Tokens semantiques (roles color.*, font.*, radius, spacing, elevation, motion) ; theme = {id, version, tokens light/dark, widgetVariants?, assets?} ; heritage global.theme -> screen.theme -> widget ; mode sombre = tokens.dark, zero couleur en dur ; C2 couleur litterale = avertissement + lint ; contraste WCAG AA (ratio >= 4,5).

## Instructions

- 911 + 912 bloquent M3 : ne jamais faire passer de backend/catalogue/licence avant leur archivage.
- Toute evolution de schema revalide les jeux de reference (non-regression game-5poi.json, sherlock-holmes en fr et en).
- Signale toute chaine en dur, toute cle instable au renommage et tout theme non conforme AA comme avertissement actionnable.
