## Context

État observé : `TYPES_MODULE = ["INFO", ...Object.keys(registre), "RANDOM_POOL"]` (`App.tsx`) dupliquait `INFO` depuis son enregistrement au registre ; `jeuVide()` (`App.tsx`) et l'import sans nœud (`mcp.ts`) créaient un `start` avec `data: {}`, invalide depuis le sous-schéma INFO strict. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Registre = source unique des types proposés ; `start` C1-valide côté module.
- Garde-fou testé contre toute récidive (nouveau type enregistré).

**Non-Goals:**
- Refonte du sélecteur de création ; tension `requires: []` vs C1 (hors périmètre, documentée dans la proposal).

## Decisions

### D1 — Filtre anti-doublon, ordre conservé

**Décision** : `["INFO", ...Object.keys(registre).filter((t) => t !== "INFO"), "RANDOM_POOL"]` — INFO reste premier (habitude), le registre fournit le reste, `RANDOM_POOL` ferme (structurel). Pas de tri : l'ordre du registre fait foi.

**Alternative écartée** : retirer le `"INFO"` de tête — changerait l'ordre d'affichage sans bénéfice.

### D2 — Step de bienvenue générique

**Décision** : `steps: [{ text: "Bienvenue. Modifiez ce texte pour raconter le début de votre jeu." }]` — générique (tout créateur, tout jeu), valide C1, invitant à l'édition comme le nœud `start` lui-même.

## Risks / Trade-offs

- [Autre liste codée en dur] → vérifié : seule `TYPES_MODULE` construit une liste de types ; les autres occurrences de `"INFO"` sont des usages ponctuels.
- [Test React keys] → le garde-fou porte sur l'unicité de la liste source (testable hors DOM), pas sur le rendu.
