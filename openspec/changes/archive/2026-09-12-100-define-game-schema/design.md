## Context

Voir `proposal.md` (Why). Le socle 000 est archivé et synchronisé dans
`openspec/specs/` ; le change `add-proximity-mode` (actif) fournit le contrat
`PROXIMITY_MASTER` repris ici. Contrainte : Draft-07 pur (pas de `$data`, pas
de comparaisons inter-champs), un seul fichier racine + `$ref`.

## Goals / Non-Goals

**Goals:**

- Un schéma exécutable par AJV des deux côtés (Studio + runtime) avec messages
  d'erreur exploitables par un auteur.
- Frontière nette : tout ce que Draft-07 ne sait pas faire bascule en applicatif
  sans zone grise.
- Exemple 5 POI comme non-régression permanente.

**Non-Goals:**

- Le contenu des 5 sous-schémas modules (change 500, squelettes `$ref` ici).
- Le validateur applicatif lui-même (règles figées en 000, implémentation hors 100).
- Valeurs numériques par défaut (rayons, `dwellMs`, seuils RSSI : données d'exemple,
  pas de constantes normatives).

## Decisions

- **Draft-07 strict, pas 2019-09+.** Pourquoi : AJV partout y compris mobile,
  outillage Studio mature, `if/then` suffisant pour `operator`/`maxReentries`.
  Alternative rejetée : dialectes récents (`dependentRequired`, `$dynamicRef`) —
  support inégal côté natif.
- **`additionalProperties:false` partout.** Pourquoi : un champ inconnu est une
  faute de frappe d'auteur dans 99 % des cas ; le silence coûterait des heures de
  terrain. La compat avant (types inconnus) reste portée par l'applicatif, pas
  par la tolérance du schéma.
- **Variantes de conditions en `oneOf` étanche.** Pourquoi : chaque type impose
  ses champs et interdit les autres (ex. `radiusMeters` dans un `TIMER` rejeté
  en couche 1 au lieu de pourrir l'orchestrateur). Alternative rejetée : objet
  plat à champs optionnels — laisse passer les contaminations.
- **Montage registre en `$ref` + discriminant, racine agnostique.** Pourquoi :
  ajouter un module = une entrée + un fichier, zéro retouche racine (principe
  plateforme). Les `schemaVersion` par type permettent le refus explicite
  (`minEngineVersion`).
- **`PROXIMITY_MASTER` dans l'enum socle dès le 100.** Pourquoi : le change
  `add-proximity-mode` (actif, planning complet) en a figé le contrat ; attendre
  son archive pour l'intégrer figerait un schéma volontairement incomplet.
  Traçabilité : mention explicite de la dépendance en proposal.
- **Exemple embarqué comme test.** Pourquoi : `game-5poi.json` versionné avec le
  schéma fait du 100 un change auto-vérifiant ; toute révision future rejoue la
  non-régression au lieu de la documenter.

## Risks / Trade-offs

- [Messages AJV bruts illisibles par un auteur] → Mitigation : cartographie
  erreurs→phrases Studio au change 200, pas ici.
- [`oneOf` étanche = messages d'erreur verbeux] → Mitigation : accepté, la
  précision prime ; le Studio les reformulera.
- [Divergence 100 vs `add-proximity-mode` si ce dernier évolue avant archive]
  → Mitigation : dépendance déclarée, enum reprise à l'identique du contrat figé.
- [Exemple 5 POI qui vieillit] → Mitigation : tâche de non-régression explicite
  à chaque révision du schéma.
