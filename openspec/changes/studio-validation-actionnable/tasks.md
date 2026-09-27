## 1. Typologie et glossaire

- [ ] 1.1 Introduire `Diagnostic {code, niveau, noeud?, champ?, attendu?, correctifs[]}` émis à côté des chaînes par `validateGameFull`, avec table `niveauParCode` et requalification fermée, et vérifier : chaque règle existante a un niveau, `canExport` ne regarde que les erreurs
- [ ] 1.2 Mapper les erreurs C1 AJV vers des codes au point de sortie et rendre `rendreDiagnostic` (glossaire fermé + « Voir »), geler `erreurFR`, et vérifier : les ~10 motifs historiques rendent à l'identique, aucun nouveau pattern-matching

## 2. Écrans et corrections

- [ ] 2.1 Écran Valider en 3 blocs (erreurs/avertissements/infos) avec boutons « Corriger » et navigation existante, et vérifier : pastille, catégories et surlignage inchangés pour les erreurs
- [ ] 2.2 Export « quand même » après confirmation journalisée (session-only, invalidée à chaque édition) + nouvelles opérations MCP de correction (undo natif), et vérifier : export bloqué avec erreur, réussi avec avertissement confirmé, chaque correction annulable
- [ ] 2.3 Supprimer `erreurFR` une fois la couverture structurée totale, et vérifier : `tsc`, smokes, C1+C2 des jeux de référence à 0
