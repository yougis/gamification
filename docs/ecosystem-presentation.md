# L'écosystème GeoPlay — tout ce que vous pouvez créer

**Bienvenue dans GeoPlay !**

GeoPlay est une **usine à jeux**. Pas "un" jeu, mais une plateforme complète qui vous permet de créer n'importe quel jeu géolocalisé — en extérieur, en intérieur, dans une grotte ou sur un campus — et de le faire jouer **sans internet**, une fois le pack téléchargé.

Ce document vous présente ce que l'outil met à votre disposition, dans un langage simple. Chaque concept est expliqué avec des exemples concrets.

---

## 1. L'idée : vous créez, le joueur explore

Imaginez que vous voulez créer un jeu de piste dans un parc municipal. Vous savez où se trouvent les étapes (un monument, un arbre, une fontaine). Vous voulez que les joueurs se déplacent, répondent à des questions, cherchent des objets cachés — et que tout fonctionne sans qu'ils aient besoin de réseau une fois sur place.

**GeoPlay rend cela possible.**

Vous ne touchez pas au code. Vous utilisez le **Studio**, un éditeur visuel où vous composez votre jeu en glissant des éléments sur un écran, comme on assemble des pièces de puzzle.

---

## 2. Ce que le créateur peut faire

### 2.1 Composer un jeu visuellement

