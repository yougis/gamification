## Context

Voir `proposal.md` (Why). État actuel lu dans `studio/src/components/wysiwyg/` : les aperçus `PuzzleEditorPreview` (tuiles mélangées statiques) et `DifferenceEditorPreview` (source + zones, statique) montrent déjà l'image sans mécanique ; à harmoniser sur les autres plugins (pas de boutons/états interactifs résiduels). `PhoneCanvas` expose un prop `scale` (transform) mais l'hôte ne le renseigne pas en paysage — le cadre 667×375 déborde du panneau central (`overflow-auto` → ascenseurs). Aucune opération de suppression de zone n'existe (`onRemoveWidget` seul ; `ZoneProperties` sans bouton de suppression de zone) — d'où le bug overlay. `NodeList` rend une ligne plate par étape ; la sélection zone/widget vit dans `App` (`screenZone`/`screenWidget`).

## Goals / Non-Goals

**Goals:**
- Aperçus 100 % statiques avec images sur tous les plugins.
- Paysage/tablette ajusté sans scroll via le `scale` existant.
- Suppression de zone (hors `content`) avec undo.
- Arbre zones/widgets par étape, sélection partagée avec le canvas.

**Non-Goals:**
- Pas de mécanique jouable dans l'éditeur, pas de changement `playerRenderer`.
- Pas de changement du schéma `ScreenDefinition` (zones déjà optionnelles).
- Pas de refonte de `NodeList` (recherche, filtre, sélection multiple inchangés).

## Decisions

- **Audit des 7 previews plutôt que réécriture** : puzzle/7-erreurs servent de référence ; quiz/RA/boussole/cadenas sont vérifiés et purgés de tout élément interactif (`<button>`, état local de jeu) au profit d'un rendu visuel pur. Alternative écartée : un wrapper « désactivateur d'événements » global — masquerait le problème et casserait le clic-sélection du widget.
- **Mise à l'échelle mesurée côté hôte** : l'hôte du `PhoneCanvas` mesure son conteneur (ResizeObserver) et calcule `scale = min(w/largeur, h/hauteur, 1)` en paysage, transmis au prop existant ; portrait inchangé. Alternative écartée : CSS `zoom`/redimensionnement du cadre logique — fausserait les dimensions d'aperçu contractuelles (375×667, etc.).
- **Nouvelle opération MCP `removeScreenZone(game, nodeId, zoneId)`** (refuse `content`), câblée comme `patchScreenZone` via `editGame` (undo natif) + bouton « Supprimer la zone » dans `ZoneProperties` avec confirmation si la zone contient des widgets. Alternative écartée : vider la zone au lieu de la supprimer — laisserait une zone vide fantôme au lieu du fantôme de création.
- **Arbre local à la ligne `NodeList`** : chevron déplieur par étape, enfants zones puis widgets (libellés depuis `NOM_ZONE` et type/texte tronqué), clic → `onChoisir` + sélection zone/widget existante ; état déplié local au composant (jamais persisté). Alternative écartée : arbre global séparé — dupliquerait la liste et casserait la synchronisation canvas/liste.

## Risks / Trade-offs

- [Risk] Un preview interactif résiduel (ex. bouton dans un aperçu) → Mitigation : règle « aucun `<button>` ni handler de jeu dans `editorPreview` », vérifiée par relecture des 7 plugins.
- [Risk] `scale` flou sur écrans basse densité → Mitigation : échelle limitée à ≤ 1 (réduction seule), jamais d'agrandissement.
- [Risk] Suppression accidentelle d'une zone remplie → Mitigation : confirmation listant le nombre de widgets, undo disponible.
- [Trade-off] Arbre déplié allonge la liste : assumé, replié par défaut et recherche/filtre inchangés.
