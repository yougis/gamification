## Why

L'écran HOME prévisualisé n'est pas celui créé et modifié dans le Composer : la vue Screen édite `game.global.screen` via `PhoneCanvas`, tandis que le mini-aperçu du volet (`AccueilApercu`) et l'aperçu d'essai (`ApercuAccueil`) rendent chacun leur propre markup texte codé en dur, ignorant l'écran composé. L'auteur ne prévisualise jamais ce qu'il compose, et l'écart grandira avec les widgets liés (carte). Un seul renderer doit faire foi.

## What Changes

- Les deux aperçus HOME (`AccueilApercu` t=0 dans le volet des étapes, `ApercuAccueil` branché sur l'essai dans Prévisualiser) rendent le **même `PhoneCanvas` en lecture seule** que la vue Screen du Composer (`showGhosts={false}`, sans sélection/édition, comme le terminal `PlayerTerminal`) : l'écran affiché est toujours celui composé, y compris vide (option B validée : PhoneCanvas systématique, sans repli tableau historique).
- Le contenu dérivé (temps, états, rebours, proposition d'ouverture) est lu par l'écran via les mécanismes existants et prévus : `calculerApercu` (inchangé, pur) alimente les widgets liés et blocs dérivés ; l'ouverture rejoue le contrôle d'essai existant (zéro écriture JSON).
- Suppression des markups parallèles texte des deux composants (remplacés par l'enveloppe PhoneCanvas + données d'essai).

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `studio-authoring`: les aperçus HOME (mini t=0 et simu d'essai) affichent l'écran global composé via PhoneCanvas lecture seule ; l'écran affiché est toujours celui de la vue Screen du Composer, même vide.

## Impact

- **Studio** : `AccueilApercu.tsx`, `ApercuAccueil.tsx` (deviennent enveloppes PhoneCanvas + `calculerApercu`), usages dans `NodeList.tsx` et `App.tsx` (Prévisualiser) ; `PhoneCanvas` réutilisé tel quel en lecture seule.
- **Specs** : `studio-authoring` (delta) ; `viewer-orchestrator` et `studio-screen-builder` inchangés (le contrat d'écran et de passivité existe déjà).
- **Réseau** : aucun ; **graphe** : aucun (pseudo-sélection et validation inchangées).
- **Compatibilité** : jeux avec `global.screen` vide affichent désormais un écran vide en aperçu (changement assumé, option B) au lieu du tableau texte historique.
