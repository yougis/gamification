Principe cardinal (au-dessus de tout) : le Studio produit exactement le même JSON que le runtime consomme, validé des deux côtés par le même schéma. Rien ne sort sans validation couches 1+2. Tout le reste en découle.
Hiérarchie des fonctionnalités
P0 — Garanties inviolables (transverses, tout bloque dessus)
- État immutable avec undo/redo ; aucun état visuel sans équivalent JSON.
- draft injouable hors mode animateur ; holdMode != none exige reviewed.
- Import/export 100 % locaux, zéro réseau.
P1 — Composer le jeu (le cœur)
- Canvas graphe : nœuds déplaçables, arêtes = activation, icônes par type de condition.
- Formulaires dynamiques générés depuis le registre de modules (la logique graphe reste découplée des formulaires de mini-jeux).
- Par nœud : module, activation, latch/rejeu, discovery, effects, inventoryRef.
- Objets/inventaire (addObject, setObjects).
- Configuration globale : navigationModel, presentation, experienceStyle (preset + 7 dimensions), branding typé, gameMode, difficulty, holdMode/holdExit, GPS/carte.
- Opérations MCP : composeNodes, setActivation, setDiscovery/Effects/InventoryRef, setNavigationModel/Presentation/ExperienceStyle/Branding/GameMode/Difficulty, setHoldMode/Exit, addSecoursCode, registerAsset.
P2 — Importer un jeu existant
- Sélecteur de fichier + glisser-déposer + historique local des imports.
- À l'import : validation automatique, jeu chargé comme s'il avait été créé de zéro (même état, même chaîne undo/redo/export).
P3 — Relire (validation humaine)
- Par étape/asset : providerId, licence, sourceUrl, statut draft|reviewed|published + reviewedBy.
- Overlay de relecture (source + données module, ex. polygones 7-erreurs) avant passage en reviewed.
P4 — Valider (automatique, double couche)
- C1 AJV Draft-07 (forme) puis C2 applicative (cycles, atteignabilité isEnding, topo pools, AND-exclusif, cohérence HOLD/needsLock, objets/indices référencés, consumable), verdicts séparés.
- Nœud fautif surligné ; export refusé tant que ça échoue.
P5 — Prévisualiser (simulateur traçé)
- Pas-à-pas, bypass capteurs, forceDraw par branche, injection sessionId, forceHoldLock/Exit.
- Chaque event simulé porte le flag triche (+ holdMode) ; le preview ne modifie jamais le JSON source.
- Fixture neutre 1/5→FIN rejouable en un clic (non-régression).
P6 — Exporter (pack offline)
- game.json + manifest {path, version, size, sha256} par fichier ; refusé si invalide ou si un nœud est draft (hors animateur).
P7 — Transverses
- i18n par clés + glossaire verrouillé (locked jamais écrasé).
- Difficultés/modes = overrides, jamais duplication du graphe ; HOLD = mode système, pas un override.
Interactions entre elles
                        +---------------------+
                        |       COMPOSER      |
                        | canvas + formulaires|
                        | + config globale    |
                        +--^------+-------+---+
                           |      |       |
              import/drag  |      | valide|  lit l'etat
              (meme etat)  |      v       v
  +----------+    +--------+------+  +----+-----+
  | IMPORTER +--->+      VALIDER  <---+  PREVUE  |
  +----------+    +--------+------+  +----------+
                             | bloque   flag triche, zero ecriture JSON
                             v
  +----------+ statut +------+-------+
  | RELIRE   +------->+   EXPORTER   |
  +----------+ draft  +--------------+---+
     bloque        bloque      | pack offline (manifest SHA-256)
                               v
                        +------+-------+
                        | Player (QR / |
                        | lien/fichier)|
                        +--------------+
Les chaînes qui comptent :
1. Chaîne bloquante : COMPOSER → VALIDER → EXPORTER. Chaque modification garantit un export conforme ou pas d'export du tout. L'import rejoint cette chaîne au même point que la création (pas de régime spécial).
2. Chaîne humaine : RELIRE → EXPORTER. Le validateur automatique ne suffit jamais : un nœud draft bloque la sortie, et le kiosque HOLD exige un jeu reviewed (le runtime joueur refuse un pack draft en HOLD même en mode animateur).
3. Boucle de test : PREVUE lit l'état du compositeur, simule tout (y compris HOLD), et n'écrit que dans le simulateur. C'est ce qui rend la fixture neutre rejouable comme non-régression.
4. Contraintes descendantes : la config globale contraint la composition — un module needsLock exige holdMode != none, les presentationNeeds/experienceNeeds du registre sont vérifiés contre presentation/experienceStyle. Le registre pilote les formulaires, les formulaires pilotent le canvas, le canvas pilote la validation.
5. Jamais de duplication : difficultés, modes, traductions et presets (experienceStyle.preset) sont des couches par-dessus le graphe, jamais des copies du graphe.
Point de vigilance que la synthèse révèle : le Studio a aujourd'hui deux portes de sortie (exportPack historique et exportPackFull avec validation objets/indices) — il faudra décider laquelle est la voie officielle, sinon la garantie P0 fuit par la seconde porte.
Ça te semble fidèle et complet comme périmètre ? Si oui, je peux le figer en proposition de change (par ex. studio-onepage-spec) avec ce texte comme base de proposal.md — dis-moi et je te décrirai exactement ce que je créerais avant de le faire.