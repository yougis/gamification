# Profil Financeur / Partenaire

Ce document decrit la valeur commerciale, le modele economique, le ROI
et l'integration en borne pour le framework GeoPlay.

## Valeur commerciale

GeoPlay est une **plateforme de production de jeux geolocalises offline**
qui permet de creer des experiences immersives pour des evenements,
des musees, des attractions touristiques et des activites en plein air.

La valeur reside dans :
- La creation de jeux personnalisables sans necessite de development
  mobile couteux
- Le modele offline-first qui permet le fonctionnement en zones sans
  couverture reseau (borne, foret, musee, site historique)
- La separation entre le Studio (creation) et le Player (consommation)
  qui permet aux partenaires de deployer des jeux sans connaissances
  techniques approfondies

## Modele economique

- **Licences de creation** : le Studio est la suite d'authoring pour les
  createurs de jeux
- **Deploiement de packs** : les jeux sont packages et distribues sous forme
  de packs offline (manifest SHA-256, verification par fichier)
- **Integration en borne** : le Player peut etre installe sur des tablettes
  en borne sans compte Google ni reseau
- **Sync multi-session** : le scoring multi-session MASTER P2P permet
  des competitions en direct

## ROI pour les partenaires

- **Installation rapide** : sideload APK debug pour POC, puis Play Interne
  pour production
- **Zero maintenance infrastructure** : offline-first, SQLite local,
  pas de serveur requis apres le telechargement
- **Reprise sur incident** : le `sessionId` permet de reprendre exactement
  la meme partie apres interruption (inventaire, progression, tirages)
- **Verifiable** : manifest SHA-256 par fichier garantit l'integrite du pack

## Integration en borne

- **Tablette sans compte Google** : l'animateur installe l'APK et importe
  le pack par fichier. Le jeu tourne sans compte ni reseau.
- **Permissions justifiees** : localisation, Bluetooth, camera demandes
  dans le flux avec justification
- **Mode kiosque** : HOLD activable (`guidedAccess`, `screenPinning`,
  `lockTask`) avec sortie par PIN animateur uniquement
- **QR code** : scan du QR du pack pour import, verification offline

## Principes structurants appliques

- Le framework est generic (valable pour n'importe quel jeu cree par
  n'importe quel createur)
- Les donnees sont jamais en dur : rayons GPS, overrides, seuils, urls
  tout est dans le JSON du jeu
- Le mode HOLD est un mode systeme, pas un override de difficulte
- Le pack versionne par son manifest, jamais par l'app
