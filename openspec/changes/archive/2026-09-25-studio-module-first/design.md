## Context

Voir `proposal.md` pour la motivation. État observé dans le Studio :
- `ajouterEtape` crée un Nœud sans champ `screen` ; `resolveScreen` retombe alors sur un écran par défaut à content vide, donc aucun widget `{ type: "module" }` n'est rendu.
- Le dropdown « Mini-jeu » de la famille épreuve ne met à jour que `module.type` en conservant l'ancien `module.data` et sans toucher à `node.screen`.
- Le menu d'ajout de widget exclut volontairement le widget module (auto-ajout par le Nœud) — or cet auto-ajout n'existe nulle part : aucun appel au `defaultScreen` du screenPlugin à l'écriture.
- Chaque plugin du registre expose déjà un `defaultScreen` avec `{ type: "module" }` en content ; le canvas sait déjà rendre le placeholder pour les types sans plugin.

## Goals / Non-Goals

**Goals:**
- Tout Nœud créé porte un `screen` cohérent avec son Module dès la création.
- Le changement de type est explicite, confirmé, et remet data + content d'équerre.
- Les types sans screenPlugin restent fonctionnels via le widget générique.

**Non-Goals:**
- Aucune migration des jeux existants (décision assumée : dev en cours, refaits si besoin).
- Aucun changement du schéma graphe, du validateur, du runtime ou du packaging.
- Aucune modification du rendu (canvas, aperçu, renderer joueur) — réutilisation à l'identique.

## Decisions

- **Création module-first** : le type de Module est choisi en premier à la création ; le `screen` initial est cloné depuis le `defaultScreen` du screenPlugin du type (ou content-only + `{ type: "module" }` générique si pas de plugin), et les `module.data` par défaut du type sont posées. Alternative écartée : injection virtuelle à la résolution — violerait la garantie « aucun champ UI sans équivalent JSON ».
- **Changement de type destructif borné** : confirmation réutilisant le pattern du TemplatePicker (« modifications perdues ») ; sur confirmation, `module.data` remplacées par les défauts du nouveau type et seule la zone `content` remplacée par celle du nouveau `defaultScreen` (header/footer/overlay préservés). Alternative écartée : remplacement de l'écran entier — détruirait le travail d'ambiance de l'auteur sans nécessité, le content étant la zone du Module.
- **Données détruites, pas migrées** : aucune tentative de conversion QUIZ → CODE_INPUT ou autre ; les sous-schémas sont disjoints et une migration silencieuse produirait des JSON invalides en couche 1.
- **Tout passe par les opérations nommées existantes** (historique undo/redo lisible) : la création et le changement de type restent des éditions traçables, jamais des mutations directes d'état.

## Risks / Trade-offs

- [Changement de type coûteux] Un auteur qui hésite entre deux types perd son content → la confirmation explicite et la portée content-seule limitent la casse ; le header/footer (textes d'ambiance) survivent.
- [Widgets non-module dans content perdus] Un texte d'ambiance placé en content part avec le remplacement → assumé par le principe « le content appartient au Module », documenté dans la spec.
- [Types sans plugin] Le widget générique n'a pas de formulaire dédié (JSON expert uniquement) → inchangé par rapport à l'existant, pas de régression.
- [Undo] Le reset data + content doit être annulable en un pas → passer par une seule opération nommée pour garder l'historique lisible.

## Migration Plan

Aucune migration : les Nœuds existants sans widget module restent tels quels jusqu'à un éventuel changement de type (qui les remet d'équerre) ou une recréation. Rollback = annulation du change, les specs redeviennent l'état précédent à l'archive suivante.
