## MODIFIED Requirements

### Requirement: Rendu des zones et widgets

L'écran de l'etape ouverte SHALL etre rendu selon le mode vue (apercu/jouable/relecture/rejeu) avec zones et widgets, styles resolus, assets pack uniquement. Le widget `{ type: "module" }` SHALL afficher le renderer du module avec branding resolu. `Valider` SHALL ecrire `COMPLETED`, `Abandonner` SHALL ecrire `ABANDON`. Un module sans renderer SHALL afficher un etat non bloquant (terminer/abandonner par triche).

#### Scenario: Écran quiz-focus complet
- **WHEN** le joueur ouvre en mode jouable un noeud avec header, content (texte + module QUIZ) et footer
- **THEN** les trois zones s'affichent avec le quiz interactif, la validation fait passer `COMPLETED` puis retour HOME

#### Scenario: Module sans renderer non bloquant
- **WHEN** le joueur ouvre une etape dont le module n'a pas de renderer joueur
- **THEN** un état explicite propose terminer/abandonner et la partie continue
