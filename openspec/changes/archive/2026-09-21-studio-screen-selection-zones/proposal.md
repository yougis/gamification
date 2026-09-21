## Why

Le canvas WYSIWYG de l'écran est aujourd'hui inutilisable pour composer : un clic sur une zone s'auto-annule (bouillonnement vers le fond du canvas), donc aucune zone ne se sélectionne, aucun contour néon n'apparaît, et le seul point d'entrée d'ajout de widget (`AddWidgetMenu` dans le panneau de zone) reste inaccessible. De plus, les zones absentes (header/footer/overlay) ne sont ni dessinées ni créables, et aucun sélecteur de template n'existe au niveau du nœud.

## What Changes

- **Fix sélection de zone (A)** : le clic sur une zone sélectionne la zone sans bouillonner vers le fond du canvas ; le contour néon, le panneau de zone et le bouton « Ajouter un widget » sont restaurés.
- **Zones fantômes (B)** : les zones header/footer/overlay absentes sont dessinées en pointillés (« + En-tête », etc.) ; un clic sur un fantôme crée la zone vide et la sélectionne.
- **Sélecteur de template par nœud (C)** : le panneau WYSIWYG expose le `TemplatePicker` quand aucun widget/zone n'est sélectionné ; appliquer un template remplace zones + layout de l'écran du nœud (avec confirmation si personnalisé).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-screen-builder` : comportement de sélection des zones du canvas (clic sans auto-annulation), slots fantômes pour zones absentes, sélecteur de template au niveau nœud.

## Impact

- **Code** : `studio/src/components/wysiwyg/ZoneRenderer.tsx` (stopPropagation), `PhoneCanvas.tsx` (rendu fantômes), `PropertiesPanel.tsx` + `App.tsx` (TemplatePicker par nœud, création de zone).
- **Schéma graphe** : aucune modification — les zones créées et les templates appliqués utilisent les champs `screen` existants ; aucun consommateur impacté (Studio MCP, runtime natif, orchestrateur, modules, packaging offline).
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre.
- **Réseau** : aucun — édition 100 % locale, offline-first inchangé.
- **Dépendance** : s'appuie sur le code du change `studio-screen-editor` (canvas, DnD, styles 3 niveaux) sans le rouvrir.
