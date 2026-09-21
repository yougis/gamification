## Context

État observé (voir `proposal.md` pour la motivation) : `ZoneRenderer` (`studio/src/components/wysiwyg/ZoneRenderer.tsx`) appelle `onSelectZone(zoneId)` sans `stopPropagation`, tandis que le cadre `PhoneCanvas` vide la sélection (`onSelectZone(null)`) au bouillonnement — React traite les deux `setState` dans le même tick, l'état final est « rien de sélectionné ». `WidgetRenderer` a déjà `stopPropagation`, d'où l'asymétrie constatée (widgets OK, zones KO). `PhoneCanvas` ne rend que les zones présentes (`{zones.header ? ...}`) et `TemplatePicker` n'existe qu'au niveau global (`ScreenGlobalPanel`).

## Goals / Non-Goals

**Goals:**
- Sélection de zone fiable au clic (néon + panneau zone + ajout de widget).
- Zones absentes découvrables et créables en un clic.
- Template applicable par nœud depuis le WYSIWYG.

**Non-Goals:**
- Refonte du modèle de sélection (les états `screenZone`/`screenWidget`/`screenBg` sont conservés).
- Persistance des fantômes (ils ne sont jamais sérialisés).
- Nouveau pipeline d'assets ou nouveau type de module.

## Decisions

### D1 — Stopper la propagation au niveau zone

**Décision** : `ZoneRenderer.onClick` appelle `e.stopPropagation()` avant `onSelectZone(zoneId)`, miroir exact du pattern déjà en place dans `WidgetRenderer`. Le fond du canvas garde son rôle « vide la sélection ».

**Alternative écartée** : comparer l'origine du clic dans `PhoneCanvas` (ex. `e.target === e.currentTarget`) — plus fragile avec les portails/overlays et incohérent avec le pattern widget existant.

### D2 — Fantômes rendus par PhoneCanvas, création via opération existante

**Décision** : `PhoneCanvas` rend un slot pointillé pour chaque zone de `header`/`footer`/`overlay` absente ; le clic appelle `onCreateZone(zoneId)` câblé sur `patchScreenZone` avec `{ widgets: [] }` (matérialise la zone, opération nommée annulable), puis sélectionne la zone. Aucune nouvelle opération MCP.

**Alternative écartée** : nouvelle opération `addScreenZone` — redondante avec `patchScreenZone`, qui crée déjà la zone à la demande.

### D3 — TemplatePicker par nœud dans le panneau WYSIWYG

**Décision** : quand aucun widget ni zone n'est sélectionné, le panneau affiche `TemplatePicker` (même composant que le global) + confirmation existante (`hasCustomizations`) ; appliquer remplace `node.screen` via `setNodeScreen` (opération nommée annulable).

**Alternative écartée** : appliquer le template global au nœud — confondrait défaut global et écran du nœud, contraire à la fusion global → nœud.

## Risks / Trade-offs

- [Clic clavier] → le chemin `onKeyDown` (Entrée/Espace) ne bouillonne pas de la même façon ; mitigation : couvert par le scénario de non-régression clavier dans les tâches.
- [Fantôme vs DnD] → un dépôt DnD sur un fantôme n'a pas de zone cible ; mitigation : les fantômes n'acceptent pas le drop (seul le clic les active), documenté dans les tâches.
- [Template destructeur] → mitigation : réutilise la confirmation `hasCustomizations` existante du `TemplatePicker`.

## Open Questions

Aucune — les inconnues restantes (libellés exacts des fantômes) n'impactent ni specs ni découpage.
