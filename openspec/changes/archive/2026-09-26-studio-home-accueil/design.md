## Context

Voir `proposal.md` (Why). État observé : `setPresentation` (mcp.ts:427) n'est appelé nulle part dans le Studio ; l'écran Configuration expose Mode/ExperienceStyle/Branding/ScreenGlobal mais rien sur les présentations. Côté player, `GeoPlayNav` compose en `if/else` (dashboard **ou** liste graphe) avec une `NavHost` à 2 routes (`GRAPH`, `NODE`) ; Android duplique la règle (`cardHome` visible si `HOME` présent) ; la PWA passe par `GeoPlayApp` partagé.

## Goals / Non-Goals

**Goals:**
- Cocher les présentations dans le Studio (op MCP existante, undo/redo, avertissements).
- Entrée Accueil permanente sans changer la règle d'affichage par défaut.
- Même entrée sur shared, Android et PWA (via le partagé).

**Non-Goals:**
- Pas de superposition de vues (choix acté : onglets exclusifs).
- Pas d'habillage du dashboard (branding/fond : fil B identifié en exploration, change séparé).
- Pas de nouvelle route de navigation profonde (l'Accueil vit dans la route `GRAPH` existante).

## Decisions

- **`PresentationPanel` dans l'écran Config**, après `ModePanel` : 7 cases (constante partagée avec le schéma), rappel du preset `navigationModel`, avertissement `presentationNeeds` non couverts (même calcul que l'inspecteur, App.tsx:2479), aperçu HOME statique piloté par les données (POI + délais TIMER + statut inventaire — pas d'embed PlayerTerminal : celui-ci montre un nœud, pas un tableau session). Alternative écartée : cases dans l'inspecteur par nœud — la présentation est globale au jeu, pas par étape.
- **Onglet Accueil dans la route `GRAPH`** (shared) : quand `HOME` présent, une barre d'onglets [Accueil | Vue] commute entre `HomeDashboard` et la vue existante (liste graphe / future carte), la règle `showHomeDashboard` gardant la valeur par défaut (tableau si pas de modale ACTIVE). Android suit via le partagé ; la PWA hérite gratuitement. Alternative écartée : 3e route `HOME` — multiplierait les routes pour un contenu déjà rendu.
- **Aucun event, aucune transition** sur les allers-retours (même contrat que l'ouverture depuis le tableau) : l'onglet est une navigation, pas une action de jeu.
- **Dépendance d'archive** : `player-home-dashboard` (contenu du tableau) avant celui-ci ; rebaser ce delta si son texte bouge.

## Risks / Trade-offs

- [Risk] Dérive Android (règle dupliquée `cardHome`) → Mitigation : l'onglet vit dans le shared, Android ne garde que son câblage existant ; tâche de parité dédiée.
- [Risk] `jeuVide` force `["MAP"]` : les jeux existants n'ont pas `HOME` → Mitigation : opt-in explicite par case, aucun changement silencieux.
- [Trade-off] Vues exclusives conservées : l'utilisateur a écarté le fond permanent superposé ; le tableau reste invisible pendant une modale ACTIVE (l'onglet y ramène après fermeture).
