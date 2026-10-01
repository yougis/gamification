## Why

Les textes affichables sont aujourd'hui noyes dans le JSON de jeu : toute traduction duplique le graphe et rend le backend (M3) et le LLM (M5) ingérables. Le modele fichiers separes (§3.2) doit atterrir **avant M3**, son cout de migration croissant avec chaque jeu cree.

## What Changes

- Dans `game.json`, toute chaine affichable devient `{"$t": "cle"}` (C1 : `additionalProperties:false` + motif, pas de litteral) ; cles stables `<domaine>.<id>.<champ>[.<sous-id>]` migrees au renommage.
- Package : `i18n/fr.json` + `en.json` inclus au manifest avec sha256 ; `i18n: {defaultLocale: fr, locales: [fr, en]}` ; ICU simplifie (pluriels, variables) ; medias localisables avec repli.
- C2 : manquante en `defaultLocale` = erreur ; en autre langue = avertissement (publication permise) ; orpheline = info.
- Runtime : langue joueur -> systeme -> `defaultLocale`, changement sans quitter la partie ; pack offline inchangé sinon.
- Migration automatique des jeux de reference (`game-5poi.json`, `sherlock-holmes`) vers `i18n/fr.json`.
- UI Studio/mobile traduites fr/en separement (913/914 s'appuient dessus, hors scope ici hors chaines du modele).
- Depend de 911. **Bloque M3.**

## Capabilities

### New Capabilities

- `game-i18n`: modele de cles, fichiers de langue, repli, C2 i18n, migration des references (deltas sur `game-schema`, `offline-pack`, `game-validation`).

### Modified Capabilities

- `game-schema`: champs `$t`, bloc `i18n`, interdiction des litteraux affichables.
- `offline-pack`: `i18n/*.json` au manifest, verification et diff comme tout asset.
- `game-validation`: regles C2 i18n (erreur/avertissement/info).

## Impact

- Schema, Studio (edition via cles + migration au renommage), runtime (resolution + repli), pack (manifest), backend futur (M3 lit le meme modele).
- Pre-requis de 913/914/916/946 et de tout M3.

## Impact CodeGraph

- Inventaire exact a completer a l'apply via CodeGraph : formulaires texte Studio, renderer `commonMain`, validateur C1/C2, export pack.
- Textes UI Studio/mobile eux-memes : changes 913/914, pas ici.
