## Context

État vérifié : `MapView.tsx:164` écrit `{type, lat, lng, radiusMeters: 30}` sans `predicate` (requis par `definitions.condition.oneOf`, branche GEOFENCE) quand aucun GEOFENCE n'existe ; `App.tsx:152` (`conditionVide`) et `:775` (preset « lieu ») écrivent avec `predicate: "enter"`. Le drag (`:230`) fait `{...c, lat, lng}` et préserve donc un `predicate` existant. `donneesDefautModule("QUIZ")` (`module-screen-plugin.ts:106`) retourne `{questions: []}` alors que `quiz.json` exige `minItems: 1`. Voir proposal.md (Why) et le delta de spec pour le contrat.

## Goals / Non-Goals

**Goals:**
- A : clic carte valide dès l'écriture (plus aucune erreur C1 issue du positionnement).
- B : une condition sans variante = un constat (bruit ÷ ~50, information conservée + champ probable).
- C : un quiz naît valide (question d'exemple, schéma inchangé).

**Non-Goals:**
- Assouplir le schéma (`predicate` requis et `minItems: 1` restent).
- Deviner la variante ou auto-corriger le `predicate` (pas de patch silencieux : la condition écrite est complète et explicite).
- Refonte du rendu d'erreurs au-delà du cas oneOf.

## Decisions

### D1: `predicate: "enter"` écrit, jamais deviné après coup

**Choix:** La branche création écrit le `predicate` comme les autres chemins, au lieu d'un correctif « sans demander » a posteriori.

**Raison:** L'objet est complet à la naissance (même contrat que `conditionVide`) ; aucun historique undo « migration » parasite, aucune divergence entre chemins de création.

### D2: Repli au niveau du collecteur C1, derrière un code dédié

**Choix:** Détecter le motif « N erreurs AJV sur le même `requires[i]` + échec `oneOf` » et émettre un constat unique avec champ probable (table `type` → champ manquant usuel : GEOFENCE→`predicate`, NODE_COMPLETED→`nodeId`, etc.), les brutes étant conservées en pièces jointes du diagnostic (debug, pas d'affichage).

**Raison:** Le rendu Valider consomme déjà les constats structurés + glossaire ; on ne change ni le pipeline ni l'UI, seulement le volume. Les brutes ne sont pas retenues côté affichage (reproductibles à tout moment via l'export brut du JSON) ; le message porte le champ probable + l'action « Voir ».

### D3: Question d'exemple, pas de placeholder magique

**Choix:** `donneesDefautModule("QUIZ")` retourne 1 question d'exemple complète et valide (énoncé + 2 options + bonne réponse + explication), éditable et supprimable comme toute donnée (supprimer la dernière re-bloque normalement en C1).

**Raison:** Respecte `minItems: 1` sans toucher au schéma ; l'auteur voit le format attendu au lieu d'un formulaire vide en erreur. Pas de valeur cachée : c'est une vraie question, assumée.

## Risks / Trade-offs

- **[Champ probable faux]** → La table type→champ peut nommer le mauvais champ (ex. `type` inconnu). Mitigation : formulation « manque probablement », jamais d'affirmation ; repli générique « aucune variante » si `type` absent/inconnu.
- **[Exemple pris pour du contenu]** → L'auteur pourrait exporter la question d'exemple sans la voir. Mitigation : énoncé explicitement générique (« Exemple — remplacez-moi »), statut draft du nœud bloquant l'export hors animateur (règle existante).
- **[Drag sur condition invalide]** → Le drag préserve un objet invalide pré-existant (pas de régression, pas de réparation). Accepté : la réparation passe par le constat replié, pas par la carte.
