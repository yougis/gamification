## Context

Voir `proposal.md` (Why). Inventaire relevé en exploration : ~78 `<button` dans `studio/src/App.tsx` + ~25 dans `src/components/` (formulaires quiz/puzzle/minigame-params, `*WidgetProperties`, `TemplatePicker`, `ImagePicker`, panneaux config). L'épine existe déjà : `ETAPES` 1→5 dans `WorkflowStepper.tsx` (Graphe, Épreuves, Relecture, Validation, Export, avec badges et porte d'export). Le réceptacle existe déjà : composant `Accordeon` (+ `useAccordeon`, mémoire `geoplay-accordeons-v1`) issu des changes `studio-composer-ux`/`studio-action-rails`. Collisions de vocabulaire : « Garanties P0 » (traçabilité MCP, spec existante) ≠ tiers P0/P1/P2 (visibilité) — les specs portent la désambiguïsation.

## Goals / Non-Goals

**Goals:**
- Chaque contrôle a un tier défendable (P0/P1/P2) revu écran par écran, sans changer son effet.
- Les P2 disparaissent du premier plan (Avancé fermé) sans perdre en accessibilité (badge + une ouverture).
- Vérifiable : matrice contrôle→tier par écran + tsc + smokes.

**Non-Goals:**
- Aucun changement métier (mêmes opérations MCP, mêmes validations, mêmes JSON).
- Pas de nouveau pattern visuel, pas de nouveau persistant, pas de refonte des écrans ni de la nav gauche.
- Pas de tri des messages d'erreur eux-mêmes (couverts par Valider), seulement de leur placement déjà acté.

## Decisions

### 1. Méthode d'attribution : question unique par contrôle

« Qu'est-ce qui casse si l'auteur ne le trouve pas pendant l'étape courante ? » — rien de bloquant pour l'étape et effet dangereux/expert → P2 ; utile seulement avec une sélection → P1 ; sinon P0. En cas de doute persistant à l'implémentation : P1 (visible mais contextuel) plutôt que P2 (caché), pour ne jamais priver un flux existant.

### 2. Mouvements initiaux par zone (inventaire d'exploration)

- **Composer détail** : rotation masterId, secours par code → Avancé famille Position ; JSON experts → déjà en accordéons (conserver) ; presets rayon → visibles (P1, usage courant) ; liens HOLD/config → visibles (navigation, pas config).
- **WYSIWYG/modules** : Essais/Temps, styles, JSON → déjà repliés (conserver) ; viewports d'aperçu, ImagePicker avancé (manifest), TemplatePicker « enregistrer » → Avancé.
- **Prévisualiser** : fixture 1-clic, pas-à-pas, Nouvelle partie → P0 ; bypass/forceDraw/sessionId/forceHold (triche) → Avancé « Triche » fermé.
- **Relire** : passer reviewed/published, voir-source → P0 ; annulation de relecture, compteurs → P1/P2 selon usage.
- **Importer/Exporter** : Charger, porte unique → P0 ; effacer brouillon → P2 + confirmation (destructif).
- **Config** : branding, preset experienceStyle, gameMode/difficulty, HOLD → P0/P1 visibles ; bbox/zooms bruts, tileStrategy, glossaire, minigame defaults fins → section Avancé de l'écran.
- **Barre globale** : undo/redo, export, nom, statuts, pastille → intouchables (P0 structurels).

### 3. Réceptacle unique : accordéon fermé badgé

Tout P2 rejoint un `Accordeon` fermé par défaut en bas de son module/famille (badge : compte ou état), mémoire locale réutilisée sans nouvelle clé. Pas d'onglets « Avancé » séparés (un niveau de navigation en moins que des tabs) et pas de déplacement inter-écrans (le contrôle reste là où l'auteur le cherche).

## Risks / Trade-offs

- [Avancé = oublié (découvrabilité)] → Mitigation : badges résumé sur chaque accordéon fermé + titres explicites ; rien n'est supprimé, tout est à une ouverture.
- [Sur-tri : un P0 d'un flux rare passe P2] → Mitigation : règle du doute → P1 ; revue par écran avec la matrice avant/après dans les tâches.
- [Badges trompeurs (état calculé cher)] → Mitigation : badges dérivés de données déjà en mémoire (comptes, origines), jamais de calcul validation.
- [Mobile (onglets, pas de rails)] → Hors périmètre : les accordéons s'y appliquent tels quels (flux vertical), sans rail ni toolbar.

## Migration Plan

Ordre écran par écran (chaque étape livrable, pure présentation) :
1. Composer détail (familles : les plus denses, gain maximal).
2. WYSIWYG + formulaires modules.
3. Config (section Avancé transverse).
4. Prévisualiser / Relire / Importer-Exporter / barre globale (touches finales).
5. Matrice finale contrôle→tier revue + tsc + smokes.
Rollback : revert Git par étape ; aucun persistant ajouté, aucun JSON touché.
