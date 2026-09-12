## Context

Voir `proposal.md` (Why) pour la motivation. Contraintes : offline-first
natif strict, graphe generique multi-createurs, socle resserre (diete
`600/610/620/630/640`), cas reference 5 POI 1-tire→FIN.

## Goals / Non-Goals

**Goals:**

- Donner a `100` un modele sans ambiguite : activation par noeud, etats + latch,
  POOL router ensemence, terminaison verifiable, registre extensible, double
  validation.
- Rendre l'orchestrateur implementable deux fois sans divergence (file ACTIVE,
  cycles/reentry, persistance tirages, triche tracee).
- Reserver `CONDITIONAL`/`WINDOW` et futurs modules sans breaking change.

**Non-Goals:**

- Le schema Draft-07 detaille (c'est `100`), les rendus de modules, le packaging
  natif, le sync P2P/serveur, le branding fin, l'i18n fin, `WINDOW onMiss`,
  le gamebook, l'a11y/batterie/tests (roadmap, voir proposal).

## Decisions

- **Activation portee par le Noeud, pas d'objet Lien isole.** Pourquoi : le fan-in
  ET/OU et le latch se lisent en un point, une seule source de verite par noeud.
  Alternative rejetee : aretes typées (un type par lien) — inexpressive pour AND
  multi-sources et source de double ecriture rayon/predicat.
- **`UNLOCKED` vs `ACTIVE` + 1 modale + file.** Pourquoi : empeche l'empilement de
  modales quand 2 geofences sont vraies et distingue eligible de presente
  (auto env vs choix graphe). Alternative rejetee : activation directe en modale —
  non deterministe sur le terrain.
- **`latch` par noeud + `ACTIVE` qui latche toujours.** Pourquoi : couvre les deux
  usages valides (sas qui se referme vs POI qui reste) sans fermer le quiz ouvert
  pour 3 m de jitter. Seules GEOFENCE/WINDOW revocables, le reste est monotone.
  Hysteresis (rayon/delai sortie distincts) obligatoire contre le flapping ;
  valeurs numeriques figees en `100`, pas ici.
- **`allowCycle` (arete, construction) separe de `onReentry` (noeud, execution)
  + rejeu borne.** Pourquoi : un retour physique en geofence n'est pas un cycle
  logique ; le farming de score gamebook exige `maxReentries` + `scoreOnReplay:false`.
  Alternative rejetee : un seul flag rejeu — confond topologie et terrain.
- **POOL routeur ensemence, jamais trigger d'arete.** Pourquoi : testable
  (`seed`/`forceDraw`), rejouable, auditable (`randomDraws[sessionId][pool]`),
  persistance immediate anti-desync relaunch. `ON_GAME_START` en ordre topo,
  interdictions boot et candidats uniques : sinon tirages fantomes ou exclusifs
  inatteignables. Sans remise au socle car la remise n'a pas de sens sur des
  noeuds.
- **Reserves `CONDITIONAL`/`WINDOW` dans l'enum, ignorees gracieusement en v0.**
  Pourquoi : evite le breaking change v1 sans payer la spec `onMiss`/recurrence
  ni le solveur gamebook maintenant.
- **Registre + sous-schemas versionnes, type inconnu non bloquant.** Pourquoi :
  Un futur type ne touche pas Noeuds/Liens ; un vieux moteur lit un vieux Jeu
  a l'identique. Alternative rejetee : enum fermee de 4-5 types — casse a chaque
  ajout, contredit le principe plateforme.
- **Double validation Draft-07 puis applicative.** Pourquoi : Draft-07 ne sait
  pas comparer deux champs (`drawCount<=len`), ni detecter un cycle, ni prouver
  l'atteignabilite. L'applicative porte cycles, terminaison sous hypothese env
  favorable, topo pools, unicite, AND-exclusif direct documente comme limite
  volontaire (pas de solveur SAT au socle).
- **Boussole service + modules consommateurs.** Pourquoi : guidance fleche POI
  non bloquante + enigme qui valide en interne partagent le meme flux heading
  sans que l'orchestrateur voie un cap ; le jeu survit aux interferences.
  Alternative rejetee : condition `HEADING` dans le graphe — couplerait
  l'orchestrateur au bruit capteur.
- **GPX display seule + Alpha→polygones au build.** Pourquoi : la trace pose les
  POI cote auteur puis n'est qu'une polyline jolie ; les polygones % alle­gent le
  player et absorbent le responsive + gants via dilatation. Le brut (XML, masque)
  ne part jamais sur le terrain.
- **Triche/preview = un seul bypass, deux entrees, flag score.** Pourquoi : meme
  mecanisme (`GEOFENCE` force, `forceDraw`, auto-validation Quiz) pilote in-app
  ou Studio ; le flag evite de polluer un tournoi avec un parcours test.

## Risks / Trade-offs

- [Jitter GPS → flapping LOCKED/UNLOCKED en `latch:false`] → Mitigation : hysteresis
  entree/sortie + dwell obligatoires, valeurs en `100`, file evincee a la retombee.
- [AND sur branches exclusives au-dela du cas direct non detecte] → Mitigation :
  limite documentee + consigne convergences peu profondes ; solveur complet hors socle.
- [Pools `ON_GAME_START` dependants mal ordonnes] → Mitigation : topo + rejets
  explicites, persistance par session.
- [Hote du preview Studio a trancher (web-mock vs build dev)] → Mitigation : meme bypass,
  hote renvoye en `610`, semantique inchangee.
- [`WINDOW`/`CONDITIONAL` lus comme actifs par un moteur tiers] → Mitigation :
  ignore gracieux documente + Studio qui ne les emet pas au socle.
- [Quiz perdu par sortie de zone] → Mitigation : `ACTIVE` latche, seule la file
  suit le latch.

## Migration Plan

Greenfield : aucune migration, aucun rollback de donnees.
Deploiement = archiver ce change puis ecrire `100` contre ces regles.

## Open Questions

- Politique d'ordre de la file `UNLOCKED` (FIFO vs priorite env/graphe) : a figer
  en `100` sans changer les specs 000 (l'existence de la file est acquise, seul
  l'ordre reste a trancher).
- Hote du preview Studio (web-mock semantique identique vs build dev) : renvoye en
  `610`, mecanisme de bypass inchange.
