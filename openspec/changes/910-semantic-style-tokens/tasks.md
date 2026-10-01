## 1. Tokens et heritage

- [ ] 1.1 Definir les roles (`color.*`, `font.*`, `radius`, `spacing`, `elevation`, `motion`) et constater leur resolution light/dark dans Studio, simulateur et runtime sur un jeu temoin.
- [ ] 1.2 Migrer les couleurs en dur (Studio + `commonMain`, jamais de code plateforme) et constater zero litteral restant via le lint.

## 2. Validation et non-regression

- [ ] 2.1 Ajouter la regle C2 (litteral = avertissement) + lint Studio et constater l'avertissement sur un widget volontairement en dur.
- [ ] 2.2 Ajouter le test visuel clair/sombre (`sherlock-holmes`, `game-5poi.json`) et constater l'echec sous 4,5 de contraste sur un cas temoin.
- [ ] 2.3 Migrer les jeux de reference et constater C1+C2 verts + captures conformes.
