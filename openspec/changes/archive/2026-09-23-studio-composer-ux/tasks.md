## 1. Pastille validation + migration du footer

- [x] 1.1 Ajouter la pastille `✓ Valide` / `⚠ N problèmes` (comptes C1+C2 depuis `erreurs`) dans la barre d'outils du graphe, cliquable vers l'écran Valider avec tooltip — Vérifier : pastille verte sur jeu valide, `⚠ 3 problèmes` sur jeu à 3 erreurs, clic ouvre Valider
- [x] 1.2 Déplacer `pied` + `listeErreurs` dans l'écran Valider au-dessus de `BlocValidation` (navigation cliquable vers fautifs conservée) et supprimer `section-validation` du Composer — Vérifier : Composer sans footer, Valider affiche puces + erreurs + navigation, `tsc --noEmit` passe

## 2. Chevrons, rails et cascade

- [x] 2.1 Créer les composants `ChevronRepli` (direction, tooltip, état) et `RailReplie` (icône + tooltip + chevron inverse, focusables, `aria-expanded`) — Vérifier : rendus isolés corrects (story ou page de test), `tsc --noEmit` passe
- [x] 2.2 Remplacer les boutons texte « Replier »/« Déplier »/« Détail » par chevrons + rails (graphe→gauche, liste/détail→droite, rails `[L][D]` empilés), étendre `mep.repliees` en localStorage rétro-compatible — Vérifier : les 8 cas (ouvert/replié × 3 panneaux) affichent le bon chevron/rail, persistance après rechargement
- [x] 2.3 Nettoyer les props `boutonPlier`/`boutonMolette`/`panneauMolette` de `NodeList` et les appels associés — Vérifier : aucune référence restante (`grep`), `tsc --noEmit` passe

## 3. Suppression molette

- [x] 3.1 Déplacer Recentrer/Aligner H/V vers une mini-toolbar flottante du graphe (règle d'activation Aligner conservée) et supprimer l'état `molette`/`basculerMolette` + dialogs associés — Vérifier : toolbar visible sur graphe ouvert, Aligner désactivé avec tooltip si < 2 sélectionnés, aucun `molette` restant (`grep`)
- [x] 3.2 Ajouter le reset des largeurs au double-clic sur les `Splitter` (valeurs `LAYOUT_DEFAUT`) + tooltip « Double-cliquer pour réinitialiser » — Vérifier : double-clic restaure 340/400 après redimensionnement

## 4. Accordéon

- [x] 4.1 Créer le composant `Accordeon` (id stable, titre, badge, ouvert contrôlé, persistance localStorage, a11y `aria-expanded`/`aria-controls`) — Vérifier : comportements unitaires (toggle, mémoire après rechargement simulé)
- [x] 4.2 Appliquer l'accordéon au `PropertiesPanel` (Style Écran/Contenu/Global, Zone, widget, TemplatePicker) avec règle « contexte seul » par type de sélection — Vérifier : clic widget texte → seule « Contenu » ouverte ; clic zone → « Zone » ; fond → « Fond/Écran »
- [x] 4.3 Appliquer l'accordéon aux formulaires modules (quiz, puzzle, minigame-params, `*WidgetProperties`) avec badges résumé (comptes, origine d'héritage) — Vérifier : en-têtes affichent les badges sans ouverture, Formulaires inchangés fonctionnellement (smokes `screen.smoke.ts` verts)
- [x] 4.4 Appliquer l'accordéon aux sous-sections dans une famille Inspecteur (tabs des 9 familles conservés) — Vérifier : navigation tabs inchangée (clic + flèches clavier), sous-sections repliables avec mémoire

## 5. Vérification globale

- [x] 5.1 Revue visuelle complète : composer tout ouvert / tout replié / mixte, thème sombre + clair, clavier seul (tab + entrée + flèches) — Vérifier : aucun bouton texte Replier, aucune molette, aucune liste d'erreurs dans Composer, pastille présente, `tsc --noEmit` + smokes verts
