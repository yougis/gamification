---
name: geoplay-studio-authoring
description: Guida la creation d'un Jeu dans le Studio GeoPlay (MCP, graphe, validation humaine, i18n, modes, catalogues, C3). A utiliser pour tout change Studio 9xx et toute question d'authoring.
---

# Skill : geoplay-studio-authoring

Specialiste de l'authoring GeoPlay : le Studio (MCP hyperstructure + validation
humaine) produit exactement le JSON que le runtime consomme.

## Regles d'authoring (socle 000)

- **Meme schema des deux cotes** : toute production Studio se valide AJV contre
  le schema courant avant export ; un JSON non valide ne sort jamais du Studio.
  Couches C1 (forme) + C2 (applicative) + C3 droits (cadenas + avertissement en edition, blocage serveur a la publication).
- **Graphe, jamais liste** : le Studio compose des Noeuds + `activation`, avec
  `operator` obligatoire si >= 2 conditions. Cas "1er POI parmi N" = 1 noeud
  `RANDOM_POOL` (`drawCount`, `drawTiming`) + `POOL_DRAWN` sur les candidats.
- **Provenance obligatoire** : `providerId`, licence, `sourceUrl` par etape/asset.
- **Validation humaine** : statuts `draft|reviewed|published` + `reviewedBy` par
  etape/jeu ; `draft` injouable sauf mode animateur-triche ; relecture overlay
  (ex. source + polygones 7-erreurs) avant passage en `reviewed`. Compteur draft visible, export bloque hors animateur.
- **Profils et gating** : interface adaptee au role (level0 assistant / creator / advanced JSON brut + editeur de theme) ; droits verifies cote serveur, jamais seulement UI. Assistant famille en 7 etapes, slots verrouilles, aucun JSON visible.
- **Catalogues** : templates (slots locked|slotsOnly|free), themes, layouts, object-packs via `catalog_item` avec champ `access` calcule ; versions epinglees, MAJ explicite jamais silencieuse.
- **i18n fichiers separes** : game.json en cles {"$t"}, tableau cle x langue, filtre manquantes, import/export, bascule de langue de l'apercu ; glossaire verrouille non editable.
- **Tokens et themes** : aucune couleur en dur, apercu live theme, controle de contraste AA.
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
- **Preview** : simulateur Compose web en appel direct (jeu en memoire, jamais
  d'URL ni de snapshot serveur), etat simule injecte, zero ecriture (ni JSON source,
  ni session, ni event hors SIMULE journalise). Plus d'iframe PWA ni d'endpoint /emulate.

## Instructions

- Quand l'auteur decrit un lieu + theme, fais preciser : nombre d'etapes, langue,
  public, ton, contraintes terrain (bbox, zooms, taille pack) avant de generer.
- Genere le graphe complet et valide (operator, `isEnding`, chaque branche de pool
  vers une fin), puis liste ce qui exige relecture humaine par etape.
- Signale toute factualite non sourcee (dates, personnages) comme `draft` a
  verifier, jamais comme acquise.
