## MODIFIED Requirements

### Requirement: Verdicts séparés et actionnables

L'écran Valider SHALL présenter les verdicts C1 (Draft-07) et C2 (applicative) dans deux blocs visuellement séparés, jamais fusionnés en un statut global unique, plus un troisième bloc non bloquant regroupant avertissements et infos.

Les erreurs C2 SHALL être groupées par catégorie (cycle, atteignabilité, pools, HOLD, références, consumable), et chaque erreur SHALL être cliquable pour naviguer vers le nœud fautif dans Composer avec surlignage temporaire. Chaque constat corrigeable SHALL afficher son bouton « Corriger » (correction proposée, jamais silencieuse) ; les constats non corrigeables affichent l'explication et la navigation seules.

La règle de dérivation "export possible" (C1 ∧ C2 ∧ pas de nœud `draft` hors mode animateur) SHALL être visible dans l'UI (aide contextuelle), jamais appliquée silencieusement.

#### Scenario: Erreur cliquable vers le fautif
- **GIVEN** un jeu avec une erreur C2 de cycle entre les nœuds A et B
- **WHEN** l'auteur clique l'erreur dans la catégorie cycle
- **THEN** Composer s'ouvre sur les nœuds A et B surlignés temporairement

#### Scenario: Avertissement visible sans bloquer
- **GIVEN** un jeu valide sauf un objet `consumable` jamais utilisé
- **WHEN** l'auteur consulte l'écran Valider
- **THEN** le constat apparaît dans le bloc avertissements (pas dans erreurs), avec navigation vers l'objet et sans bouton Corriger

### Requirement: Export à porte unique

Le bouton d'export SHALL être désactivé (jamais caché) tant que la validation échoue ou qu'un nœud est `draft` hors mode animateur, avec un message indiquant laquelle des deux conditions bloque. En présence d'avertissements (et d'eux seuls), le bouton SHALL proposer « Exporter quand même » après confirmation explicite, journalisée dans l'historique.

La checklist « Contrôle pré-export » de l'écran Exporter SHALL être calculée depuis l'état réel du jeu et SHALL afficher au minimum : le verdict C1 (Draft-07), le verdict C2 (applicative), le décompte et les noms des nœuds encore `draft`, et les verdicts par canal d'export (NATIVE, PWA). Aucune ligne de la checklist SHALL être un texte statique : chaque ligne reflète le jeu courant et se met à jour à chaque modification.

La ligne relative à la relecture SHALL appliquer la règle kiosque uniquement quand `holdMode != "none"` : avec `holdMode: "none"`, seul le blocage « aucun brouillon hors mode animateur » SHALL apparaître ; avec `holdMode != "none"`, l'exigence « jeu relu » SHALL apparaître comme condition kiosque distincte.

Avant génération, l'écran SHALL afficher le résumé des fichiers à produire calculé depuis le jeu courant (jamais un exemple statique) ; après génération, chaque fichier SHALL afficher son `{path, version, size, sha256}` réel.

Le bouton d'export de l'écran Exporter SHALL déclencher la génération du pack (même opération que la règle centrale `canExport` autorise) quand il est actif. Le bouton Exporter de la barre globale SHALL ouvrir l'écran Exporter, qui reste la porte unique : l'interface SHALL n'exposer qu'une seule action d'export visible par défaut. Si la porte historique `exportPack` coexiste temporairement avec `exportPackFull`, elle SHALL être marquée dépréciée et masquée derrière un accès explicite.

#### Scenario: Export bloqué avec raison visible

- **GIVEN** un jeu valide C1+C2 mais avec 1 nœud `draft` hors mode animateur
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** le bouton est désactivé et le message nomme le nœud `draft` comme cause du blocage

#### Scenario: Checklist reflétant l'état réel

- **GIVEN** un jeu avec 2 nœuds `draft` et `holdMode: "none"`
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** la checklist affiche « 2 nœuds en statut draft » avec leurs noms, aucun texte statique, et aucune mention du kiosque

#### Scenario: Ligne kiosque seulement en HOLD actif

- **GIVEN** un jeu avec `holdMode: "guidedAccess"` et 1 nœud `draft`
- **WHEN** l'auteur ouvre l'écran Exporter
- **THEN** la checklist affiche la condition kiosque « jeu relu exigé » en plus du nœud `draft` nommé

#### Scenario: Export avec avertissement confirmé

- **GIVEN** un jeu valide avec 1 avertissement (`consumable` inutilisé) et 0 erreur
- **WHEN** l'auteur confirme « Exporter quand même »
- **THEN** le pack est généré et la confirmation est journalisée avec l'avertissement nommé

#### Scenario: Export réussi depuis l'écran Exporter

- **GIVEN** un jeu valide C1+C2 sans nœud `draft`
- **WHEN** l'auteur clique le bouton d'export de l'écran Exporter
- **THEN** le pack est généré et chaque fichier affiche son `{path, version, size, sha256}` réel

#### Scenario: Barre globale vers la porte unique

- **GIVEN** l'auteur dans n'importe quel écran du Studio
- **WHEN** il clique Exporter dans la barre globale
- **THEN** l'écran Exporter s'ouvre (aucun transfert direct), avec la checklist à jour
