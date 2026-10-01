## Context

État vérifié : `PhoneCanvas.tsx:183` peint `couchePleinEcran` en `absolute inset-0` dans le cadre (après zones+fantômes, avant overlay — ordre correct) ; `WidgetRenderer` y rend un div de flux sans `h-full` ; `MapWidgetRenderer` et `CarteInteractiveSimu` peignent `h-40` fixe. Résultat : bandeau 160px + écran normal visible en dessous (d'où le perçu « limité par les fantômes »). En édition la couche est `pointer-events-none` (fantômes cliquables dessous) ; en lecture seule les widgets restent actifs. Voir proposal.md (Why) et le delta de spec pour le contrat.

## Goals / Non-Goals

**Goals:**
- Hauteur pleine effective en contexte breakout sur les deux renderers carte (auteur + simu).
- Grille tuiles adaptée au grand cadre (seuil `zoomApercu` réévalué).

**Non-Goals:**
- Changer l'empilement, les fantômes, l'overlay ou l'interactivité par mode.
- Toucher au schéma, au validateur, au runtime natif/PWA.
- Étendre `pleinEcran` à d'autres types de widgets.

## Decisions

### D1: Contexte breakout explicite, pas de détection DOM

**Choix:** Prop (ex. `pleinEcran`) traversant `PhoneCanvas → ZoneRenderer → WidgetRenderer` jusqu'aux renderers carte, plutôt que `h-full` aveugle ou sélecteur CSS.

**Raison:** Seul le contexte breakout exige la hauteur pleine ; en flux, `h-40` reste le comportement voulu (aperçus, miniatures). Explicite > implicite, même pattern que `carteSimu`/`lignesApercu`.

### D2: Tuiles étirées, marqueurs relatifs, seuil réévalué

**Choix:** `object-cover` existant conservé pour les tuiles (étirement gratuit), positions marqueurs déjà en % (aucun changement), seuil `zoomApercu` (12 tuiles) réévalué à la hausse pour le grand cadre.

**Raison:** Rien à réinventer côté projection ; seul le budget tuiles change avec la surface (à calibrer : trop bas = flou par étirement, trop haut = requêtes).

## Risks / Trade-offs

- **[Étirement vs netteté]** → Plein écran + zoom avant = tuiles agrandies floues. Mitigation : seuil relevé + `zoomApercu` choisissant le zoom le plus détaillé dans le budget.
- **[Régression flux]** → Un `h-full` qui fuit hors breakout casserait les aperçus. Mitigation : prop strictement cantonnée au chemin breakout, snapshots SSR avant/après sur le rendu en flux.
