## 1. Conteneurs traversants

- [x] 1.1 Neutraliser les conteneurs `coucheFond`/`couchePleinEcran` (`pointer-events-none`) en simu et vérifier qu'un geste hors contrôle atteint la couche du dessous
- [x] 1.2 Vérifier qu'en édition la sélection au clic et le routage par calques restent inchangés

## 2. Opacité des contrôles

- [x] 2.1 Rendre le wrapper `WidgetRenderer` opaque uniquement en édition ou pour `button` / `map`-avec-`carteSimu` / `module`, et vérifier que boutons, carte et quiz restent actionnables dans leurs bornes
- [x] 2.2 Vérifier que textes, images, spacers et progressions traversent vers le fond en simu (pan carte sous un texte, aucune sélection)

## 3. Chute et overlay

- [x] 3.1 Vérifier la chute vers le fond (geste dans le vide = pan carte) et le blocage modal derrière un overlay non fermable

## 4. Validation croisée

- [x] 4.1 Lancer `tsc --noEmit`, les smokes Studio (`test:runtime`, `test:screen`) et vérifier zéro régression
- [x] 4.2 Rejouer un écran composé (fond carte + header bouton + texte + module) dans le terminal et vérifier chaque zone agit et le fond panne ailleurs
