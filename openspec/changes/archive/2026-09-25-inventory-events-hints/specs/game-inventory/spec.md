## ADDED Requirements

### Requirement: Événements d'inventaire journalisés

Chaque action d'inventaire SHALL émettre un événement typé, persisté en SQLite avec écriture immédiate (même `sessionId` de reprise que le reste de la progression) : `INVENTORY_OPENED` (boîte à outils ouverte), `ITEM_SELECTED` (objet sélectionné/consulté), `ITEM_USED` (objet utilisé), `ITEM_COMBINED` (combinaison tentée, voir change craft), `ITEM_GIVEN` / `ITEM_REMOVED` (effets appliqués). Chaque événement porte `itemId` quand il concerne un objet, plus timestamp et flag triche le cas échéant. Le vocabulaire SHALL être fermé : seuls ces six types existent, versionnés avec le schéma.

#### Scenario: Sélection journalisée
- **GIVEN** un joueur possédant `loupe` qui la sélectionne dans la boîte à outils
- **WHEN** l'action est effectuée
- **THEN** un événement `ITEM_SELECTED {itemId: "loupe"}` est écrit en SQLite et rejouable après kill via le même `sessionId`

#### Scenario: Type inconnu refusé
- **GIVEN** un jeu référençant un type d'événement hors vocabulaire
- **WHEN** la validation tourne
- **THEN** le jeu est rejeté avec le type fautif nommé
