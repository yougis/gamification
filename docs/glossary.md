# Glossaire GeoPlay — définitions pour débutants

Ce glossaire explique les termes techniques du framework GeoPlay en langage simple. Il couvre la création de jeux, le développement et l'architecture applicative.

---

## Général

| Terme | Définition |
|-------|------------|
| **GeoPlay** | Un framework de jeux géolocalisés 100 % offline pour iOS et Android. C'est une "usine à jeux" : on peut créer plein de jeux différents avec les mêmes outils. |
| **Pack de Jeu** | Un fichier compressé (comme une valise) qui contient tout ce qu'il faut pour jouer : le graphe du jeu, les questions, les cartes, les images. Il se télécharge une fois puis fonctionne sans réseau. |
| **Offline-first** | Le jeu fonctionne sans internet. Tout est déjà téléchargé sur le téléphone du joueur. Le réseau ne sert qu'au départ pour télécharger le pack. |
| **Manifest** | Une liste qui décrit chaque fichier du pack : son nom, sa version, sa taille et son empreinte numérique (SHA-256). C'est la "carte d'identité" du pack qui permet de vérifier qu'il n'a pas été modifié ou corrompu. |
| **SHA-256** | Une empreinte numérique unique pour un fichier. Comme une signature digitale : deux fichiers identiques ont la même empreinte, un fichier modifié a une empreinte différente. |
| **Différentiel** | Technique qui ne télécharge que les fichiers qui ont changé lors d'une mise à jour, plutôt que de tout re-télécharger. |
| **Background download** | Téléchargement qui continue même si l'application passe en arrière-plan. |

---

## Création de jeux (Studio)

| Terme | Définition |
|-------|------------|
| **Studio** | L'éditeur visuel où le créateur compose le jeu en glissant-déposant des éléments. Pas besoin d'écrire du code. |
| **Canvas** | La zone de travail du Studio, comme une grande feuille blanche où on place les éléments du jeu. |
| **Graphe** | Le plan du jeu, représenté sous forme de nœuds reliés par des flèches. Il montre le parcours du joueur du début à la fin. |
| **Nœud (Node)** | Une étape du jeu. Chaque nœud est un endroit où le joueur peut se trouver (ex. "Quiz sur l'histoire", "Question de boussole"). |
| **Arête d'activation** | Une flèche entre deux nœuds qui montre comment le joueur passe d'une étape à l'autre. C'est la condition qui débloque le nœud suivant. |
| **Condition d'activation** | Ce qui doit se passer pour qu'un nœud devient accessible (ex. "être dans la zone GPS", "avoir répondu au quiz précédent", "avoir attendu 30 secondes"). |
| **Prérequis (`requires`)** | La liste des conditions qui doivent être remplies pour débloquer un nœud. |
| **Opérateur (`operator`)** | La façon de combiner les prérequis : `AND` (toutes les conditions doivent être remplies) ou `OR` (au moins une condition suffit). |
| **Nœud de fin (`isEnding`)** | Le nœud qui marque la fin du jeu. Dès qu'il est complété, la partie est terminée. |
| **Pool (`RANDOM_POOL`)** | Un ensemble de candidats parmi lesquels le jeu en choisit un au hasard. Ex : "5 questions possibles, en choisir 1". |
| **Candidat** | Un nœud qui peut être sélectionné par un pool. Le pool en tire un, et seul ce candidat devient accessible. |
| **Tirage (`draw`)** | L'action de sélectionner un candidat au hasard dans un pool. C'est comme tirer au sort une carte. |
| **Tirage sans remise** | Un candidat déjà tiré ne peut pas être retiré. Chaque tirage est unique. |
| **Session** | Une partie de jeu. Elle a un identifiant unique (`sessionId`). Si le joueur recommence exactement la même partie, on utilise le même `sessionId`. Si c'est une nouvelle partie, on change de `sessionId`. |
| **Flag triche** | Une marque automatique ajoutée à chaque événement quand le créateur ou l'animateur utilise un mode de test (bypass GPS, réponse automatique, tirage forcé). Cela permet de distinguer un parcours "normal" d'un parcours "testé". |
| **Statut (draft/reviewed/published)** | L'état d'avancement du jeu : `draft` (en cours, pas jouable par les joueurs), `reviewed` (validé, prêt), `published` (publié, diffusé). |
| **Fixture** | Un exemple de jeu prêt à l'emploi utilisé comme référence pour vérifier que tout fonctionne toujours (non-régression). |
| **Export** | L'action de générer le pack final (JSON + manifest + assets) prêt à être distribué aux joueurs. |

