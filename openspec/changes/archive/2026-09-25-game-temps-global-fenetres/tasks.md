## 1. Schéma et validation

- [x] 1.1 Ajouter `dureeTotale` + `finDeTemps` (`if/then`) et la variante `WINDOW` (`anyOf`, bornes ≥ 0) au Draft-07, et vérifier : durée+fin acceptées, durée seule rejetée, `WINDOW {}` rejeté, jeux existants inchangés
- [x] 1.2 Ajouter la règle C2 fenêtres (`apres < avant`, condition nommée) et documenter la non-garantie de faisabilité, et vérifier : fenêtre inversée rejetée, chemin tendu accepté avec mention

## 2. Moteurs et dashboard

- [x] 2.1 Évaluer `WINDOW` (éligibilité + relock + purge file + fin d'épreuve respectée) et l'échéance globale (`terminer` vs `continuer` + flag) dans Studio, shared KMP et PWA avec la même formule `elapsed`, et vérifier : verrouillage à l'échéance, fin imposée ou poursuite flaggée, reprise exacte
- [x] 2.2 Afficher rebours global + « se verrouille dans … » + « hors délai » dans le tableau (zéro donnée nouvelle) et configurer durée/fin/fenêtres dans le Studio (config globale + famille activation), et vérifier : mêmes chiffres que le moteur, undo OK

## 3. Non-régression

- [x] 3.1 Archiver `player-home-dashboard` d'abord puis rebaser ce delta si besoin, revalider (`openspec validate`), rejouer C1+C2 Sherlock/fixture à 0 erreur, valider le point revue (finir-puis-verrouiller) avant de coder la modale à l'échéance
