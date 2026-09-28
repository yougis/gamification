## Context

Voir `proposal.md` (Why) et l'exploration (option C validée). État observé : `ZoneRenderer.tsx` (`LAYOUT_CLASSE` stack/grid/`free`-flux, aucun positionnement) ; seule `ImageWidget` a `width/height` ; `PhoneCanvas` empile header → content → footer → overlay absolue ; ordre intra-zone = ordre du tableau (drag inter/intra-zones existant via `moveScreenWidgetAcross`) ; schéma `additionalProperties: false` par variante (tout nouveau champ doit être déclaré variante par variante).

## Goals / Non-Goals

**Goals:**
- Carte (puis image) dimensionnable en % et commutable plein écran, auteur comme terminal simulé.
- Chevauchement lisible : ordre du tableau = ordre de peinture, overlay toujours au sommet.
- Jeux existants sans ces props : rendu pixel-identique.

**Non-Goals:**
- Pas de x/y absolus ni de z-index numérique (voie B explicitement écartée).
- Pas de changement des layouts de zone, des templates, ni des renderers natif/PWA (notés, change dédié).
- Pas de migration des `width/height` image existants (conservés, le % est une alternative).

## Decisions

- **`largeurPct`/`hauteurPct` en % de la zone, pas en px** : survit aux 4 viewports sans donnée par format (même philosophie que le flux) ; bornes 0-100 validées en C1.
- **`pleinEcran` breakout sous l'overlay** (`absolute inset-0` du cadre, overlay au-dessus) plutôt que plein-content : rend l'exemple « carte + titre en surimpression » possible avec l'overlay existante (texte + bouton par-dessus la carte).
- **Ordre du tableau comme z-order** plutôt qu'un champ `z` : aucun état nouveau, le drag existant devient l'outil de couches, undo natif ; pas de conflit à résoudre entre deux sources d'ordre.
- **Déclaration explicite par variante visuelle** (image, carte d'abord) : respecte `additionalProperties: false` sans l'assouplir ; texte/bouton/progression/module suivent le même contrat quand pertinent, jamais de champ implicite partagé hors schéma.

## Risks / Trade-offs

- [Plein écran + header/footer visibles] → Mitigation : spécifié recouvrant (le cadre entier) ; l'auteur qui veut chrome visible ne coche pas `pleinEcran` (template `map-fullscreen` existant pour carte grande en flux).
- [Deux widgets plein écran dans un écran] → Mitigation : dernier du tableau peint dessus ; l'auteur n'en met qu'un en pratique (pastille/avertissement non bloquant envisageable à l'implémentation, sans rejet).
- [Renderer joueur natif/PWA en retard] → Mitigation : props ignorées sans crash en attendant leur change (contrat : inconnu = flux actuel + avertissement, jamais rejet).
