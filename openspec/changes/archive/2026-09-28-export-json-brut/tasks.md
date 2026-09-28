## 1. Bouton JSON brut dans l'écran Exporter

- [x] 1.1 Ajouter à côté du bouton pack bloqué un bouton toujours actif « Télécharger le JSON brut (non valide, debug) », réutilisant le motif blob-anchor (`JSON.stringify(game)`, nom marqué non valide)
- [x] 1.2 Rappeler les causes du blocage à côté du bouton (`raisonsBlocage` existantes) ; aucun état modifié (ni JSON, ni undo, ni rapport)
- [x] 1.3 Vérifier : pack toujours bloqué avec erreurs (C1/C2/statuts) ; brut téléchargeable avec et sans blocage ; réimport du brut → pipeline bi-couche inchangé
