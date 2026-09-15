## Why

Le Studio a grandi fonctionnalité par fonctionnalité (canvas, MCP, HOLD, import, branding typé, experienceStyle, gameMode/difficulty) sans contrat d'interface unifié : les garanties P0 (rien ne sort sans validation, une seule porte d'export, preview sans écriture) et l'organisation en écrans restent implicites. Sans ce contrat figé, chaque évolution d'UI risque de faire fuiter les garanties par une seconde voie. Le chantier `studio-layout-revamp` remodelant l'enveloppe en ce moment même, c'est le bon moment pour figer ce que chaque écran doit faire.

## What Changes

- **Nouveau** : un contrat d'interface Studio en une page — 6 écrans (Composer, Importer, Relire, Valider, Prévisualiser, Exporter) + calques transverses (i18n, difficultés/modes, HOLD) + traduction UI des garanties P0.
- **Nouveau** : règle d'unicité de l'export — une seule action d'export visible par défaut ; la porte historique `exportPack`, si conservée, est marquée dépréciée et masquée derrière un accès explicite.
- **Nouveau** : 3 décisions ouvertes enregistrées comme telles (portes d'export, emplacement config globale, détail overlay de relecture) au lieu de rester ambiguës.
- **Conservé** : aucun changement du schéma JSON, du validateur, du MCP, du runtime ni du packaging — l'interface reflète les contrats existants, elle ne les modifie pas.

## Capabilities

### New Capabilities
- Aucune (le contrat décrit le comportement de la capacité existante `studio-authoring`).

### Modified Capabilities
- `studio-authoring` : ajoute le contrat d'interface — écrans et leurs comportements, calques transverses, traduction UI des garanties P0, règle d'unicité de l'export, navigation erreur C2 → nœud fautif.

## Impact

- **Studio UI uniquement** (`studio/src/App.tsx`, `studio/src/components/`, formulaires et panneaux) : c'est une spec de comportement d'interface, l'implémentation suivra dans le apply.
- Aucun impact sur : schéma Draft-07, validateur applicatif, MCP, runtime natif, packaging offline, specs existantes (hors `studio-authoring`).
- Règles projet : ne modifie pas le schéma graphe (aucun consommateur impacté) ; ne touche pas à CONDITIONAL/WINDOW ; ne nécessite aucune connexion réseau (offline-first confirmé : Importer/Exporter 100 % locaux).
- Dépendance : `studio-layout-revamp` (non archivé, en cours) remodelle l'enveloppe présentationnelle — ce contrat définit le contenu fonctionnel que cette enveloppe devra accueillir ; les deux chantiers sont complémentaires, sans dépendance de code.
