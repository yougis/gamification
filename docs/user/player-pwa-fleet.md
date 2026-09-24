# Player web (PWA) — guide flotte et animateur

La PWA GeoPlay joue les mêmes packs que le natif, sans compte Apple ni
provisioning. Ce guide couvre l'installation sur flotte d'iPad, le verrouillage
de session (repli Guided Access) et les limites à connaître avant le terrain.

## Installer sur un iPad

1. En ligne (Wi-Fi), ouvrez l'URL de la PWA dans Safari et laissez la page
   charger entièrement (mise en cache de l'app shell).
2. Partage → **Sur l'écran d'accueil** → Ajouter. L'icône GeoPlay apparaît
   comme une app plein écran.
3. Flotte supervisée (MDM) : poussez un **Web Clip** vers l'URL à la place —
   zéro manipulation par borne.
4. Importez le pack (fichier `game.json` via AirDrop/Fichiers, ou URL) puis
   jouez : tout est ensuite hors-ligne (manifest SHA-256 revérifié au
   lancement, pack partiel refusé avec le fichier nommé).

## Verrouiller une session (repli Guided Access)

Le web ne permet aucun verrouillage OS : la PWA ne prétend pas verrouiller.
Quand le jeu exige `holdMode != "none"`, appliquez la procédure :

1. Lancez la partie jusqu'à l'écran de jeu.
2. Triple-clic latéral (ou bouton principal) → **Accès guidé** → Démarrer
   (code animateur à définir avant la séance).
3. Désactivez les zones tactiles sensibles si besoin (entourez-les).
4. Fin de séance : triple-clic → code → Fin. La progression persiste
   (`sessionId` repris à la relance).

## Limites web à connaître (pas de contournement)

- **Pas de GPS en arrière-plan** : écran verrouillé ou Safari en tâche de
  fond = positions figées. Jeux concernés refusés à l'export PWA (motif
  nommé) — prévoyez des jeux « écran allumé » pour la flotte.
- **Boussole** : bouton « Activer la boussole » dans l'app (Safari exige un
  geste pour `DeviceOrientation`).
- **Stockage** : iOS peut purger le cache si le disque est plein — rouvrez
  la PWA en ligne avant chaque séance, `navigator.storage.persist()` est
  demandé mais reste indicatif.
- **HTTPS ou localhost requis** pour la géolocalisation (contexte sécurisé).
- **AR** : fallback 2D uniquement (WebXR indisponible sur iOS).
- Safari récent requis (WebAssembly GC : iOS 18+ ; vérifier `Updates` avant
  séance, un iPad trop vieux n'affichera qu'un écran vide).
