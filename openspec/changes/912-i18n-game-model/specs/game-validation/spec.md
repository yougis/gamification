# game-i18n — delta sur game-validation (change 912)

## ADDED Requirements

### Requirement: Regles C2 i18n graduees

Le validateur SHALL emettre : erreur pour toute cle manquante dans `defaultLocale`, avertissement pour toute cle manquante dans une autre langue declaree (publication permise apres confirmation), info pour toute cle orpheline (definie mais non referencee). Le runtime SHALL resoudre langue joueur -> langue systeme -> `defaultLocale` -> cle brute signalee, avec changement de langue possible sans quitter la partie.

#### Scenario: Traduction partielle exportable
- **GIVEN** un jeu complet en fr avec 2 cles manquantes en en
- **WHEN** l'auteur exporte apres confirmation
- **THEN** l'export reussit avec les 2 avertissements journalises

#### Scenario: Defaut manquant bloquant
- **GIVEN** une cle absente de `i18n/fr.json` (defaut)
- **WHEN** la validation tourne
- **THEN** une erreur bloque l'export avec la cle nommee
