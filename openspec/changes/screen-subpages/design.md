## Context

Voir `proposal.md`. Le pattern existe déjà deux fois (quiz : questions ; INFO : steps avec swipe ±40 px + Suivant/Précédent/Terminer + compteur — `plugins/info.tsx`). Ce change le généralise au contenu d'étape, sans toucher au schéma.

## Goals / Non-Goals

**Goals:**
- Une unité de contenu par page, navigation identique partout (canvas, preview, 3 players).
- Zéro migration : règle dérivée, jeux existants = 1 page.

**Non-Goals:**
- Pages nommées/ordonnables manuellement (l'ordre reste celui des widgets).
- Préchargement ou transitions animées entre pages.

## Decisions

### D1 — Sous-pages dérivées, jamais persistées

`paginateContent(widgets): List<List<Widget>>` : un widget `module` ou `image` (non premier) ouvre une page. Même fonction (portée TS + portée Kotlin) dans le Studio et le `shared` — pas de divergence auteur/joueur possible, pas de champ schéma, `additionalProperties` et validateurs inchangés. Alternative écartée : `pages[]` persisté (migration, double source de vérité avec l'ordre des widgets).

### D2 — Fit par type, scroll réservé au texte

`image`/`module` : `contain` + bornes max du viewport (shrink, ratio conservé) dans les 4 viewports ; défaut image passant de `cover` à `contain` avec note de migration visuelle pour les jeux existants (aucun rejet, rendu potentiellement différent mais jamais rogné). `text` long : scroll vertical conservé. En Compose partagé : `Modifier` de contrainte + `ContentScale.Fit` côté shell pour les assets.

### D3 — Navigation miroir auteur/joueur

Joueur : swipe ±40 px + Suivant/Précédent/Terminer + compteur (réutilise le code INFO côté Studio ; nouveau `SubPageNav` en Compose partagé). Canvas : mêmes contrôles branchés sur un index local (état d'édition, sélection suivant la page). `progress` (`steps`) branché sur l'index dans les deux.

## Risks / Trade-offs

- [Changement du défaut image `cover`→`contain`] → jeux existants re-rendus sans rognage (amélioration voulue), signalé en note de migration, jamais bloquant.
- [Parité des règles TS/Kotlin] → deux implémentations de la même règle ; mitigation : scénarios miroir + fixture Sherlock (8 écrans) comme oracle commun.
- [Minijeux plus grands que le viewport même réduits] → shrink agressif illisible ; mitigation : taille min lisible puis scroll interne du module (documenté, pas de rejet).

## Migration Plan

Additif : règle + UI. Les jeux sans média rendent 1 page, à l'identique. Déploiement PWA via pipeline existant.

## Open Questions

Aucune bloquante. Seuil swipe Compose (densité-indépendant) à caler à l'implémentation sans impact specs.
