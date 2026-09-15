## 1. Décisions préalables

- [x] 1.1 Trancher la porte d'export définitive (`exportPack` vs `exportPackFull`) au niveau produit et consigner la décision dans `design.md` — vérifié par la décision écrite (les tâches 8.x suivent la porte retenue, la spec couvre les deux branches)
- [x] 1.2 Trancher avec `studio-layout-revamp` l'emplacement de la config globale (écran séparé vs modal) sans changer la spec — vérifié par le choix consigné dans `design.md`

## 2. Navigation par écrans et barre globale

- [x] 2.1 Ajouter la navigation latérale Composer/Importer/Relire/Valider/Prévisualiser/Exporter branchée sur le même état `{ game, meta }` + historique, sans état par écran (hors simulateur) — vérifié par navigation entre écrans sans perte d'état ni d'undo/redo
- [x] 2.2 Ajouter la barre globale (nom du jeu, statut draft/reviewed, indicateur C1/C2, undo/redo, accès export) et le sélecteur de calques transverses — vérifié visuellement sur chaque écran
- [x] 2.3 Vérifier `npx tsc --noEmit` passe dans `studio/` après 2.1–2.2

## 3. Composer : canvas et inspecteur

- [x] 3.1 Rendre les arêtes directionnelles (flèche) avec style distinct si condition, et ajouter l'icône par type de condition — vérifié visuellement sur un jeu avec GEOFENCE + NODE_COMPLETED
- [x] 3.2 Afficher les nœuds `draft` en permanence (bordure pointillée + badge) sans lancer la validation — vérifié sur un jeu avec 1 nœud draft parmi 5
- [x] 3.3 Ajouter sélection multiple, alignement/distribution basique et recherche de nœud par nom/type — vérifié par recherche retrouvant un nœud nommé
- [x] 3.4 Ordonner l'inspecteur en sections fixes module → activation → latch/rejeu → discovery → effects → inventoryRef, générées depuis le registre — vérifié sur un nœud QUIZ et un nœud AR_MARKER
- [x] 3.5 Afficher le champ HOLD en lecture seule + lien vers la config globale quand `needsLock: true` et `holdMode == none`, et un avertissement inline non bloquant pour `presentationNeeds`/`experienceNeeds` non satisfaits — vérifié sur les deux cas
- [x] 3.6 Ajouter la vue liste + "référencé par" des objets, et la confirmation listant les nœuds impactés avant suppression d'un objet référencé — vérifié en supprimant un objet utilisé par 2 nœuds
- [x] 3.7 Ajouter le panneau de configuration globale 1:1 avec les opérations MCP (navigation, preset + indicateur de divergence, branding validé à la saisie, gameMode/difficulty, HOLD avec recalcul visible, GPS/carte) — vérifié en changeant `holdMode` et en observant le recalcul des dépendances
- [x] 3.8 Vérifier `npx tsc --noEmit` passe dans `studio/` après 3.1–3.7

## 4. Importer : parité d'état

- [x] 4.1 Garantir qu'un import réussi donne le même état qu'une création manuelle (même undo/redo, mêmes écrans, pas de mode réduit) — vérifié par import de `game-5poi.json` suivi d'une édition + undo
- [x] 4.2 Afficher l'erreur brute de schéma en cas d'échec C1, et l'historique local des imports (date, nom, résultat + raison) — vérifié avec un fichier invalide puis un fichier valide

## 5. Relire : file de travail

- [x] 5.1 Ajouter la liste étapes/assets (`providerId`, licence, `sourceUrl`, statut, `reviewedBy`) avec filtre par statut, `draft` en avant par défaut — vérifié en filtrant un jeu mixte draft/reviewed
- [x] 5.2 Ajouter l'overlay de relecture (source + données module, superposées ou côte-à-côte) et le passage `draft → reviewed` explicite enregistrant `reviewedBy` non modifiable sans action d'annulation distincte — vérifié sur une étape 7-erreurs
- [x] 5.3 Ajouter le compteur global `draft` permanent consommant la règle centrale — vérifié : le compteur et le blocage d'export s'accordent toujours

## 6. Valider : verdicts séparés et actionnables

- [x] 6.1 Séparer visuellement les blocs C1 et C2 (jamais de statut global fusionné) et grouper les erreurs C2 par catégorie — vérifié sur un jeu avec erreurs cycle + HOLD
- [x] 6.2 Rendre chaque erreur C2 cliquable vers le nœud fautif dans Composer avec surlignage temporaire — vérifié sur une erreur de cycle A↔B
- [x] 6.3 Afficher la règle de dérivation "export possible" en aide contextuelle — vérifié visuellement sur l'écran Valider

## 7. Prévisualiser : traçabilité

- [x] 7.1 Ajouter le mode pas-à-pas (avance/retour) et le panneau de triche regroupé (bypass, `forceDraw`, `sessionId`, `forceHoldLock`/`forceHoldExit`) — vérifié en forçant un tirage de branche
- [x] 7.2 Badger visuellement tout event simulé ("SIMULÉ" + HOLD) dans les logs, sans confusion possible avec un event réel — vérifié visuellement pendant une session simulée
- [x] 7.3 Ajouter le bouton fixture neutre 1/5→FIN en un clic avec pass/fail immédiat, et le rappel permanent "n'écrit jamais dans le JSON source" — vérifié en relançant la fixture puis en contrôlant que le JSON source est inchangé

## 8. Exporter : porte unique

- [x] 8.1 Implémenter le sélecteur central `canExport(game, meta)` consommé par la barre globale, Relire et Exporter (décision 1.1 appliquée) — vérifié : un seul point de calcul, trois consommateurs
- [x] 8.2 Désactiver (sans cacher) le bouton d'export avec la raison du blocage, afficher le résumé pré-export puis les `{path, version, size, sha256}` réels après génération — vérifié sur un jeu bloqué puis sur un jeu valide
- [x] 8.3 N'exposer qu'une seule action d'export visible par défaut (porte historique dépréciée et masquée si coexistante, selon décision 1.1) — vérifié : une seule action visible par défaut

## 9. Calques transverses

- [x] 9.1 Ajouter le calque i18n en surimpression (langue active, vue clé/valeur, clés manquantes, clés verrouillées grisées + cadenas non éditables) — vérifié sur une clé `locked`
- [x] 9.2 Présenter difficultés/modes comme surcouches sans aucune action "dupliquer le graphe", et exclure HOLD de leur sélecteur — vérifié : aucune duplication possible depuis l'UI

## 10. Garanties P0 dans l'UI

- [ ] 10.1 Nommer l'opération MCP dans chaque entrée d'historique et interdire tout champ cosmétique non persisté — vérifié : `setBranding` apparaît nommé après changement de couleur
- [ ] 10.2 Faire vérifier le statut `draft` par le mode de lecture en conditions réelles lui-même — vérifié : lecture refusée sur jeu avec nœud draft hors animateur
- [ ] 10.3 Vérifier qu'Importer/Exporter n'initient aucune requête réseau (revue du code des deux écrans) — vérifié par inspection + import/export hors-ligne

## 11. Vérification finale

- [ ] 11.1 `npx tsc --noEmit` passe dans `studio/` et les tests Studio existants passent — vérifié par les commandes
- [ ] 11.2 `game-5poi.json` passe toujours les couches 1+2 et la fixture neutre reste rejouable en un clic — vérifié de bout en bout
- [ ] 11.3 Revue croisée avec `studio-layout-revamp` : aucun conflit sur le découpage (contenu vs enveloppe) — vérifié par relecture conjointe des deux changes
