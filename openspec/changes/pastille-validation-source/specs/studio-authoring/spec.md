## MODIFIED Requirements

### Requirement: Pastille validation dans le Composer

Le Composer SHALL afficher une pastille compacte d'état de validation dans la barre globale de l'application (à côté du nom du jeu et des compteurs) : `✓ Valide` si aucune erreur, `⚠ N problèmes` sinon (N = nombre total d'erreurs C1 + C2). N SHALL être calculé depuis la même source que les listes de l'écran Valider (diagnostics C1/C2 de niveau erreur) et SHALL ne jamais être dérivé par parsing de texte libre (messages de succès type « Publié », « Export OK » ne SHALL jamais alimenter le compteur). La pastille SHALL être cliquable vers l'écran Valider et SHALL porter un tooltip explicite (« Voir le détail dans Valider »).

La pastille ne SHALL jamais afficher le détail des erreurs (messages, nœuds fautifs, impasses) — ce détail vit exclusivement dans l'écran Valider. Il n'existe plus de pastille sur un rail central (le centre n'ayant plus de rail).

Le compteur de fichiers du manifest SHALL distinguer les assets enregistrés du `game.json` ajouté à la génération (libellé type « N asset(s) », jamais un compteur brut présenté comme un manque).

#### Scenario: Pastille verte sans erreur
- **GIVEN** un jeu valide affiché dans le Composer
- **WHEN** l'auteur regarde la barre globale
- **THEN** la pastille affiche `✓ Valide`

#### Scenario: Pastille cliquable avec erreurs
- **GIVEN** un jeu avec 2 erreurs C2 affiché dans le Composer
- **WHEN** l'auteur clique la pastille `⚠ 2 problèmes`
- **THEN** l'écran Valider s'ouvre avec les 2 erreurs groupées par catégorie

#### Scenario: Succès de publication sans fantôme
- **GIVEN** un jeu valide dont l'auteur vient de publier avec succès (rapport « Publié : … code … »)
- **WHEN** l'auteur regarde la barre globale
- **THEN** la pastille affiche `✓ Valide` (le message de succès n'est pas compté) et Valider liste 0 erreur
