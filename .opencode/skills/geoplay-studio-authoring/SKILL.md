---
name: geoplay-studio-authoring
description: Guida la creation d'un Jeu dans le Studio GeoPlay (MCP, graphe, validation humaine, i18n, modes). A utiliser pour le change 200 et toute question d'authoring.
---

# Skill : geoplay-studio-authoring

Specialiste de l'authoring GeoPlay : le Studio (MCP hyperstructure + validation
humaine) produit exactement le JSON que le runtime consomme.

## Regles d'authoring (socle 000)

- **Meme schema des deux cotes** : toute production Studio se valide AJV contre
  le schema courant avant export ; un JSON non valide ne sort jamais du Studio.
- **Graphe, jamais liste** : le Studio compose des Noeuds + `activation`, avec
  `operator` obligatoire si >= 2 conditions. Cas "1er POI parmi N" = 1 noeud
  `RANDOM_POOL` (`drawCount`, `drawTiming`) + `POOL_DRAWN` sur les candidats.
- **Provenance obligatoire** : `providerId`, licence, `sourceUrl` par etape/asset.
- **Validation humaine** : statuts `draft|reviewed|published` + `reviewedBy` par
  etape/jeu ; `draft` injouable sauf mode animateur-triche ; relecture overlay
  (ex. source + polygones 7-erreurs) avant passage en `reviewed`.
- **Difficultes et modes en overrides** (`enfant|famille|expert`,
  `normal|animateur|soiree|hardcore` : `hintDisabled`, `timeLimit`, rayon
  reduit...), jamais par duplication du graphe.
- **i18n par cles** + glossaire des acronymes verrouille (`translationStatus`
  `auto|reviewed|locked`) : une retraduction n'ecrase jamais une correction verrouillee.
- **Triche/preview** : `forceDraw` et bypass `GEOFENCE` disponibles dans le Studio
  pour tester chaque branche, avec flag triche propage au scoring.
- **Fixture** : graphe de reference neutre (POOL 1/5 → FIN) comme non-regression ;
  aucun lieu reel impose par le framework.

## Implementation du Studio (front)

- **Canvas graphe** : editeur visuel de graphe oriente (noeuds draggable,
  aretes = `activation`, icones par type de condition). Chaque modification
  visuelle SHALL garantir un export JSON conforme ; aucun etat visuel sans
  equivalent JSON.
- **Etat immutable + undo/redo** : l'etat reflete exactement le graphe et les
  formulaires ; toute edition est historisee et rejouable.
- **Formulaires dynamiques** : generes depuis le sous-schema registre de chaque
  Module ; la logique d'edition du graphe reste decouplee des formulaires de
  mini-jeux. Les libs de canvas restent des suggestions, jamais imposees.
- **Preview** : simulateur avec bypass capteurs + mode triche/test (meme
  mecanisme que le runtime, entree Studio) ; hote a trancher en 610, semantique
  inchangee.

## Instructions

- Quand l'auteur decrit un lieu + theme, fais preciser : nombre d'etapes, langue,
  public, ton, contraintes terrain (bbox, zooms, taille pack) avant de generer.
- Genere le graphe complet et valide (operator, `isEnding`, chaque branche de pool
  vers une fin), puis liste ce qui exige relecture humaine par etape.
- Signale toute factualite non sourcee (dates, personnages) comme `draft` a
  verifier, jamais comme acquise.
