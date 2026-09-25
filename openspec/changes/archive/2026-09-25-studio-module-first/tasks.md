## 1. Création module-first

- [x] 1.1 Appliquer le `defaultScreen` du screenPlugin (ou content-only + widget générique si pas de plugin) et les `module.data` par défaut à la création d'étape, et vérifier qu'une étape QUIZ, PUZZLE et INFO naissent avec un widget `{ type: "module" }` visible dans le canvas
- [x] 1.2 Faire du choix du type de Module le premier choix du flux de création, et vérifier que le module choisi détermine l'écran initial sans étape intermédiaire vide

## 2. Changement de type destructif

- [x] 2.1 Afficher un message « modifications perdues » avec confirmation sur changement de type dans le dropdown, et vérifier que le refus laisse type, data et screen strictement inchangés
- [x] 2.2 Sur confirmation, détruire les `module.data`, poser les défauts du nouveau type et remplacer la seule zone content (header/footer/overlay préservés), et vérifier le JSON résultant nœud par nœud
- [x] 2.3 Faire passer le reset data + content par une seule opération nommée annulable, et vérifier que undo restaure type, data et screen d'un coup

## 3. Non-régression

- [x] 3.1 Revalider le jeu de référence et la fixture neutre couches 1+2, et vérifier 0 erreur et export pack toujours valide
- [x] 3.2 Rejouer un parcours création → changement de type confirmé → changement refusé → undo, et vérifier chaque état du Nœud et du canvas à chaque pas
