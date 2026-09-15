## 1. Socle visuel et navigation

- [x] 1.1 Introduire des tokens de thème variables pour la densité, les statuts et la typographie display/mono/texte, sans changer le thème clair par défaut, et vérifier visuellement les cartes et pastilles existantes.
- [x] 1.2 Unifier la navigation autour de la table des écrans existants pour desktop, mobile et stepper, sans supprimer l’écran `config`, et vérifier qu’aucune entrée ne mène à un écran vide.
- [x] 1.3 Remplacer toute dépendance typographique réseau par des piles système ou des polices auto-hébergées versionnées, puis vérifier un build offline sans requête de police.

## 2. Graphe et composition

- [x] 2.1 Restyler les nœuds ReactFlow avec rail par type, pastille de statut, pointillés `draft` et anneau de sélection, sans modifier les interactions, puis vérifier drag, connexion, sélection et recherche.
- [x] 2.2 Conserver les positions, `fitView`, la sélection multiple, l’alignement, la minimap et la mise en surbrillance des erreurs, puis vérifier avec les jeux 5-POI et Sherlock Holmes.
- [x] 2.3 Garder les formulaires dynamiques branchés sur le registre et les champs `discovery`, `effects`, `inventoryRef` et objets, puis vérifier qu’une modification met toujours à jour le même JSON validé.

## 3. Écrans guidés

- [x] 3.1 Aligner l’écran Importer sur dropzone + historique avec statut/résultat, sans rendre l’historique rejouable directement, puis vérifier import valide, invalide et corrompu.
- [x] 3.2 Aligner l’écran Relire sur un tableau dense branché sur provenance, licence, `sourceUrl`, statuts et `reviewedBy`, sans affaiblir la règle draft/HOLD, puis vérifier le passage en `reviewed`.
- [x] 3.3 Aligner l’écran Valider sur cartes C1/C2 et erreurs codées avec lien vers le nœud fautif, sans changer les verdicts, puis vérifier les cas C1 OK/C2 KO et C1 KO.
- [x] 3.4 Aligner l’écran Prévisualiser sur une trace événementielle avec badges `bypass`/`triche`/`holdMode`, sans écrire dans le JSON source, puis vérifier la fixture rejouable.
- [x] 3.5 Aligner l’écran Exporter sur pré-vol et aperçu manifest avec tailles et SHA, sans changer les gates draft/HOLD, puis vérifier export accepté et export refusé.

## 4. Accessibilité et responsive

- [x] 4.1 Réserver les micro-typographies aux métadonnées et conserver des contrôles tactiles suffisants, puis vérifier au clavier, au tactile et sur petit écran.
- [x] 4.2 Vérifier qu’aucune information n’est portée par la seule couleur grâce aux icônes, libellés et textes conservés.

## 5. Vérification finale

- [x] 5.1 Exécuter la validation complète des jeux existants, les contrôles TypeScript/lint applicables et les smoke tests concernés, puis consigner l’absence de régression fonctionnelle.