Dans le Studio, vous travaillez sur un **canvas** (un grand espace de travail). Votre jeu est représenté comme un **graphe** — un ensemble de boîtes (les **nœuds**) reliées par des flèches (les **connexions d'activation**).

```
Début → Tirez au sort un POI → Jouez le POI → Fin
```

Chaque boîte représente une étape du jeu. Vous la définissez en lui choisissant un **module** (le type d'activité) et des **conditions** (ce qui doit se passer pour que cette étape devienne accessible).

### 2.2 Choisir parmi plusieurs modules

Le Studio propose 5 types de modules :

| Module | Description | Quand l'utiliser |
|--------|-------------|-----------------|
| **Quiz** | Des questions avec réponses à choix multiples | Tester les connaissances |
| **Différence** | Trouver les différences entre deux images | Jeu d'observation |
| **Puzzle** | Une image à découper et réassembler | Jeu de logique |
| **Réalité Augmentée (AR)** | Pointer la caméra vers un marqueur pour voir un modèle 3D | Expérience immersive |
| **Boussole** | Utiliser le nord magnétique du téléphone pour guider vers un POI | Navigation physique |

Chaque module peut être personnalisé : nombre de questions, temps limite, degré de difficulté, et bien plus.

### 2.3 Définir des conditions d'activation

Comment un nœud devient-il accessible ? Vous définissez des **conditions** :

- **Zone géographique (Géorepère)** : "Devient accessible quand le joueur est à moins de 100 mètres de ce point"
- **Temps** : "Devient accessible 30 minutes après le début du jeu"
- **Tirage au sort** : "Le jeu choisit au hasard un POI parmi 5 candidats"
- **Complétion d'une étape précédente** : "Devient accessible après avoir terminé le quiz précédent"
- **Proximité physique** : "Quand un appareil de l'animateur est à portée" (pour les zones sans GPS)

Vous pouvez combiner ces conditions avec **ET** (toutes doivent être vraies) ou **OU** (au moins une suffit).

### 2.4 Configurer la carte et le branding

Le jeu inclut toujours une **carte** affichant la position du joueur et les étapes à atteindre. Vous pouvez configurer :

- Le **fournisseur de carte** (MapLibre, fonctionne en offline)
- La **zone visible** (latitude/longitude et niveau de zoom)
- Le **fond de carte** : tuiles normales ou fond uni si les tuiles sont indisponibles
- Le **branding** : logos, couleurs, et informations affichées dans le jeu

### 2.5 Gérer les modes de jeu

GeoPlay propose plusieurs modes qui modifient le comportement du jeu :

| Mode | Description | Quand l'utiliser |
|------|------------|-----------------|
| **Normal** | Le jeu fonctionne standard | Partie ordinaire |
| **Triche/Test** | Contourner les conditions pour tester le jeu | Pendant la création |
| **Preview Studio** | Simuler le jeu étape par étape dans le Studio | Avant publication |
| **HOLD Kiosque** | Le téléphone est verrouillé — le joueur ne peut pas quitter le jeu | Flotte dédiée, événements publics |

---

## 3. Comment ça marche — le graphique du jeu

### 3.1 Les quatre états d'une étape

Chaque étape du jeu passe par 4 états, comme une porte qui s'ouvre progressivement :

```
🔒 Verrouillé → 🔓 Déverrouillé → ✅ Actif → 🏁 Complété
```

- **Verrouillé** : L'étape existe mais n'est pas encore accessible. Le joueur ne la voit pas.
- **Déverrouillé** : Les conditions sont remplies. L'étape est prête à être jouée.
- **Actif** : Le joueur voit l'écran de jeu (la modale). Une seule étape est affichée à la fois.
- **Complété** : Le joueur a fini l'étape. On passe à la suivante.

### 3.2 Le tirage au sort

Imaginez que vous vouliez 5 lieux différents dans votre jeu, mais que chaque joueur ne joue qu'un seul parcours (différent à chaque fois). Vous utilisez un **tirage au sort** :

1. Vous définissez 5 candidats (5 lieux possibles)
2. Quand le joueur arrive à l'étape du tirage, le jeu en choisit **un seul au hasard**
3. Le joueur joue ce POI précis, les autres restent invisibles
4. Chaque joueur a une expérience unique

Le tirage est **persisté** (mémorisé immédiatement). Si le joueur ferme l'application et la rouvre, le même tirage est relu — pas de re-tirage.

### 3.3 La file d'attente

Quand deux étapes deviennent accessibles en même temps, le joueur ne voit qu'une seule modale à la fois. L'autre attend en **file d'attente** (premier arrivé, premier servi). Quand la première est terminée, la suivante s'affiche automatiquement.

---

## 4. Les modules disponibles

### 4.1 Quiz

Un quiz classique : une question, plusieurs réponses possibles, une seule correcte. Le créateur définit :
- Le texte de la question
- Les options de réponse
- La bonne réponse
- Les points attribués
- Un temps limite (optionnel)
- L'explication donnée après la réponse

**Exemple** : "Quel monument se trouve à 200 mètres ?" → 4 choix, 1 correct.

### 4.2 Différence (7 erreurs)

Le joueur compare deux images et doit trouver les différences. Les zones de différence sont exprimées en **pourcentage** (pour s'adapter à toutes les tailles d'écran) et chaque cible est agrandie d'au moins 44 pixels pour être jouable au doigt ou avec des gants.

**Exemple** : "Trouvez les 7 différences entre le parc en été et le même parc en hiver."

### 4.3 Puzzle

Une image découpée que le joueur doit réassembler. Jouable au tactile (glisser-déposer) et au clavier. L'état de progression est sauvegardé — si le joueur quitte et revient, il retrouve sa place.

**Exemple** : "Réassemblez la carte du musée pour débloquer l'étape suivante."

### 4.4 Réalité augmentée (AR)

Le joueur pointe la caméra de son téléphone vers un marqueur physique et voit un modèle 3D apparaître. Si la caméra n'est pas disponible ou si le marqueur n'est pas détecté, le jeu bascule automatiquement sur un **mode de secours 2D** — l'étape reste complétée.

**Exemple** : "Pointez la caméra vers la plaque de rue pour voir le monument en 3D."

### 4.5 Boussole

Le téléphone indique la direction du POI via une flèche et la distance. Le module valide en interne : le joueur doit stabiliser son cap pendant un certain temps. Si le signal est interféré (métal, coque magnétique), le flèche peut être masquée mais le jeu continue avec la carte et la distance.

**Exemple** : "Tournez-vous vers le nord pour trouver le POI."

---

## 5. Les modes de jeu

### 5.1 Mode normal

Le jeu fonctionne comme conçu. Le joueur doit respecter les conditions (être dans la zone GPS, répondre au quiz, etc.) pour avancer. Chaque action est enregistrée (score, progression, événements).

### 5.2 Mode triche/test

Pendant la création, le créateur peut "tricher" pour tester son jeu :
- **Bypass Géorepère** : le jeu simule que le joueur est dans la zone (sans y être)
- **Auto-validation** : les réponses aux quiz sont validées automatiquement
- **Tirage forcé** : le créateur choisit quel POI sera tiré au sort

Chaque action de triche est **marquée** dans l'historique. Cela permet de distinguer un parcours "testé" d'un parcours "joué vraiment".

### 5.3 Preview Studio

Le simulateur pas-à-pas permet de voir exactement comment le joueur vivra le jeu, étape par étape. Le créateur peut :
- Simuler sa position GPS
- Simuler le cap de la boussole
- Forcer chaque branche du jeu
- Chaque simulation est marquée "triche"

**Mode Preview HOLD** : en plus, le créateur peut simuler le verrouillage kiosque (le téléphone bloqué) et la sortie de ce mode.

### 5.4 Mode HOLD kiosque

Pour les événements publics où le téléphone est utilisé par plusieurs personnes (festivals, expositions, parcs). Le téléphone est **verrouillé par le système d'exploitation** :
- Le joueur ne peut pas quitter l'application
- Le joueur ne peut pas accéder aux paramètres ou aux autres apps
- Seul l'animateur (avec un code PIN ou un geste spécifique) peut déverrouiller

Chaque événement de verrouillage, de sortie, et de tentative de sortie est **journalisé**.

---

## 6. Ce qui se passe en arrière-plan

### 6.1 La persistance immédiate

Tous les progrès du joueur sont sauvegardés **immédiatement** dans une base de données locale (SQLite). Il n'y a pas de "batch" (sauvegarde groupée). Si le téléphone crash ou l'application ferme, tout est intact.

- **Progression** : quelle étape le joueur a-t-il atteinte ?
- **Tirages** : quel POI a été tiré au sort ? (Relu à la reprise, pas de re-tirage)
- **Historique** : tous les événements (début, pause, reprise, fin, verrouillage, sortie)

**Reprendre une partie** : si le joueur quitte et revient avec le même identifiant de session, tout reprend exactement là où il en était. **Nouvelle partie** : un nouvel identifiant est généré, avec un tirage frais.

### 6.2 L'intégrité des fichiers

Avant qu'un pack ne soit jouable, le jeu vérifie chaque fichier :
- Chaque fichier a une **empreinte numérique** (SHA-256) dans le manifest
- Si un fichier est corrompu, seuls les fichiers corrompus sont re-téléchargés
- Si le pack est incomplet ou corrompu, **le jeu ne se lance pas** — avec un message explicite indiquant le pourcentage de progression et le fichier manquant

### 6.3 Le téléchargement progressif

Le pack est téléchargé de manière intelligente :
- **Différentiel** : seuls les fichiers qui ont changé sont re-téléchargés lors d'une mise à jour
- **Reprise** : si le téléchargement est interrompu, il reprend là où il s'est arrêté
- **Background** : le téléchargement continue même si le joueur change d'application

### 6.4 Le fonctionnement offline

Une fois le pack téléchargé, **rien ne nécessite d'internet** :
- Le jeu s'exécute entièrement hors ligne
- La carte fonctionne sans réseau (les tuiles sont pré-téléchargées)
- Le GPS fonctionne localement
- La boussole utilise les capteurs du téléphone
- Les quiz et modules fonctionnent sans réseau

Si une partie du pack est corrompue ou manquante, le jeu refuse de se lancer avec un état explicite.

---

## 7. Comment commencer

Voici les étapes pour créer votre premier jeu :

1. **Installez le Studio** : lancez le Studio (nécessite le runtime et le compilateur)
2. **Créez un nouveau jeu** : définissez un identifiant, une version, et la description
3. **Composez le graphe** : sur le canvas, ajoutez un nœud de départ, un tirage au sort, vos POI, et un nœud de fin
4. **Configurez les modules** : pour chaque POI, choisissez le type de module (Quiz, Différence, etc.) et remplissez les données
5. **Configurez la carte** : définissez la zone visible, le fournisseur de carte, le branding
6. **Configurez les modes** : choisissez si votre jeu a un mode HOLD, des options de difficulté, etc.
7. **Validez** : le Studio vérifie que le graphe est cohérent (pas de cycles impossibles, chaque branche mène à une fin)
8. **Exportez** : générez le pack (JSON + manifest SHA-256 + assets)
9. **Distribuez** : le pack peut être distribué par QR code, lien, ou fichier

---

## 8. Un exemple concret : le jeu 5 POI

Le jeu de référence montre le parcours typique :

```
Début → Tirage au sort (1 parmi 5) → Le POI choisi → Fin
```

Chacun des 5 POI a une branche différente vers la fin. Le tirage au sort sélectionne un seul parcours au hasard. Quand le joueur termine son POI (complétion), il arrive à la fin. Chaque partie est une expérience unique car le tirage est aléatoire.

Ce jeu est utilisé comme **référence** : à chaque modification du framework, ce jeu est re-testé pour s'assurer que rien n'a cassé (non-régression).

---

## 9. Aller plus loin

- **Glossaire complet** : [docs/glossary.md](glossary.md) pour comprendre chaque terme technique
- **Guide Créateur** : [docs/user/creator-guide.md](user/creator-guide.md) pour le tutoriel pas-à-pas du Studio
- **Documentation Technique** : [docs/dev/architecture.md](dev/architecture.md) pour comprendre l'architecture du moteur
- **Référence Fonctionnelle** : [docs/maintainer/functional-reference.md](maintainer/functional-reference.md) pour la référence exhaustive de toutes les capacités
- **Feuille de route** : [ROADMAP.md](../ROADMAP.md) pour voir les changements à venir

---

*GeoPlay — La plateforme de jeux géolocalisés, 100 % offline, accessible à tous.*
