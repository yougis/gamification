# game-i18n — delta sur game-schema (change 912)

## ADDED Requirements

### Requirement: Textes en cles $t

Toute chaine affichable du `game.json` SHALL etre un objet `{"$t": "cle"}` (aucun litteral, C1 `additionalProperties:false` + motif). Le jeu SHALL declarer `i18n: {defaultLocale, locales}` (`defaultLocale` = fr au depart, `locales` incluant fr et en). Les cles SHALL suivre `<domaine>.<id>.<champ>[.<sous-id>]` et rester stables au renommage (le Studio les migre). ICU simplifie (pluriels `{count, plural, ...}`, variables `{nom}`) SHALL etre supporte ; les medias localisables SHALL replier sur le media par defaut.

#### Scenario: Litteral rejete
- **GIVEN** un noeud avec un titre en chaine brute
- **WHEN** la validation C1 tourne
- **THEN** le jeu est rejete avec le champ nomme

#### Scenario: Renommage conservant les cles
- **GIVEN** un noeud renomme dans le Studio
- **WHEN** le JSON est regenere
- **THEN** les cles `$t` sont inchangees (seuls les libelles `i18n/*.json` suivent si l'auteur les edite)
