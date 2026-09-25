## ADDED Requirements

### Requirement: Publication robuste depuis le navigateur

Le service catalogue SHALL accepter les appels du Studio exécuté dans un navigateur : en-têtes CORS (`Access-Control-Allow-Origin`, méthodes, en-têtes) et réponse au pré-vol `OPTIONS` sur toutes les routes. Le Studio SHALL normaliser l'URL de service saisie par l'auteur (espaces rognés, slash final retiré, suffixe `/publish` retiré s'il désigne l'endpoint et non le service). Un échec réseau ou HTTP SHALL afficher un message actionnable (service injoignable : vérifier qu'il tourne et que l'URL est celle du service, pas de l'endpoint ; code HTTP et corps d'erreur le cas échéant), jamais une `NetworkError` brute.

#### Scenario: Publication vers un service local

- **GIVEN** le service catalogue tournant sur `http://localhost:3000` et un jeu valide
- **WHEN** l'auteur publie avec l'URL `http://localhost:3000`
- **THEN** la publication réussit et le code à 4 chiffres s'affiche (le pré-vol CORS passe)

#### Scenario: URL d'endpoint normalisée

- **GIVEN** l'auteur saisissant `http://localhost:3000/publish`
- **WHEN** il publie
- **THEN** le Studio appelle `http://localhost:3000/publish` (suffixe non dupliqué) et la publication réussit

#### Scenario: Service injoignable explicite

- **GIVEN** aucun service à l'URL saisie
- **WHEN** l'auteur publie
- **THEN** un message indique que le service est injoignable et rappelle de vérifier l'URL et que le service tourne