---

## Conditions et déclencheurs

| Terme | Définition |
|-------|------------|
| **GEOFENCE (Géorepère)** | Une zone circulaire virtuelle sur une carte. Quand le joueur entre dans cette zone (défini par latitude, longitude et rayon), cela déclenche une action. Ex : "quand le joueur arrive devant le musée". |
| **Rayon (`radiusMeters`)** | La taille de la zone GEOFENCE en mètres. |
| **Prédicat (`predicate`)** | Le type de déclenchement GEOFENCE : `enter` (entrer), `exit` (sortir), `dwell` (rester dans la zone), `through` (traverser le corridor). |
| **Dwell (`dwellMs`)** | Le temps minimum que le joueur doit rester dans une zone GEOFENCE pour que la condition soit remplie. Empêche de déclencher juste en passant vite (comme en voiture). |
| **Hystérésis** | Un tampon de sécurité qui empêche le nœud de se verrouiller/déverrouiller constamment si le joueur est au bord de la zone. |
| **TIMER (Minuterie)** | Une condition basée sur le temps. Ex : "ce nœud devient accessible 30 minutes après le début du jeu". Ce n'est pas une échéance mais un délai minimum. |
| **NODE_COMPLETED** | Condition qui dit "ce nœud devient accessible quand un autre nœud spécifique a été complété". |
| **POOL_DRAWN** | Condition qui dit "ce nœud devient accessible quand un candidat a été tiré du pool spécifique". |
| **PROXIMITY_MASTER (Maître de proximité)** | Une condition basée sur la proximité physique d'un appareil (téléphone de l'animateur, Arduino BLE). Remplace le GPS dans les endroits sans signal GPS (grottes, intérieurs). |
| **WINDOW (Fenêtre)** | Une condition basée sur une plage horaire absolue (ex : "uniquement entre 10h et 18h"). |
| **CONDITIONAL (Conditionnel)** | Une condition de branchement basée sur la réponse du joueur (ex : "si le joueur a répondu correctement, aller à la branche A"). |
| **Hypothèse d'environnement favorable** | Le validateur du jeu suppose que les conditions (GEOFENCE, TIMER) peuvent devenir vraies, sans jamais prouver qu'elles le seront effectivement en situation réelle. |

---

## Machine à états

| Terme | Définition |
|-------|------------|
| **Machine à états** | Un système qui fait passer un nœud par des étapes définies dans un ordre précis. |
| **LOCKED (Verrouillé)** | Le nœud existe mais n'est pas accessible. Les conditions ne sont pas encore remplies. |
| **UNLOCKED (Déverrouillé)** | Les conditions sont remplies, le nœud est prêt à être présenté au joueur. |
| **ACTIVE (Actif)** | Le nœud est présenté au joueur (la modale est ouverte). Un seul nœud ACTIF à la fois maximum. |
| **COMPLETED (Complété)** | Le nœud a été fini par le joueur. |
| **Latch** | Un verrou qui retient le nœud en état UNLOCKED une fois qu'il est déverrouillé, même si la condition redevient fausse. Par défaut, `latch` vaut `true` (le nœud reste déverrouillé). Si `latch` vaut `false`, le nœud revient à LOCKED si on quitte la zone. |
| **OnReentry** | Ce qui se passe quand le joueur revient à un nœud déjà complété : `ignore` (ne rien faire) ou `replay` (rejouer, avec une limite de `maxReentries`). |
| **File FIFO** | Une file d'attente "Premier Entré, Premier Sorti". Si plusieurs nœuds deviennent accessibles en même temps, ils attendent dans l'ordre. |
| **Modale unique** | Un seul écran/question est présenté au joueur à la fois. Même si 2 nœuds deviennent accessibles simultanément, le joueur ne voit qu'un seul écran. |

---

## Modules et mini-jeux

