# game-i18n — delta sur offline-pack (change 912)

## ADDED Requirements

### Requirement: Fichiers de langue au manifest

Chaque langue declaree SHALL exister en `i18n/<lang>.json` dans le pack et SHALL etre listee au `manifest.json` (`size` en octets UTF-8, `sha256`), verifiee et mise a jour au differentiel comme tout asset. Un pack dont une langue declaree manque SHALL etre refuse avec le fichier nomme.

#### Scenario: Langue manquante nommee
- **GIVEN** un jeu declarant `locales: [fr, en]` sans `i18n/en.json`
- **WHEN** l'import verifie le pack
- **THEN** le pack est refuse avec `i18n/en.json` nomme
