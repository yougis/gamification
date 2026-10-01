## Context

État vérifié : zones en flex vertical strict (jamais de superposition) ; couche breakout `absolute inset-0` peinte APRÈS les zones (donc par-dessus le contenu) et avant l'overlay ; aucun z-index pilotable ; renderers carte en `h-40` (bandeau) hors breakout. Le besoin inverse l'ordre actuel pour le fond : carte dessous, contenu dessus, carte interactive. Voir proposal.md (Why) et les deltas de specs pour le contrat.

## Goals / Non-Goals

**Goals:**
- Modèle de strates générique (tout widget `pleinEcran` déclarable en fond, carte en premier cas d'usage), Studio + players.
- Partage pointeur déterministe (creux → carte, widget → widget) partout.
- Authoring à travers les couches sans ambiguïté de sélection.

**Non-Goals:**
- Nouveau type de zone ou de widget (réutilisation `pleinEcran` + zones existantes).
- Fond raster offline player (différé, schématique/pack existants conservés).
- Réparation de données hors nomenclature (manuelle, côté auteur).

## Decisions

### D1: Déclaration générique, carte première

**Choix:** N'importe quel widget `pleinEcran` MAY être assigné en strate fond (propriété dédiée, défaut : comportement breakout actuel par-dessus) ; la carte est le cas implémenté et testé en premier.

**Raison:** Évite un cas spécial « carte » dans le schéma et les renderers ; le breakout existant devient simplement la valeur par défaut de l'assignation.

### D2: Flottant transparent sauf widgets

**Choix:** Le conteneur de strate flottante est transparent aux pointeurs (`pointer-events: none` sauf sur les widgets, qui redeviennent opaques), sur les trois rendus.

**Raison:** Règle unique et testable (creux → carte, widget → widget), indépendante du moteur de rendu ; même pattern que le masquage de surimpression existant.

### D3: Sélecteur de calque auteur explicite

**Choix:** Contrôle fond / flottant / overlay avec œil par strate (pattern surimpression), persistance locale uniquement, jamais dans le JSON.

**Raison:** Sans lui, sélectionner un widget sous une carte plein écran interactive est impraticable au clic ; l'œil existant a déjà prouvé le pattern.

### D4: Ordre Studio → KMP → PWA, parité testée

**Choix:** Implémenter et stabiliser Studio (canvas + terminal) d'abord, puis le partagé KMP (natif), puis la PWA ; test de parité final (même écran sur les 3 rendus : ordre, visibilité fond dans les creux, drag résiduel).

**Raison:** Le Studio est le socle de référence visuelle ; chaque plateforme ne fait que replonger le même contrat déjà validé.

## Risks / Trade-offs

- **[Conflit gestes]** → Drag carte vs scroll du contenu flottant (terminal/PWA). Mitigation : le geste appartient au premier intercepteur (widget opaque > creux transparent) ; zones flottantes scrollables seulement sur leur contenu.
- **[Lisibilité sur fond carte]** → Texte illisible selon le fond. Mitigation : règle existante de contraste calculé étendue au flottant (fonds auteur verbatim conservés).
- **[Dérive PWA]** → Moteur DOM différent du natif. Mitigation : le test de parité compare l'ordre et la visibilité, pas le pixel.
