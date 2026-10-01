## 1. Contrat Studio (PhoneCanvas + terminal)

- [x] 1.1 Afficher le voile cliquable et l'icône message pour tout overlay (plus seulement si `fermable`), `fermable: false` gardant le fond inerte, et vérifier qu'un overlay non fermable se masque et se réaffiche sans transition ni event
- [x] 1.2 Afficher le contrôle de masquage en simu sur tout overlay (badge SIMULÉ) et vérifier qu'une carte de fond sous overlay devient pannable après masquage, sans écriture JSON

## 2. Contrat natif

- [x] 2.1 Appliquer le même contrat dans le renderer natif (contrôle systématique, `fermable` restreint au clic-fond) et vérifier qu'aucun écran ne reste bloqué derrière un voile sans sortie

## 3. Validation croisée

- [x] 3.1 Lancer `tsc --noEmit`, les smokes Studio (`test:runtime`, `test:screen`) et les tests KMP concernés, et vérifier zéro régression
- [x] 3.2 Rejouer un écran composé (fond carte + overlay non fermable) en simu : masquer l'overlay, panner la carte, réafficher, et vérifier zéro écriture JSON/session/event
