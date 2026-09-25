## Why

Une zone de surimpression recouvre tout l'écran sans issue : côté auteur elle masque le fond en édition, côté joueur c'est une modale non fermable qui bloque l'accès à l'écran dessous. Il faut un masquage explicite des deux côtés, sans changer la sémantique du jeu.

## What Changes

- **Schéma** : `ZoneContent` gagne `fermable?: boolean` (défaut `false` = comportement actuel, compat ascendante totale) ; une overlay `fermable` peut être masquée par le joueur.
- **Joueur : terminal simulé (PlayerTerminal, seul renderer d'écrans existant).** Constat d'apply : aucun player (natif, PWA, shared Compose) ne rend aujourd'hui les `ScreenDefinition` — ils rendent les modules directement. Le contrat fermable est donc implémenté dans le terminal simulé du Studio : clic sur le fond semi-transparent → overlay masquée, écran dessous **jouable** (renderer déjà interactif, aucune transition), icône « message » persistante (glyphe fixe teinté branding) → réaffiche l'overlay avec son état conservé (mémoire session, non persistée : à la reprise l'overlay revient affichée) ; aller-retour libre, sans transition d'état, sans event dédié, sans complétion implicite.
- **Suivi explicite (hors change)** : le renderer d'écrans zones+overlay dans les players natif/PWA (shared Compose, app Android, PWA) n'existe pas encore ; un change dédié le construira et y appliquera ce même contrat (le `fermable` du schéma est déjà prêt).
- **Auteur** : toggle « œil » (état local d'édition, jamais persisté) pour masquer/voir la surimpression dans le canvas + case « fermable par le joueur » dans les propriétés de la zone overlay.
- Aucun changement de graphe, d'activation, de progression ou de validation : masquer n'est ni jouer, ni terminer, ni abandonner.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-screen-builder`: champ `fermable` sur `ZoneContent` (Draft-07) + toggle œil éditeur + case à cocher.
- `viewer-orchestrator`: surimpression fermable côté player (masquage au clic-fond, icône message persistante, écran dessous jouable, état session conservé).

## Impact

- Code : `PhoneCanvas`/`ZoneProperties`/`PlayerTerminal` (Studio), icône « message » au kit, `game-schema` (champ optionnel). Suivi : renderer d'écrans natif/PWA (change dédié).
- Schéma graphe : racine Noeuds/Liens inchangée ; `ZoneContent` gagne un champ optionnel — consommateurs : validateur AJV des deux côtés (accepte l'inconnu → pas de rupture), players (nouveau comportement opt-in).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local, offline-first préservé.
- Aucune dépendance à un change précédent non archivé.
