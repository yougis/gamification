# studio-draft-autosave Specification

## Purpose

Garantit que le jeu en cours d'édition dans le Studio GeoPlay survit au rechargement de la page grâce à une sauvegarde locale continue, sans jamais fuir dans le JSON exporté ni nécessiter de réseau.

## Requirements

### Requirement: Autosave continu du brouillon

Le Studio SHALL sauvegarder en continu le brouillon en cours d'édition dans `localStorage` sous la clé versionnée `geoplay-draft-v1`. Le brouillon sauvegardé SHALL contenir au minimum le `game` courant et le `meta` courant (statuts `draft|reviewed|published`, `reviewedBy`). L'écriture SHALL être débouncée (au plus une écriture toutes les ~500 ms après la dernière modification) pour ne pas ralentir l'édition.

#### Scenario: Rechargement restaure le brouillon
- **WHEN** l'auteur édite un jeu (ajoute un nœud, modifie un champ) puis recharge la page
- **THEN** le jeu et ses statuts sont restaurés à l'identique, y compris la dernière modification

#### Scenario: Écriture débouncée
- **WHEN** l'auteur tape rapidement dans un champ (10 frappes en 1 seconde)
- **THEN** au plus 2 écritures `localStorage` sont effectuées, et le contenu final est celui de la dernière frappe

### Requirement: Restauration au chargement avec garde-fou

Au chargement, le Studio SHALL restaurer le brouillon depuis `geoplay-draft-v1` si la clé existe et contient un JSON valide. Si la clé est absente, corrompue ou d'une version incompatible, le Studio SHALL démarrer sur un jeu vide sans erreur bloquante et SHALL journaliser le rejet en console.

#### Scenario: Brouillon valide restauré
- **WHEN** le Studio charge avec `geoplay-draft-v1` contenant un jeu de 3 nœuds
- **THEN** les 3 nœuds, leurs données et leurs statuts sont affichés

#### Scenario: Brouillon corrompu ignoré
- **WHEN** le Studio charge avec `geoplay-draft-v1` contenant du texte non-JSON
- **THEN** un jeu vide est affiché et aucun crash ne survient

### Requirement: Remplacement et effacement explicites

Un import réussi ou la création d'un nouveau jeu SHALL remplacer le brouillon sauvegardé. Le Studio SHALL offrir une action explicite « Effacer le brouillon » qui supprime la clé `geoplay-draft-v1` et réinitialise l'éditeur sur un jeu vide.

#### Scenario: Import remplace le brouillon
- **WHEN** l'auteur importe un fichier JSON valide alors qu'un brouillon existe
- **THEN** le jeu importé devient le brouillon courant et l'ancien contenu n'est plus restaurable

#### Scenario: Effacement explicite
- **WHEN** l'auteur clique « Effacer le brouillon » et confirme
- **THEN** la clé est supprimée et un rechargement affiche un jeu vide

### Requirement: Brouillon strictement local

Le brouillon SHALL vivre uniquement dans `localStorage`, jamais dans le JSON exporté ni sur le réseau. L'export SHALL contenir exactement le jeu édité, sans clé, horodatage ni trace de l'autosave.

#### Scenario: Export sans trace du brouillon
- **WHEN** l'auteur exporte un jeu restauré depuis un brouillon
- **THEN** le JSON exporté est identique à celui d'un jeu édité sans rechargement

### Requirement: Dégradation sans stockage

Si `localStorage` est indisponible ou plein (exception à l'écriture), le Studio SHALL continuer à fonctionner en mémoire et SHALL afficher un avertissement non bloquant « Sauvegarde locale indisponible — vos modifications seront perdues au rechargement ». Aucune donnée SHALL être perdue dans la session courante.

#### Scenario: Stockage indisponible
- **WHEN** `localStorage.setItem` lève une exception pendant l'édition
- **THEN** l'édition continue normalement et un avertissement non bloquant est affiché
