## Context

Voir `proposal.md` (Why). État actuel lu dans `studio/src/App.tsx` : le menu ouvert (`w-52`, ~l.1729) n'expose aucun contrôle de repli — `basculerMenu` n'est câblé que sur le bouton « Déplier le menu » du rail (`w-14`, ~l.1707), si bien que l'état replié est inatteignable et `geoplay-menu-replie` ne vaut jamais `"1"`. Les boutons du Composer utilisent la classe `.btn` de base (`min-height: 44px` dans `styles/theme.css`, règle « Cibles >= 44px ») avec des surcharges locales `min-h-8 + text-[8px]` déjà présentes sur beaucoup de boutons du Composer ; les rails utilisent `px-2.5` avec icônes 15-17.

## Goals / Non-Goals

**Goals:**
- Rendre le repli du menu effectif dans les deux sens, avec persistance inchangée.
- Densifier d'un cran tous les boutons d'action du Composer sur `lg+`, via une variante partagée.

**Non-Goals:**
- Pas de changement des actions, libellés, tooltips, opérations MCP ni persistance.
- Pas de refonte du rail replié ni de la vue étroite `<lg`.
- Pas de sortie de la règle 44 px sur tactile.

## Decisions

- **Chevron « Replier le menu » dans l'en-tête du menu ouvert** (à côté du titre Studio ou en pied de panneau), réutilisant `ChevronRepli` + `basculerMenu` existants, mêmes tooltips/aria que les autres panneaux. Alternative écartée : zone cliquable sur tout l'en-tête — moins découvrable et conflit avec la sélection.
- **Variante `.btn-compact` dans `theme.css`** (hauteur ~32 px, paddings et icônes réduits) appliquée aux boutons d'action du Composer sur `lg+` uniquement (media query ou classe conditionnelle), plutôt que d'éditer chaque `className` à la main : un seul point de vérité, réversibilité immédiate. Alternative écartée : baisser `.btn` globalement — impacterait tous les écrans et casserait la règle tactile 44 px.
- **Portée « tous les boutons » = boutons d'action du Composer** (toolbar centrale, en-têtes `NodeList`/détail, rails, chevrons, `Splitter` inchangé) ; les formulaires (champs `min-h-10`, `StyleToolbar` 44 px) et les autres écrans restent intacts. Alternative écartée : densifier aussi les formulaires — hors demande, risque lisibilité.
- **Garde tactile** : la variante compacte ne s'applique qu'en `lg+` (usage pointeur supposé) ; en `<lg` les 44 px restent la règle, conformément à la spec.

## Risks / Trade-offs

- [Risk] Boutons compacts trop petits à la souris pour certains auteurs → Mitigation : variante d'un seul cran (~32 px), tooltips conservés, réversible en une classe.
- [Risk] Conflit d'archive avec le change `studio-composer-3-colonnes` (touche les mêmes zones du Composer et la même spec) → Mitigation : archiver `studio-composer-3-colonnes` d'abord, puis rebaser ce change (re-vérifier `openspec validate`).
- [Trade-off] Deux densités coexistent (`lg+` compact vs `<lg` 44 px) : assumé, c'est le compromis pointeur/tactile de la spec.
