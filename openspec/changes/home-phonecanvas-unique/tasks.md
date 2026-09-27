## 1. Mini-aperçu du volet (t=0)

- [ ] 1.1 `AccueilApercu` rend le PhoneCanvas de `game.global.screen` en lecture seule (`showGhosts={false}`, sans sélection/édition), alimenté en t=0 via `calculerApercu` (inchangé)
- [ ] 1.2 Supprimer le markup tableau texte historique du mini-aperçu ; conserver `onOuvrir` (sélection d'un nœud existant)
- [ ] 1.3 Vérifier : écran composé (header + carte) visible à l'identique du Composer ; écran vide = PhoneCanvas vide, sans erreur

## 2. Aperçu d'essai (Prévisualiser + salle d'attente)

- [ ] 2.1 `ApercuAccueil` rend le même PhoneCanvas lecture seule, branché sur l'état simu courant (`nowMs/terminees/elus/teteFile/actif`), zéro écriture JSON/simu
- [ ] 2.2 Supprimer le markup tableau texte des deux call sites (`App.tsx` Prévisualiser et salle d'attente) ; conserver la file cliquable et les contrôles d'essai existants
- [ ] 2.3 Vérifier : rebours simulés reflétés dans l'écran composé ; avancer/reculer la simu met à jour l'aperçu sans toucher au JSON

## 3. Non-régression

- [ ] 3.1 Smokes existants verts (`screen`, `runtime`) + `openspec validate --specs` vert
- [ ] 3.2 Jeux avec `HOME` sans écran composé : aperçu vide sans crash, Composer inchangé (édition, undo, validation, export)
