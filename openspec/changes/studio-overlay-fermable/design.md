## Context

Voir `proposal.md` (Why). État actuel lu dans `studio/src/components/wysiwyg/` : `PhoneCanvas` rend l'overlay en calque absolu `inset-0` non masquable ; `ZoneRenderer` transforme tout clic en sélection (`stopPropagation`, jamais de masquage) ; aucune opération ni état de visibilité n'existe. Précédent : « Icône d'inventaire persistante » (`viewer-orchestrator`) — icône persistante + overlay qui restaure l'écran exact. Décisions d'exploration : opt-in par zone (`fermable`, défaut `false`), écran dessous jouable, réouverture par icône « message », état session en mémoire.

## Goals / Non-Goals

**Goals:**
- Clic-fond qui masque (overlay `fermable` uniquement), icône message persistante qui réaffiche, état conservé en session — dans le terminal simulé (seul renderer d'écrans existant).
- Miroir auteur : œil local + case `fermable`.
- Contrat écrit une fois, prêt pour natif + PWA (suivi).

**Non-Goals:**
- Pas de fermeture = complétion/abandon/pause (aucune transition d'état).
- Pas d'event dédié, pas de persistance SQLite de la visibilité.
- Pas de badge « non lu », pas d'icône configurable, pas d'aperçu animé du va-et-vient dans l'éditeur.
- Pas de renderer d'écrans natif/PWA dans ce change (suivi dédié) : le `shared` KMP, l'app Android et la PWA rendent les modules directement, sans couche zones/overlay.

## Decisions

- **`fermable?: boolean` sur `ZoneContent`, défaut `false`, ignoré hors overlay.** Draft-07 pur (`additionalProperties` déjà `false`). Alternative écartée : flag global par jeu — une consigne bloquante et un indice optionnel cohabitent souvent dans le même jeu.
- **État de visibilité local, jamais sérialisé.** Éditeur : `useState` par canvas ; player : état session en mémoire ; reprise = overlay affichée. Alternative écartée : persister la visibilité (SQLite/JSON) — figerait un état d'affichage sans valeur de reprise et compliquerait la relecture.
- **Icône « message » fixe du kit player, teintée branding**, ancrée au chrome (coin supérieur), visible si et seulement si une overlay fermable est masquée sur l'écran courant. Alternative écartée : bouton configurable par jeu — cas particulier inutile, le glyphe enveloppe/bulle est générique.
- **Fond semi-transparent cliquable uniquement si `fermable`** : sinon le clic garde la sémantique actuelle (sélection éditeur / rien joueur). Le contenu de la carte garde ses propres handlers (clic sur un widget ≠ clic fond).
- **Ordre d'implémentation** : schéma + œil/case Studio d'abord, puis terminal simulé avec le même contrat. Le renderer natif/PWA fera l'objet d'un change dédié (constat d'apply : aucune couche zones/overlay n'existe dans les players).

## Risks / Trade-offs

- [Risk] Clic perdu qui masque une consigne importante → Mitigation : opt-in explicite par zone ; l'auteur garde le défaut fermé pour le bloquant.
- [Risk] Divergence natif/PWA (geste, icône, conservation d'état) → Mitigation : contrat unique dans la spec `viewer-orchestrator`, tâche de parité dédiée.
- [Risk] Conflit avec « clic fond = vider la sélection » côté éditeur → Mitigation : l'œil est un contrôle explicite, pas le clic-fond ; le clic-fond garde sa sémantique.
- [Trade-off] Pas de trace animateur du masquage : assumé (masquer n'est pas jouer) ; réévaluable sans changer le contrat si le besoin naît.
