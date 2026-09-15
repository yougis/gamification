## Context

Voir `proposal.md` pour la motivation. Le Studio réel pilote déjà sept écrans sur un état partagé (`composer`, `importer`, `relire`, `valider`, `previsualiser`, `exporter`, `config`), avec undo/redo, validation bi-couche, registre de modules, HOLD, i18n verrouillée et packaging offline. Le template apporte une coquille et une densité visuelle intéressantes, mais ses données sont figées et plusieurs choix y sont absents : persistance des positions, navigation unique, polices hors-ligne, gates draft/HOLD et manifest.

## Goals / Non-Goals

**Goals:**
- Appliquer le langage visuel du template sans changer le modèle de données ni les règles.
- Garder une seule navigation source de vérité, déclinée desktop et mobile.
- Conserver l’accessibilité extérieure et tactile du Studio actuel.

**Non-Goals:**
- Remplacer ReactFlow par un SVG statique.
- Introduire des polices réseau, un nouveau framework UI ou un nouveau format de pack.
- Modifier le schéma, la validation, le MCP, le runtime ou les specs comportementales.

## Decisions

- **Conserver le squelette fonctionnel actuel** plutôt que la coquille figée du template, parce que l’état partagé, l’undo/redo, les écrans réels et les gates existantes sont déjà la valeur du Studio. Alternative rejetée : reconstruire autour de la maquette, ce qui aurait exigé de réimplémenter toute la logique métier.
- **Mapper les écrans template vers les écrans réels** : Composer, Importer, Relire, Valider, Prévisualiser, Exporter, plus Configuration conservée comme écran réel absent du template. Alternative rejetée : six sections fixes, qui aurait supprimé la configuration globale.
- **Thématiser par tokens plutôt que copier les couleurs** : introduire des tokens sombres/condensés/mono en variante, tout en gardant le thème clair extérieur par défaut. Alternative rejetée : bascule globale vers le sombre, incompatible avec la lisibilité en plein soleil.
- **Refuser les polices distantes** : reprendre la hiérarchie display/mono/texte avec des piles système ou des polices auto-hébergées versionnées dans le manifest. Alternative rejetée : `@import` Google Fonts, contraire à l’offline-first.
- **Restyler les nœuds sans changer leur sémantique** : rail par type, pastille de statut, pointillés `draft`, anneau de sélection, en conservant icône + libellé + texte pour ne jamais coder l’information par la seule couleur.
- **Aligner les écrans sur les motifs du template** : dropzone + historique d’import comme journal, tableau de relecture branché sur provenance/statuts, trace de prévisualisation avec badges, pré-vol d’export avec manifest. Les données restent dynamiques et validées.

## Risks / Trade-offs

- [Risque] Le thème sombre réduit le contraste en extérieur → Mitigation : le garder comme variante explicite et conserver le thème clair par défaut.
- [Risque] La densité du template dégrade le tactile → Mitigation : réserver les micro-typographies aux métadonnées et garder les contrôles à la taille d’usage actuelle.
- [Risque] Divergence entre navigation desktop, onglets mobiles et stepper → Mitigation : une seule table écrans → vues, avec `config` explicitement mappée.
- [Trade-off] Le style template demande plus de composants partagés à court terme, mais réduit ensuite la divergence visuelle entre écrans.

## Migration Plan

- Appliquer par couches : tokens, coquille/navigation, cartes/tableaux, graphe, puis écrans ; vérifier après chaque couche que les jeux existants restent valides et exportables.
- Rollback par revert UI uniquement, sans migration de données ni changement de format.

## Open Questions

- Faut-il une variante sombre persistée par auteur ou seulement un thème de prévisualisation jeu ? Cette question peut être tranchée après les tâches sans changer l’approche.
