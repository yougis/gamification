## Why

La barre de navigation latérale ne peut aujourd'hui que se déplier : le rail replié existe mais aucun contrôle ne permet de replier le menu ouvert (`basculerMenu` n'est câblé que côté dépliage), si bien que 208 px restent en permanence occupés sur grand écran. Dans le Composer, les boutons d'action (toolbar centrale, en-têtes, rails) occupent eux aussi trop de place verticale et concurrencent visuellement le canvas.

## What Changes

- La navigation latérale devient rétractable dans les deux sens : un contrôle « Replier le menu » dans le menu ouvert (chevron, même logique icône + tooltip que les autres panneaux), dépliage inchangé depuis le rail ; état persisté dans `geoplay-menu-replie` comme aujourd'hui.
- Densification d'un cran de tous les boutons d'action du Composer (toolbar centrale Graphe/Carte/Screen, en-têtes liste/détail, rails, chevrons) : paddings, hauteurs et tailles d'icônes réduits via une variante compacte partagée, sans changer les libellés ni les tooltips.
- Les cibles tactiles restent conformes à la règle 44 px sur la vue étroite (`<lg`, onglets tactiles) ; la variante compacte s'applique sur grand écran (`lg+`, usage pointeur).
- Aucun changement de comportement (mêmes actions, mêmes opérations MCP, même persistance) : c'est un changement de présentation uniquement.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: navigation latérale rétractable dans les deux sens (exigence existante rendue effective) et densité compacte des boutons d'action du Composer.

## Impact

- Code : `studio/src/App.tsx` (contrôle replier dans le menu ouvert, application de la variante compacte), `studio/src/styles/theme.css` (variante `.btn-compact` ou équivalent), `studio/src/components/{NodeList,Repli}.tsx` et toolbar centrale (adoption de la variante).
- Aucun impact schéma graphe (Noeuds/activation/registre/branding/manifest) : pas de consommateur à mettre à jour.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
