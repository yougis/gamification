## MODIFIED Requirements

### Requirement: Export à porte unique

Le bouton d'export SHALL être désactivé (jamais caché) tant que la validation échoue ou qu'un nœud est `draft` hors mode animateur, avec un message indiquant laquelle des deux conditions bloque.

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

#### Scenario: Export réussi depuis l'écran Exporter

- **GIVEN** un jeu valide C1+C2 sans nœud `draft`
- **WHEN** l'auteur clique le bouton d'export de l'écran Exporter
- **THEN** le pack est généré et chaque fichier affiche son `{path, version, size, sha256}` réel

#### Scenario: Barre globale vers la porte unique

- **GIVEN** l'auteur dans n'importe quel écran du Studio
- **WHEN** il clique Exporter dans la barre globale
- **THEN** l'écran Exporter s'ouvre (aucun transfert direct), avec la checklist à jour

### Requirement: File de relecture

L'écran Relire SHALL lister étapes et assets avec `providerId`, licence, `sourceUrl`, statut et `reviewedBy`, et offrir un filtre par statut avec le filtre `draft` mis en avant par défaut.

L'overlay de relecture SHALL montrer la source et les données du module associé, superposées quand le module s'y prête, côte-à-côte sinon.

Le passage `draft → reviewed` SHALL être une action explicite enregistrant `reviewedBy` (utilisateur courant), non modifiable a posteriori sans action distincte d'annulation de relecture.

Un compteur global des éléments encore `draft` SHALL rester visible en permanence, car il bloque l'export hors mode animateur.

Le message de blocage affiché dans Relire SHALL nommer la règle applicable : « aucun brouillon hors mode animateur » en général, et SHALL mentionner l'exigence kiosque (« jeu relu exigé ») uniquement quand `holdMode != "none"`. Le message SHALL jamais présenter le kiosque comme cause du blocage quand `holdMode` vaut `"none"`.

#### Scenario: Relecture avec overlay module

- **GIVEN** une étape 7-erreurs en statut `draft`
- **WHEN** l'auteur ouvre l'overlay de relecture
- **THEN** l'image source et les polygones du module sont affichés ensemble avant tout passage en `reviewed`

#### Scenario: Compteur draft et blocage HOLD
- **GIVEN** un jeu avec 2 éléments `draft` et `holdMode != "none"`
- **WHEN** l'auteur consulte n'importe quel écran
- **THEN** le compteur affiche 2 et l'export reste bloqué

#### Scenario: Compteur draft et blocage hors animateur

- **GIVEN** un jeu avec 2 éléments `draft`, `holdMode: "none"`, hors mode animateur
- **WHEN** l'auteur consulte n'importe quel écran
- **THEN** le compteur affiche 2 et l'export reste bloqué

#### Scenario: Message sans mention kiosque quand HOLD inactif

- **GIVEN** un jeu avec 1 nœud `draft` et `holdMode: "none"`
- **WHEN** l'auteur lit le message de blocage dans Relire
- **THEN** le message cite le nœud `draft` et ne mentionne pas le kiosque

#### Scenario: Message kiosque quand HOLD actif

- **GIVEN** un jeu avec 1 nœud `draft` et `holdMode: "lockTask"`
- **WHEN** l'auteur lit le message de blocage dans Relire
- **THEN** le message cite le nœud `draft` et l'exigence « jeu relu » du kiosque
