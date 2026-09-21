## Context

État observé : `StyleFields.tsx` rend une ligne étiquetée par propriété (label + badge d'origine + input), soit jusqu'à 8 lignes par section de style. L'API est saine (`niveau`, `local`, `resolved`, `origins`, `champs?`, `onChange`) et consommée par `PropertiesPanel` dans les 3 sections + customs de module. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Regrouper les contrôles en une barre compacte genre éditeur de texte riche, à API inchangée pour `PropertiesPanel`.
- Conserver badges d'origine, héritage par propriété et retrait de surcharge.

**Non-Goals:**
- Changer le modèle `styles`, la résolution `resolveStyles` ou le schéma Draft-07.
- Ajouter des propriétés de style (pas de nouveau champ, pas d'italique/souligné : hors enum du schéma).
- Refonte visuelle globale du panneau (seules les sections de style changent).

## Decisions

### D1 — Un seul composant `StyleToolbar`, même API que `StyleFields`

**Décision** : remplacer le rendu ligne-par-ligne par une barre à 4 groupes (typographie : police/taille/gras ; couleur : texte/fond ; alignement : 3 boutons segmentés ; surcharge : état + retrait), en gardant exactement les props `StyleFields` (niveau, local, resolved, origins, champs, onChange). `PropertiesPanel` ne change que d'import/nom.

**Alternative écartée** : nouveau composant coexistant avec l'ancien + bascule — deux rendus à maintenir pour le même contrat, sans bénéfice auteur.

### D2 — Contrôles natifs compacts, pas de librairie d'éditeur

**Décision** : boutons toggle natifs (gras, alignement segmenté), `input[type=color]` + champ texte hex pour les couleurs, `select` compacts pour police/taille. Chaque contrôle porte `title` + `aria-label` et affiche la valeur héritée en placeholder (même convention qu'aujourd'hui).

**Alternative écartée** : intégrer un toolkit d'éditeur riche (TipTap/slate) — disproportionné pour 8 champs scalaires persistés en JSON, et incompatible avec la résolution par propriété.

### D3 — Badges d'origine conservés, mutualisés par groupe

**Décision** : le badge d'origine reste lisible sans prendre une ligne par champ — un indicateur compact par contrôle (pastille + `title`), et le libellé complet d'origine dans l'infobulle. La règle « hérité = placeholder lecture seule jusqu'à surcharge » est inchangée.

**Alternative écartée** : supprimer les badges au profit d'une couleur seule — régression d'accessibilité (jamais couleur seule) et perte d'information d'héritage.

## Risks / Trade-offs

- [Densité vs tactile] → contrôles compacts mais cible tactile 44px conservée (hauteur min sur boutons/inputs) ; mitigation : vérifiée dans les tâches.
- [Couleurs : picker + hex] → deux contrôles synchronisés pour la même valeur ; mitigation : un seul état source (`local`), les deux écrivent via `onChange`.
- [Champs customs filtrés] → la barre doit honorer `champs` (ex. module sans `align`) ; mitigation : chaque groupe ne rend que les champs demandés, groupe vide = masqué.