| Terme | Définition |
|-------|------------|
| **Module** | Un type de mini-jeu intégré dans un nœud. C'est ce que le joueur fait concrètement (répondre à un quiz, trouver une différence, résoudre un puzzle). |
| **QUIZ** | Un quiz avec des questions, des choix multiples, et une réponse correcte. Peut avoir un temps limite. |
| **DIFFERENCE_GAME** | Un jeu de "7 erreurs" : trouver les différences entre deux images (source et version modifiée). Les zones sont exprimées en pourcentage pour être responsives. |
| **PUZZLE** | Un jeu de puzzle : une image découpée à réassembler. Jouable au tactile et au clavier. |
| **AR_MARKER** | Un jeu de Réalité Augmentée : le joueur pointe la caméra vers un marqueur pour voir un modèle 3D. Toujours avec un fallback 2D si la caméra ne fonctionne pas. |
| **BOUSSOLE** | Un jeu utilisant la boussole du téléphone (heading nord vrai). Valide en interne avec une tolérance et une stabilisation. |
| **Fallback (Secours)** | Une alternative quand le matériel manque (pas de caméra, pas de boussole). Ex : un quiz en 2D au lieu de l'AR. |
| **Besoin (`needs`)** | Un indicateur du module qui dit ce dont il a besoin pour fonctionner : `needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock` (nécessite le mode HOLD kiosque). |
| **touchDilatation** | Une zone tactile agrandie (minimum 44 px) autour d'une cible pour faciliter le tap au doigt ou avec des gants. |
| **Sous-schéma** | La définition JSON spécifique à un type de module. Chaque module a son propre sous-schéma dans le registre. |
| **Registre de modules** | La liste de tous les types de modules disponibles. Ajouter un module = ajouter une entrée au registre sans toucher au reste du système. |

---

## Modes système

