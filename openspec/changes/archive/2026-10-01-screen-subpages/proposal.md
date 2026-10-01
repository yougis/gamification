## Why

Un écran d'étape peut empiler minijeu, images et vidéos dans sa zone content : le joueur les voit rognées (`object-cover`) ou noyées dans un scroll, sans savoir où il en est. Le quiz (questions) et le récit INFO (steps) paginent déjà avec swipe + « Suivant » — il faut généraliser ce pattern à tout contenu d'étape : une unité par page, visible en entier, avec avancement.

## What Changes

- Règle de sous-pages partagée : dans `zones.content`, chaque widget `module` ou `image` ouvre une nouvelle sous-page (sauf premier widget) ; textes, boutons, progress et spacers appartiennent à la sous-page courante. Un module ne partage jamais sa page.
- Création automatique côté auteur : ajouter un widget `module`/`image` crée visiblement une nouvelle sous-page (même UX que « + Question » du quiz), avec onglets/pastilles de navigation.
- Prévisualisation active dans le canvas : l'auteur swipe/clique entre les sous-pages (état local d'édition), boutons Suivant/Précédent visibles comme dans le prévisualisateur.
- Fit par type : médias et minijeux rendus en entier, réduits au viewport en respectant le ratio (portrait comme paysage) ; le texte long garde le défilement.
- Progression : le widget `progress` (`steps`) reflète l'avancement `page i/N` dans un contenu paginé.
- Joueur (Studio preview + player partagé) : swipe horizontal ET bouton « Suivant » (même avancer), compteur, « Terminer » sur la dernière page.

## Capabilities

### New Capabilities

Aucune — pas de nouveau canal ni concept schéma, la pagination est dérivée par règle partagée.

### Modified Capabilities

- `studio-screen-builder`: la zone content se découpe en sous-pages explicites (auto-création, onglets, prévisualisation active, fit par type).
- `player-screen-render`: le player pagine les sous-pages (swipe + Suivant/Précédent/Terminer, compteur, progress reflétant l'avancement, un module par page).

## Impact

- Studio (canvas, ZoneRenderer, WidgetRenderer image, prévisualisateur) + player partagé (`shared/ui/screen`) + shells (rien à câbler, même seam).
- Aucune modification du schéma Draft-07 : les sous-pages sont dérivées par règle partagée (pas de nouveau champ, pas de migration, jeux existants inchangés — contenu sans média = une seule page).
- Aucune valeur réservée `CONDITIONAL`/`WINDOW` touchée, aucun module ajouté au registre.
- Réseau : aucun (mise en page locale).
- Dépendance : fait suite au change archivé `parite-player` (renderer partagé), sans le rouvrir.
