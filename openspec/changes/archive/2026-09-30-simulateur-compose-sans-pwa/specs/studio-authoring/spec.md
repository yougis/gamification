## ADDED Requirements

### Requirement: Prévisualisation par simulateur Compose web

L'écran Prévisualiser SHALL embarquer le simulateur Compose web (`compose-web-simulator`) en appel direct : le jeu courant est passe en memoire (jamais d'URL, jamais de snapshot serveur), l'etat simule (positions mockees, tirages forces, `sessionId` injecte) est fourni par les controles d'essai existants. Toute interaction SHALL rester sans ecriture (ni JSON source, ni session, ni event). L'iframe PWA, l'endpoint `/emulate` et la cible configurable SHALL ne plus exister.

#### Scenario: Essai sans ecriture
- **GIVEN** un jeu charge dans Previsualiser avec le simulateur ouvert
- **WHEN** l'auteur navigue, repond un quiz et force un tirage
- **THEN** les ecrans reagissent et le JSON source, l'essai hors simulateur et le journal restent intacts hors events SIMULE journalises

#### Scenario: Plus d'iframe
- **GIVEN** l'ecran Previsualiser affiche
- **WHEN** l'auteur cherche la cible PWA ou l'etat d'erreur iframe
- **THEN** aucun controle d'iframe n'existe ; seule la vue simulateur et les controles d'essai sont proposes

## REMOVED Requirements

### Requirement: Prévisualisation traçée
**Reason**: Le terminal React duplique et la previsualisation iframe rejoue un vrai player ; les deux sont remplaces par le simulateur Compose web unique.
**Migration**: Essai pas-a-pas, bypass capteurs, `forceDraw`, injection `sessionId` et `forceHoldLock`/`forceHoldExit` via les controles d'essai branchés sur le simulateur ; badge SIMULE conserve sur tout event simule.

## MODIFIED Requirements (export natif unique)

### Requirement: Export à porte unique
Le bouton d'export SHALL être désactivé (jamais caché) tant que la validation échoue ou qu'un nœud est `draft` hors mode animateur, avec un message indiquant laquelle des deux conditions bloque. En présence d'avertissements (et d'eux seuls), le bouton SHALL proposer « Exporter quand même » après confirmation explicite, journalisée dans l'historique.

La checklist « Contrôle pré-export » de l'écran Exporter SHALL être calculée depuis l'état réel du jeu et SHALL afficher au minimum : le verdict C1 (Draft-07), le verdict C2 (applicative), le décompte et les noms des nœuds encore `draft`, et le verdict de compatibilité natif. Aucune ligne de la checklist SHALL être un texte statique : chaque ligne reflète le jeu courant et se met à jour à chaque modification.

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
