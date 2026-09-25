## Context

Voir `proposal.md` (Why). État actuel lu dans `studio/src/App.tsx` (~l.1765-1864) : un `main flex-[3]` contient `graphe (flex-1) + Splitter + liste (mep.liste)`, le `détail (mep.droite)` est hors `main` avec un second Splitter. Les 3 sections sont repliables via `mep.repliees.{graphe,liste,detail}` persisté dans `geoplay-layout-v1`. Le rail graphe porte vues + pastille ; `Repli.tsx` (`ChevronRepli`, `RailReplie`) et `Splitter.tsx` sont réutilisés. Décisions d'exploration : centre jamais repliable (grand écran uniquement), détail à droite repliable conservé, actions des rails conservées, nouvel ordre DOM accepté.

## Goals / Non-Goals

**Goals:**
- Ordre fixe `[menu | liste | centre flex-1 | détail]` en `lg+`, centre toujours visible.
- Conserver rails liste (gauche) et détail (droite) avec leurs actions existantes.
- Migrer vues + pastille de l'ex-rail graphe vers la toolbar centrale.

**Non-Goals:**
- Pas de changement vue étroite (`<lg`, onglets), pas de changement JSON/schéma, pas de nouveau composant de layout, pas de refonte du drill-down `WorkflowStepper`.

## Decisions

- **Sortir la liste du `main`, garder le centre en `flex-1 min-w-0`.** Structure : `liste (width mep.liste) | Splitter | centre (flex-1) | Splitter | détail (width mep.droite)`. Alternative écartée : garder le `main` et permuter graphe/liste à l'intérieur — conserve un `main` trompeur qui n'a plus de sens (le détail est déjà hors main).
- **Supprimer `repliees.graphe`** du type `SectionPliable`, de `LAYOUT_DEFAUT`, du chargement/sauvegarde `geoplay-layout-v1` et de `basculerSection`/`allerEtape`. Au chargement, toute valeur persistée `graphe: true` est ignorée (centre forcé visible). Alternative écartée : garder la clé inutilisée — laisserait un état fantôme.
- **Deux Splitters symétriques** : `liste|centre` ajuste `mep.liste` (bornes 220-520 existantes), `centre|detail` ajuste `mep.droite` (280-640). Vérifier les signes `onDelta` (gauche : `m.liste + dx` ; droite : `m.droite - dx` comme aujourd'hui) pour ne pas inverser le drag.
- **Toolbar centrale** : le sélecteur Graphe/Carte/Screen (3 boutons icônes existants du rail) rejoint la barre du panneau central, à côté des contrôles ReactFlow ; la pastille rail est supprimée (barre globale fait foi). Alternative écartée : garder la pastille dans le centre — doublon, deux sources de vérité visuelle.
- **Chevrons** : liste = `ChevronRepli direction="gauche"` sur bord du panneau ; détail inchangé (`"droite"`). Aucun chevron sur le centre. `RailReplie` réutilisé tel quel pour les deux rails latéraux.
- **Ordre DOM = ordre visuel** (liste, centre, détail) pour tab/focus naturels ; ids `section-liste`, `section-graphe`, `section-detail` conservés pour `scrollIntoView` du drill-down.

## Risks / Trade-offs

- [Risk] Auteurs habitués à maximiser le graphe en repliant tout → Mitigation : le centre en `flex-1` + les deux rails fins donnent déjà ~100 % de la largeur utile ; documenter dans la description du change.
- [Risk] Signe `onDelta` inversé sur le Splitter gauche → Mitigation : test manuel drag des deux côtés + test clavier (flèches) avant de cocher.
- [Risk] `geoplay-layout-v1` ancien avec `graphe: true` → Mitigation : ignore + nettoyage à la première sauvegarde ; aucun crash (parse défensif existant conservé).
- [Trade-off] Perte du « graphe plein écran » par repli total : assumé, le centre ne disparaît plus jamais, c'est le but.
