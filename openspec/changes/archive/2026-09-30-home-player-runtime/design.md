## Context

Voir `proposal.md` pour le motif. Etat actuel verifie en code : `present()` assigne `activeId` (Studio `runtime.ts:149`, KMP `GameEngine.kt:255`), `NodeState` a 4 etats avec 28 appelants, `showHomeDashboard(game, activeNodeId)`, `completeAndAdvance` avec avance auto FIFO, marqueurs carte lus uniquement depuis `GEOFENCE`, `global.screen` a double role (fallback noeuds + ecran HOME via `ApercuAccueil`). Aucune spec ne nomme `Apercu`, `PlayerTerminal`, `doEval`.

## Goals / Non-Goals

**Goals:**
- HOME carte plein ecran + position comme cas nominal, retour HOME systematique.
- Vue separee du moteur, deux ecritures journalisees, snapshot + droit a finir, abandon budgete.
- PlayerShell unique consommable par simu Studio, PWA, natif.
- Suppression ACTIVE sans regression validation ni perte offline.

**Non-Goals:**
- Pas de nouveau declencheur, pas de nouveau module, pas de reseau joueur.
- Pas de refonte tuiles/i18n/HOLD ; HOLD conforme existant conserve.
- Pas de migration auto des jeux : regle centrale + refus explicite si ACTIVE residuel.

## Decisions

- **Moteur 3 etats + flags.** `LOCKED | UNLOCKED | COMPLETED` + flags `hors-delai?, replay?, abandon?, triche?`. Pourquoi : supprime la modale du vocabulaire, garde latch/WINDOW/pools comme regles d'ouverture. Alternative rejetee : garder ACTIVE transitoire au commit, reintroduit la modale par la fenetre.
- **Snapshot a l'entree etape.** Eligible a `t0` requis pour questionnaire ; Valider a `t1` compare au frais. Pourquoi : volet gratuit, saisie protegee, verrous utiles. Alternative rejetee : snapshot au volet, permet gel matinal abusif.
- **Droit a finir + hors-delai.** Eligible `t0` puis ineligible `t1` = `COMPLETED + hors-delai`. Pourquoi : ne punit pas la saisie, garde stats temporelles. Alternative rejetee : refus poli sec, frustrant carte en main.
- **Abandon ecriture budgetee (option B).** Apercu/relecture gratuits, abandon jouable consomme `maxReentries`, sans effet ni score, idempotent par ouverture. Pourquoi : anti-reconnaissance infinie, fausse manip explicitee par bouton. Alternative rejetee : abandon gratuit, farming d'observation.
- **Effets une seule fois.** Score selon `scoreOnReplay`, effets non rejoues par defaut. Pourquoi : anti-farming `GIVE_ITEM`/`REVEAL_NODE`. Alternative rejetee : rejouer effets, duplique inventaire.
- **FIFO en suggestion.** `present()` devient calcul d'eligibles + `tete` proposée, jamais imposee. Pourquoi : choix joueur sur carte. Alternative rejetee : garder avance auto avec exception HOME, illisible.
- **HOME compositionnel.** `global.screen` reste, mais HOME-carte nominal documente + regle anti-fuite (etape sans `content` propre n'herite pas d'une carte globale). Pourquoi : evite nouveau champ schema en phase 1. Alternative differee : `homeScreen` separe si fuite confirmee a l'usage.
- **Decouverte != activation != vue.** Non decouvert = invisible/jamais ouvrable ; LOCKED decouvert = apercu titre ; UNLOCKED = jouable ; COMPLETED = relecture/rejeu. Pourquoi : garde `ON_CLUE`/`ON_ITEM` etanches.

## Risks / Trade-offs

- [Suppression ACTIVE : 28+ appelants, 10 specs] → Migration par etape : specs d'abord, alias deprecie `ACTIVE=UNLOCKED affiche` une version, puis suppression code + tests.
- [Valider en grace contourne verrous] → Mitigation : flag `hors-delai` obligatoire, stats separees, validation C2 inchangée sur structure.
- [Abandon budgete mal compris] → Mitigation : libelle bouton explicite, apercu gratuit, undo simu Studio.
- [Carte sans GEOFENCE] → Mitigation phase 1 : pas de marqueur sans GEOFENCE outdoor / `position` indoor ; source unique `node.location` differee en phase 2.
- [Simu reference sans player ecran] → Mitigation : PlayerShell partage, jeu de test 2 points bloquant avant autres evolutions.

## Migration Plan

1. Specs delta + jeu de test fige (bloquant).
2. Moteur pur KMP/TS : 3 etats, snapshot, Valider/Abandon, hors-delai, replay/effets.
3. PlayerShell + simu Studio (Apercu/Terminal/Accueil) sur meme shell, badge SIMULE conserve.
4. PWA puis natif sur shell, parite tests.
5. Alias ACTIVE deprecie puis suppression, validateurs et docs a jour.
6. Rollback : si blocage, garder alias ACTIVE une version, sans avance auto.

## Open Questions

- Nom exact du type event `ABANDON` dans le vocabulaire SQLite (sans changer la forme stockee).
- Duree de l'alias ACTIVE (1 version proposee).
- Faut-il `homeScreen` separe si l'anti-fuite s'avere insuffisante a l'usage.
