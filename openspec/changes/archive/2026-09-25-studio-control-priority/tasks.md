## 1. Matrice et Composer détail

- [x] 1.1 Produire la matrice contrôle→tier (P0/P1/P2) pour le Composer détail : familles Inspecteur, rotation masterId, secours par code, presets rayon, liens HOLD/config, JSON experts — Vérifier : chaque contrôle des familles a un tier défendu par la question « qu'est-ce qui casse sans lui à l'étape courante », doute → P1
- [x] 1.2 Déplacer les P2 du détail en accordéons « Avancé » fermés badgés (mémoire existante réutilisée), effet MCP inchangé — Vérifier : rotation master et secours par code repliés mais fonctionnels (même opération journalisée), `tsc --noEmit` sans nouvelle erreur

## 2. WYSIWYG, formulaires et Config

- [x] 2.1 Replier en « Avancé » : viewports d'aperçu, ImagePicker manifest, TemplatePicker « enregistrer », minuteurs quiz/puzzle fins — Vérifier : formulaires inchangés fonctionnellement (smoke `screen.smoke.ts` vert), badges visibles sans ouverture
- [x] 2.2 Créer la section Avancé de l'écran Config (bbox/zooms bruts, tileStrategy, glossaire, minigame defaults fins) et y déplacer les P2 transverses — Vérifier : branding/preset/gameMode/HOLD visibles comme avant, avancés repliés, `tsc --noEmit` sans nouvelle erreur

## 3. Écrans flux et barre globale

- [x] 3.1 Prévisualiser : triche (bypass, forceDraw, sessionId, forceHold) en accordéon « Triche » fermé ; fixture 1-clic, pas-à-pas, Nouvelle partie visibles — Vérifier : flags SIMULÉ intacts, smokes runtime verts
- [x] 3.2 Relire/Importer/Exporter : annulation de relecture et effacement brouillon repliés + confirmés ; Charger et porte unique visibles — Vérifier : aucun changement d'effet (mêmes opérations MCP), compteurs intacts
- [x] 3.3 Revue globale : matrice finale contrôle→tier par écran, sanctuarisés intacts (nav gauche, pastille, rails, tabs, accordéons contexte-seul) — Vérifier : `tsc --noEmit` au baseline, smokes dev/runtime/pack/screen verts, disambiguïsation P0-tiers vs Garanties P0 relue en spec
