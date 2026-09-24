## 1. Checklist pré-export réelle

- [x] 1.1 Remplacer le tableau statique de la checklist par des lignes calculées (verdicts C1/C2, décompte + noms des nœuds `draft`, verdicts canaux NATIVE/PWA) et vérifier que chaque ligne change après modification du jeu (ajout d'un `draft`, introduction d'une erreur C2)
- [x] 1.2 Conditionner la ligne kiosque « jeu relu exigé » à `holdMode != "none"` et vérifier les deux cas : absente avec `holdMode: "none"`, présente avec `holdMode: "guidedAccess"`

## 2. Bouton d'export fonctionnel

- [x] 2.1 Brancher le bouton de l'écran Exporter sur `exportPackFull` avec état désactivé + raison nommée tant que `canExport` échoue, et vérifier qu'un jeu valide sans `draft` génère le pack avec `{path, version, size, sha256}` réels affichés par fichier
- [x] 2.2 Remplacer l'aperçu manifeste statique par le résumé calculé depuis le jeu courant (chemins + versions avant génération) et vérifier qu'aucun exemple fictif (`intro.mp4`, sha `a3f2…`) ne subsiste
- [x] 2.3 Conserver la navigation barre globale → écran Exporter comme porte unique (aucun transfert direct) et vérifier que les deux boutons coexistent sans double génération (un seul appelle `exportPackFull`)

## 3. Libellés de blocage

- [x] 3.1 Reformuler le message Relire pour citer la règle applicable (nœuds `draft` nommés ; mention kiosque seulement si HOLD actif) et vérifier les deux cas `holdMode: "none"` / `"lockTask"`

## 4. Non-régression

- [x] 4.1 Passer `tsc --noEmit` sans nouvelle erreur par rapport au baseline, les smokes dev/runtime/pack/screen verts, et rejouer les 5 scénarios spec (bloqué avec raison, checklist réelle, ligne kiosque, export réussi, barre globale) en modes sombre/clair
