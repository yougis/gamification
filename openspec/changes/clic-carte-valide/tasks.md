## 1. Clic carte valide + quiz seedé

- [x] 1.1 Écrire `predicate: "enter"` dans la branche création du clic `MapView` et vérifier positionner une étape sans GEOFENCE ne produit plus aucune erreur C1 liée à la condition
- [x] 1.2 Verrouiller la préservation au drag (spread existant) et vérifier déplacer une étape conserve `predicate` et ne régénère rien
- [x] 1.3 Seeder 1 question d'exemple dans `donneesDefautModule("QUIZ")` et vérifier un quiz créé passe C1 sur son `module/data` puis re-bloque si l'auteur supprime la dernière question

## 2. Repli oneOf

- [x] 2.1 Détecter le motif « échec oneOf sur un même `requires[i]` » dans le collecteur C1 et vérifier une GEOFENCE sans `predicate` émet un constat unique avec le champ probable nommé
- [x] 2.2 Rendre le constat via le glossaire fermé (« déclencheur ») avec action « Voir » et vérifier les autres erreurs C1 restent unitaires et navigables
- [x] 2.3 Étendre le smoke validation (cas replié + cas mixte replié/quiz-vide) et vérifier `game-5poi.json` reste accepté sans repli
