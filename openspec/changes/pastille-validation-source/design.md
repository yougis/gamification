## Context

Le compteur (`App.tsx:1140`, `rapport.filter(r => !r.includes(": OK"))`) mélange rapport d'activité et erreurs, tandis que l'écran Valider rend les diagnostics C1/C2 — d'où le fantôme « 1 problème » après un succès. La spec parente définit déjà N comme le total d'erreurs C1 + C2 : l'implémentation est en écart, le contrat n'a besoin que d'être explicité sur la source. Voir proposal.md (Why) et le delta de spec pour le contrat.

## Goals / Non-Goals

**Goals:**
- Une seule source de vérité (diagnostics) pour le compteur et les listes.
- Lever l'ambiguïté du compteur manifest sans changer son contenu.

**Non-Goals:**
- Refonte du pipeline de validation ou de l'écran Valider.
- Nouveau design de pastille (texte, position, navigation inchangés).

## Decisions

### D1: Compteur dérivé des diagnostics, rapport d'activité séparé

**Choix:** Calculer N depuis les diagnostics C1/C2 de niveau erreur (même sélecteur que les listes) ; garder `rapport` comme simple journal d'activité sans valeur de comptage.

**Raison:** Supprime toute une classe de faux positifs (tout futur message de succès est neutre par construction) au lieu de colmater l'heuristique chaîne par chaîne.

### D2: Libellé manifest en assets, pas en fichiers

**Choix:** Afficher « N asset(s) » avec mention que `game.json` suit à la génération, plutôt qu'un compteur brut.

**Raison:** Le state manifest ne contient que les assets ; présenter « 0 fichier » suggère un manque qui n'existe pas.

## Risks / Trade-offs

- **[Divergence future]** → Un nouvel écran pourrait recompter à sa façon. Mitigation : un unique sélecteur partagé pour le compteur.
- **[Régression visuelle]** → Aucune : mêmes composants, mêmes seuils d'affichage, seule la valeur change.
