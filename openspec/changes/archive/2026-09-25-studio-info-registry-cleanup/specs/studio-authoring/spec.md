## ADDED Requirements

### Requirement: Données valides du nœud start par défaut

Le nœud `start` créé par défaut (jeu vide, import d'un fichier sans nœud) SHALL porter des données conformes au sous-schéma de son type de module : pour `INFO`, `schemaVersion` + au moins un step au contenu générique de bienvenue. Le `start` SHALL être accepté en couche 1 sur son `module.data`, indépendamment des autres champs.

#### Scenario: Jeu vide au commit initial

- **GIVEN** un auteur créant un nouveau jeu
- **WHEN** le `start` par défaut est validé en couche 1
- **THEN** aucune erreur ne porte sur `module/data` (le step de bienvenue est valide)
