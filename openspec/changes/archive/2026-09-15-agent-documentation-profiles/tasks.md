## 1. Mise a jour de AGENTS.md

- [x] 1.1 Refondre la structure de `AGENTS.md` pour integrer les grands principes structurants du systeme en tant que regles transverse explicites, avec separation claire entre regles de code generales et regles de spec (vivant dans `openspec/config.yaml` et `openspec/specs/`)
- [x] 1.2 Ajouter une section "Profils de parties prenantes" dans `AGENTS.md` declarant les 5 profils (utilisateur, createur, developpeur, mainteneur, financeur/partenaire) et leur lien avec les capacites du systeme
- [x] 1.3 Verifier que `AGENTS.md` respecte le format du schema spec-driven et que `openspec validate` ne signale pas d'erreur liee au changement

## 2. Creation de la documentation des profils

- [x] 2.1 Creer le repertoire `docs/profiles/` et le fichier `utilisateur.md` decrivant comment jouer, naviguer et interagir avec les POI, avec les principes structurants du systeme en filtre
- [x] 2.2 Creer `createur.md` decrivant comment composer un jeu dans le Studio, utiliser le MCP, valider et exporter, avec les principes structurants
- [x] 2.3 Creer `developpeur.md` decrivant l'architecture, l'integration des modules, le schema Draft-07, la validation, avec les principes structurants
- [x] 2.4 Creer `mainteneur.md` decrivant le cycle de vie des changes, l'archive, la mise a jour du schema, la compatibilite, avec les principes structurants
- [x] 2.5 Creer `financeur-partenaire.md` decrivant la valeur commerciale, le modele economique, le ROI, l'integration en borne, avec les principes structurants

## 3. Integration du systeme de profils dans l'agent

- [x] 3.1 Implementer dans `AGENTS.md` les regles de selection de profil permettant a l'agent d'adapter ses reponses selon le profil cible (filtre de decision)
- [x] 3.2 Verifier que chaque skill GeoPlay (geoplay-spec-validator, geoplay-graph-architect, etc.) est correctement reference dans le profil developpeur
- [x] 3.3 Tester que l'agent produit des reponses coherentes pour chaque profil apres mise a jour

## 4. Verification et validation

- [x] 4.1 Executer `openspec status --change "agent-documentation-profiles"` et verifier que tous les artifacts sont en statut `done`
- [x] 4.2 Executer `openspec validate --change "agent-documentation-profiles"` et verifier que le changement est valide avec `skip_specs: true`
- [x] 4.3 Verifier que `AGENTS.md` mis a jour contient les principes structurants et les references aux profils de documentation
- [x] 4.4 Verifier que les fichiers de documentation des profils existent et sont structurellement coherence