| Terme | Définition |
|-------|------------|
| **Mode normal (`none`)** | Le jeu fonctionne comme d'habitude, sans restriction. |
| **Mode triche/test** | Mode pour le créateur ou l'animateur pour tester le jeu. Permet de bypasser les conditions (GEOFENCE, réponses automatiques, tirage forcé). Chaque action est marquée "triche". |
| **Preview Studio** | Le simulateur pas-à-pas du Studio pour tester le jeu avant de le publier. |
| **HOLD (Verrouillage kiosque)** | Un mode où le téléphone est verrouillé par le système d'exploitation (iOS Guided Access, Android Screen Pinning/Lock Task). Le joueur ne peut pas quitter l'application, accéder aux paramètres ou ouvrir d'autres apps. |
| **guidedAccess** | Mode de verrouillage iOS (Guided Access). |
| **screenPinning** | Mode de verrouillage d'écran Android. |
| **lockTask** | Mode Lock Task Android (verrouillage complet de l'application). |
| **holdExit** | La configuration pour sortir du mode HOLD (le code PIN, le geste, le QR code de l'animateur). |
| **Animateur** | La personne qui gère la session sur le terrain (installe le pack, sort le jeu du mode HOLD, gère la flotte). |
| **BYOD (Bring Your Own Device)** | Quand les joueurs utilisent leur propre téléphone. HOLD kiosque n'est pas compatible BYOD — c'est pour les tablettes dédiées fournies par l'animateur. |

---

## Architecture technique

| Terme | Définition |
|-------|------------|
| **Orchestrateur** | Le "cerveau" du jeu qui évalue en continu les conditions d'activation, décide quels nœuds afficher, et gère la file d'attente. |
| **Boucle d'évaluation** | Le processus continu qui vérifie les conditions (position GPS, temps, graphe) et met à jour les états des nœuds. |
| **Ordre topologique** | L'ordre dans lequel les éléments doivent être traités en respectant leurs dépendances. Ex : on ne peut pas tirer du pool B si le pool A n'a pas encore été tiré. |
| **Moteur de runtime** | Le programme qui exécute le jeu en temps réel sur le téléphone du joueur (gestion des capteurs, états, affichage). |
| **SQLite** | Une base de données légère intégrée dans l'application. Elle stocke la progression, les tirages et le journal d'événements. |
| **Persistance** | Le fait de sauvegarder les données immédiatement (écriture à chaque changement) pour ne rien perdre en cas de crash ou de fermeture de l'application. |
| **Journal (events)** | L'historique de tout ce qui se passe pendant une partie : démarrage, pause, reprise, fin, verrouillage/déverrouillage, sortie. |
| **MCP (Model Context Protocol)** | Un protocole qui permet au Studio de communiquer avec le système de validation et d'export. C'est comme un "langage commun" entre le Studio et le moteur. |
| **AJV** | Un validateur JSON qui vérifie que les fichiers respectent le schéma défini. |
| **Schéma de validation (JSON Schema)** | La règle qui décrit exactement à quoi doit ressembler un fichier de jeu JSON (quels champs, quels types, quelles contraintes). |
| **Couche 1 (forme locale)** | La vérification que le JSON est bien formé (champs présents, types corrects, contraintes respectées). |
| **Couche 2 (applicable)** | La vérification que le jeu est logiquement cohérent (pas de cycles impossibles, chaque branche mène à une fin, pas de tirage impossible). |
| **Atteignabilité** | La vérification qu'il existe au moins un chemin pour aller du début du jeu à la fin, en supposant que les conditions (GEOFENCE, TIMER) peuvent être remplies. |
| **Cycle** | Une boucle dans le graphe où un nœud A dépend de B et B dépend de A. Normalement interdit car le jeu ne pourrait jamais démarrer. |
| **allowCycle** | Une exception qui autorise un cycle dans un cas très précis (ex : une salle du sage où le joueur revient). |
| **AND-exclusif** | Quand deux candidats d'un même pool sont demandés par un nœud `AND` en même temps — c'est impossible car un seul candidat est tiré. |
| **Kotlin** | Le langage de programmation utilisé pour l'application native (iOS + Android). |
| **TypeScript** | Le langage de programmation utilisé pour le Studio et son serveur MCP. |
| **MapLibre** | La bibliothèque de carte utilisée pour afficher la carte du jeu en offline. Différente de Google Maps ou Mapbox. |
| **GPX** | Un format de fichier qui stocke une trace GPS (la trace de parcours affichée sur la carte). |
| **Fallback image** | Une image statique affichée quand les tuiles de carte ne sont pas disponibles (ex : en grotte). |
| **Haptique** | Une vibration du téléphone utilisée pour guider le joueur (ex : une pulsation quand le joueur est proche du POI). |
| **Heading nord vrai** | La direction vers le nord géographique (pas le nord magnétique), utilisée par la boussole pour indiquer la direction du POI. |
| **Accuracy (précision GPS)** | La qualité de la position GPS. Une accuracy de 5 mètres signifie que le joueur est à 5 mètres près de sa position réelle. |
| **Gating** | Le filtrage des données selon des critères définis dans le JSON (accuracy, temps de séjour, distance). |

---

## Outils et processus

| Terme | Définition |
|-------|------------|
| **OpenSpec** | Un outil qui gère les spécifications du projet. Il permet de proposer, suivre et valider des changements de manière structurée. |
| **Change** | Une modification proposée dans le cadre du projet OpenSpec (ex : "change 710" pour le mode HOLD). |
| **Spec** | Une spécification détaillée qui décrit un aspect du système (les règles, les scénarios, les conditions). |
| **Non-régression** | Le fait qu'une modification ne casse pas ce qui fonctionnait déjà. On teste toujours la "fixture neutre" (jeu exemple 5 POI) pour s'assurer que tout fonctionne toujours. |
| **Validation** | Le processus de vérification d'un jeu avant publication. Il passe en deux couches (forme + logique). |
| **Différenciation** | La comparaison entre deux versions d'un fichier pour ne télécharger que les parties modifiées. |
| **Checksum** | Synonyme d'empreminte numérique (SHA-256). |

---

## Raccourcis et abréviations

| Abréviation | Signification |
|-------------|---------------|
| **API** | Application Programming Interface — une interface de programmation |
| **GPS** | Global Positioning System — système de positionnement par satellite |
| **AR** | Augmented Reality — Réalité Augmentée |
| **QR** | Quick Response — Code-barres carré lu par la caméra |
| **POI** | Point of Interest — Point d'intérêt |
| **UI** | User Interface — Interface utilisateur |
| **UX** | User Experience — Expérience utilisateur |
| **BYOD** | Bring Your Own Device — Apportez votre propre appareil |
| **SHA** | Secure Hash Algorithm — Algorithme de hachage sécurisé |
| **JSON** | JavaScript Object Notation — Format de données textuelles léger |
| **SQLite** | Light-weight Database — Base de données légère intégrée |
| **Kotlin** | Language de programmation JVM moderne |
| **TypeScript** | JavaScript typé pour le développement d'applications |
| **iOS** | Système d'exploitation d'Apple (iPhone/iPad) |
| **Android** | Système d'exploitation de Google |
| **CLI** | Command Line Interface — Interface en ligne de commande |
| **MCP** | Model Context Protocol — Protocole de contexte de modèle |
| **AJV** | Another JSON Validator — Validateur JSON |
| **SQL** | Structured Query Language — Langage de requêtage de bases de données |
| **GPX** | GPS Exchange Format — Format de fichier de trace GPS |
| **BLE** | Bluetooth Low Energy — Bluetooth à basse consommation |
| **WiFi** | Wireless Fidelity — Réseau sans fil |
