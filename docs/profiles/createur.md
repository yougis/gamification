# Profil Createur

Ce document decrit comment un createur compose un jeu dans le
Studio GeoPlay en utilisant le MCP et les outils d'authoring.

## Composer un jeu

1. **Canvas graphe** : le createur glisse-depose des Noeuds sur un
   canvas visuel. Chaque Noeud = une instance d'un Module du registre.
   Les aretes representent les conditions d'activation (`activation`).
2. **Conditions d'activation** : chaque Noeud porte un objet unique
   `activation {requires[], operator}`. L'operateur `AND`/`OR` est
   obligatoire quand il y a >= 2 conditions, interdit sinon.
3. **Module selection** : le createur choisit le type de module dans
   le registre (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE,
   et types extends comme CODE_INPUT, CLUE_RESOLVER).
4. **Configuration** : les donnees du module sont montees par `$ref`
   + discriminateur sur `module.type`. Chaque sous-schema porte
   sa `schemaVersion`.

## Utilisation du MCP

Le Studio MCP expose les operations suivantes :
- `composeNodes` : composer des Noeuds sur le graphe
- `setActivation` : definir les conditions d'activation
- `registerAsset` : enregistrer un asset avec provenance
- `validateGame` : valider le jeu en double couche
- `buildManifest` : construire le manifest du pack
- `exportPack` : exporter le pack pour le Player

Toutes les operations sont validees AJV contre le meme schema que le
runtime. Aucune production non validee ne sort du Studio.

## Validation et statut

- **draft** : le jeu est en cours de creation, injouable normalement
- **reviewed** : validation humaine effectuee (overlay source + donnees
  module), jeu pret
- **published** : jeu publie et jouable

## Principes structurants appliques

- Meme schema des deux cotes (auteur et runtime), valide AJV des deux cotes
- Provenance obligatoire : `providerId`, licence, `sourceUrl` par etape/asset
- Difficultes (enfant|famille|expert) et modes (normal|animateur|soiree|hardcore)
  en overrides, jamais duplication du graphe
- i18n par cles avec glossaire des acronymes verrouille (`auto|reviewed|locked`)
- Le mode HOLD est un mode systeme ajoute a la liste des modes systeme,
  configure via `global` et non comme override de difficulte

## Triche et preview

Le Studio offre un simulateur pas-a-pas avec bypass capteurs,
`forceDraw` par branche, et injection `sessionId`. Chaque event
simule porte le flag triche. Le preview HOLD offre en plus
`forceHoldLock` / `forceHoldExit`.
