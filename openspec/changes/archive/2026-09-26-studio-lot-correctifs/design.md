## Context

État observé (lecture seule) : les tokens Tailwind (`text-snow`, `text-fog`, …) sont déjà thématisés via `.theme-light` — les textes d'écran fautifs sont donc ceux qui échappent aux tokens (couleurs codées en dur, héritage cassé, fonds du jeu). `BarreViewports` rend des libellés texte complets. `PuzzleEditorPreview` (tuiles mélangées) existe et le canvas lui délègue via `getPreview` : l'image configurée n'y est pas visible, ce qui pointe la résolution d'URL d'asset (`url("assets/…")` non résolu dans le contexte Studio). Dans l'inspecteur, « Ajouter un objet référencé » écrit `inventoryRef: []` (aucune ligne n'apparaît jamais) et « Ajouter un effet » disparaît après le premier effet. `catalog/server.js` n'émet aucun en-tête CORS et ne répond pas à `OPTIONS` : tout `fetch` navigateur cross-origin échoue en `NetworkError`. L'entrée « ▶ Mode Jeux » sans nœud actif tombe sur la salle d'attente alors que la file de simulation connaît déjà le premier éligible (l'avance auto à la complétion existe). Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Huit correctifs indépendants, chacun vérifiable isolément, schéma graphe inchangé.
- Aucune régression : validations C1/C2, export fichier, catalogue existant, thèmes existants.

**Non-Goals:**
- Refonte du système de thèmes ou des tokens (on s'y branche, on ne les rouvre pas).
- Nouveau protocole catalogue (mêmes routes, même pack).
- Modification du moteur de file/évaluation (l'entrée MODE JEUX réutilise la file existante).

## Decisions

### D1 — Textes d'écran : contraste calculé, pas thème aveugle

**Décision** : les templates livrent des fonds sombres (`#14141f`, `#1a1a2e`) avec des textes sans couleur explicite : suivre aveuglément le thème casse la lisibilité (texte sombre du thème clair sur fond sombre du jeu). Règle : couleur auteur verbatim si posée, sinon contraste calculé sur le fond résolu (luminance), sinon héritage du thème. Implémentation en UN point : couleur par défaut posée sur le cadre du canvas (héritée par tous les descendants sans couleur explicite), helper pur testable. Les couleurs auteur et le garde-fou restent comme prévu.

**Alternative écartée** : forcer une couleur par thème dans chaque renderer — illisible dès qu'un fond auteur sombre rencontre le thème clair.

### D2 — Viewports : icônes avec libellé conservé

**Décision** : 4 boutons icônes (écran vertical/horizontal × petit/grand) via le système d'icônes existant, `title` + `aria-label` = libellé + dimensions, état actif et pastille inchangés.

**Alternative écartée** : menu déroulant — un clic de plus pour l'action la plus fréquente de la barre.

### D3 — Puzzle canvas : même résolution d'asset que le panneau

**Décision** : diagnostiquer d'abord (l'aperçu panneau fonctionne avec les mêmes données), puis aligner le canvas sur le mécanisme du panneau (résolution du chemin d'asset vers URL affichable). Aucun nouveau composant d'aperçu : `PuzzleEditorPreview` est déjà le bon.

**Alternative écartée** : dupliquer un aperçu canvas spécifique — deux rendus à maintenir pour un bug de résolution d'URL.

### D4 — Inspecteur : boutons d'ajout qui ajoutent vraiment

**Décision** : « Ajouter un objet référencé » append une entrée vide (`[""]`) ; le bouton « Ajouter un effet » devient permanent (visible à N effets, append à la fin). Même opération `upd`, mêmes validations — seuls les déclencheurs changent.

**Alternative écartée** : réécrire les familles en formulaires dynamiques — hors proportion pour deux boutons.

### D5 — Catalogue : CORS côté service, normalisation côté Studio

**Décision** : en-têtes `Access-Control-Allow-Origin: *` (+ méthodes/en-têtes) et `204` sur `OPTIONS` dans `server.js` (service public sans secret : `*` assumé comme le code non secret) ; `sansSlash` étendu (rogne espaces/slashes, retire un suffixe `/publish` final) ; message d'échec actionnable incluant cause et remède.

**Alternative écartée** : proxy same-origin dans le Studio — le Studio est statique, il n'y a rien où brancher un proxy.

### D6 — MODE JEUX : ouvrir la tête de file à l'entrée

**Décision** : si aucun nœud actif à l'ouverture du terminal, `ouvrir(file[0])` (premier éligible de la file existante) ; file vide = salle d'attente inchangée. L'enchaînement reste l'avance auto existante.

**Alternative écartée** : recalculer l'éligibilité à l'entrée — la file de simulation fait déjà foi, la dupliquer créerait des divergences.

## Risks / Trade-offs

- [Couleurs auteur vs lisibilité] → les couleurs explicites restent prioritaires (contrat) ; le garde-fou ne porte que sur les couleurs codées en dur du Studio.
- [CORS `*`] → assumé : le catalogue est public par design (codes non secrets) ; documenté, pas silencieux.
- [Normalisation d'URL agressive] → ne retire que le suffixe exact `/publish` final ; toute autre URL est inchangée.
- [Tête de file surprise] → l'ouverture reste journalisée (`ouverture <id>`) comme toute ouverture manuelle ; l'auteur peut refermer/ouvrir un autre nœud.
