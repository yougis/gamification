# GeoPlay — Roadmap vers une plateforme utilisable

Version : 2026-10-01 — Document source pour `openspec propose` (un change par entrée du §6).

---

## 0. Décisions actées

| # | Décision | Conséquences directes |
|---|---|---|
| D1 | Un joueur peut jouer **sans compte**. | Aucun écran de login bloquant sur mobile. Jeu importable par QR/lien/fichier. Compte mobile = optionnel (accès à « Mes jeux »). |
| D2 | App mobile de base gratuite, compatible Studio. Add-ons, templates, thèmes, modules : **achat sur le « Studio Shop » web**. | Pas d'achat intégré (IAP) dans l'app. Les droits achetés suivent le **créateur**, pas le joueur (voir §3.5). **À valider juridiquement** vis-à-vis des règles Apple/Google (liens vers achats externes, 3.1.1). |
| D3 | Authentification : **Keycloak** (auto-hébergé). | Realm unique `geoplay`, OIDC + PKCE pour Studio et mobile. Opérations à prévoir : sauvegarde, mises à jour, SMTP. |
| D4 | i18n : **fichiers de langue séparés par jeu** (modèle i18n). | Le JSON de jeu ne contient plus de texte affichable, seulement des clés. Un fichier par langue dans le package. |
| D5 | Langues de départ : **français, anglais**. | `defaultLocale = fr`. Chaîne de repli : langue demandée → langue par défaut du jeu → clé brute signalée. |
| D6 | « Catalogue des jeux édités/publiés » = **store personnel du créateur accessible depuis son téléphone** : versions de jeux et packages associés. | Nécessite le backend (M3) : modèle `game` / `game_version` / `package`, gestion offline des versions installées. |
| D7 | Backend **Node.js (TypeScript)**, **PostgreSQL**, sauvegardes **Barman**. | Validateurs C1/C2/C3 en TypeScript partagés entre Studio et backend (un seul code). Barman : sauvegarde physique + archivage WAL (restauration à un instant donné) sur un serveur dédié. |
| D8 | Hébergement : **local en dev**, puis **France**, puis **Nouvelle-Calédonie** ; fournisseur indifférent (Scaleway, OVH ou AWS). | Tout est conteneurisé, aucune dépendance à un service propriétaire (S3 compatible, Postgres standard) pour rester portable. Voir §1.2. |
| D9 | **Marketplace entre créateurs : plus tard**, mais le modèle de données la prépare dès M3. | Voir §3.10 (points d'attention à intégrer maintenant). |
| D10 | **Niveau 0 = familles** : un parent crée une chasse au trésor (maison, jardin, parc) pour ses enfants. | Cible principale du produit grand public. Contraintes : petites zones, GPS peu fiable en intérieur/jardin, enfants joueurs (donc mineurs), jeux surtout privés. Voir §3.11. |
| D11 | Rétention et quotas **différenciés par abonnement** ; seuls tuiles carto, images et vidéos coûtent. | Voir §3.9. |

Principes transverses :

1. **Monolithe modulaire**, pas de microservices (hormis la génération LLM, asynchrone, en M5).
2. **Un seul schéma de jeu** pour Studio, runtime, niveau 0 et LLM.
3. **Un seul mécanisme de catalogue** (type + entitlement requis) pour templates, thèmes, widgets, modules, mises en page, objets.
4. **Offline-first conservé** : le serveur n'est jamais requis pour *jouer* un jeu déjà installé.
5. **Aucune interruption d'une partie en cours** à cause d'un droit expiré.

---

## 1. Architecture cible

```
Studio Web (React, statique/CDN)        App mobile KMP (Android/iOS)
        │  OIDC+PKCE                            │  (optionnel) OIDC+PKCE
        └──────────────┬────────────────────────┘
                       ▼
              Keycloak (realm geoplay)
                       │ JWT (rôle)
                       ▼
        Backend monolithe modulaire (API REST)
   ┌─────────┬──────────┬───────────┬──────────┬──────────┬─────────┐
   │ identity│ catalog  │ entitle-  │ games &  │ media    │ billing │
   │ (profil)│ (generic)│ ments     │ packages │          │ (M5)    │
   └─────────┴──────────┴───────────┴──────────┴──────────┴─────────┘
        │ PostgreSQL         │ Stockage objet (S3 compatible) + CDN
        └────────────────────┘
                  (M5) file de jobs → worker LLM
```

### 1.1 Responsabilités Keycloak vs backend

- **Keycloak** : identité, mot de passe, e-mail vérifié, réinitialisation, MFA optionnel, rôle de base (`level0`, `creator`, `advanced`, `admin`).
- **Backend** : entitlements (abonnements, achats), catalogues, jeux, quotas. Les entitlements **ne sont pas** dans le JWT (risque de péremption) : ils sont résolus à chaque requête (cache court, 60 s) ou embarqués dans une licence signée (§3.5).
- Clients Keycloak : `studio-web` (public, PKCE), `mobile` (public, PKCE, schéma d'URL / App Links), `backend` (resource server, bearer-only), `shop` (confidential).

### 1.2 Hébergement et exploitation

**Phases**

1. **Dev (local)** : Docker Compose complet (Keycloak, backend Node, PostgreSQL, MinIO pour le stockage objet S3, Barman en conteneur ou en simple script pour tester la restauration).
2. **Production France** (Scaleway ou OVH, AWS acceptable) : 1 VPS applicatif (Keycloak + backend + reverse proxy TLS), 1 VPS PostgreSQL, 1 serveur Barman **distinct** (idéalement chez un autre fournisseur ou dans une autre zone), stockage objet S3 compatible + CDN.
3. **Nouvelle-Calédonie** : à traiter comme une **extension de la phase 2**, pas une seconde plateforme (voir ci-dessous).

**Recommandation pour la Nouvelle-Calédonie**

- Un jeu étant joué **hors ligne**, la latence n'importe que pour le Studio, l'authentification et le téléchargement des packages. Il suffit donc d'un **point principal unique** (base, Keycloak, backend) et d'un **cache/réplica de stockage des packages** au plus près des joueurs.
- Éviter dans un premier temps deux bases actives (réplication multi-sites de PostgreSQL et de Keycloak = complexité élevée). Une base primaire + réplica de lecture/cold standby suffit.
- À vérifier avant de s'engager : quels fournisseurs ont réellement une présence en Nouvelle-Calédonie (je ne peux pas le garantir) et leurs tarifs ; sinon, la région la plus proche d'un grand fournisseur (Australie) peut servir de point intermédiaire. Vérifier aussi les obligations de localisation des données et l'applicabilité du RGPD sur le territoire.

**PostgreSQL + Barman**

- Barman en mode **archivage WAL (streaming) + sauvegarde physique** : restauration à un instant précis (PITR) possible.
- Fréquence indicative : sauvegarde complète hebdomadaire, WAL en continu, rétention 30 jours ; **test de restauration mensuel automatisé** (un backup non testé n'existe pas).
- Barman ne sauvegarde **que PostgreSQL**. Il faut en plus : réplication ou sauvegarde du stockage objet (packages, médias), export de la configuration du realm Keycloak (`kc.sh export`) versionné dans Git, et les secrets (gestionnaire de secrets).
- Keycloak peut utiliser un schéma/base séparé dans le même cluster PostgreSQL : couvert par les mêmes sauvegardes.

**Backend Node.js**

- TypeScript obligatoire (types partagés avec le Studio, validateurs C1/C2/C3 communs). Framework au choix (Fastify ou NestJS), génération OpenAPI, validation d'entrée par les schémas JSON.
- Attention : le runtime mobile (KMP) a son propre validateur. Les jeux de test partagés (M1-09) doivent aussi vérifier que **validateur TS et validateur KMP donnent les mêmes résultats**.

**Budget** : à fixer par toi ; ordre de grandeur de départ pour la phase 2 : quelques dizaines d'euros par mois pour 3 petits serveurs, auxquels s'ajoutent stockage objet et bande passante, qui deviennent le premier poste avec les vidéos et tuiles.

---

## 2. Modèle de rôles, plans et droits

### 2.1 Trois notions distinctes

| Notion | Rôle | Source |
|---|---|---|
| **Rôle** | Ce que l'utilisateur *peut faire dans l'interface* | Keycloak |
| **Plan** | Abonnement (gratuit, pro, …) donnant un lot d'entitlements | Backend (billing) |
| **Achat unitaire** | Un thème, un template, un module | Backend (billing) |

**Droit effectif = entitlements(rôle) ∪ entitlements(plan) ∪ achats actifs.**

### 2.2 Rôles

| Rôle | Interface | Capacités |
|---|---|---|
| `level0` | Assistant pas à pas (§6, N-06) | Remplit les slots d'un scénario verrouillé, widgets préconfigurés uniquement |
| `creator` | Studio complet, widgets standard | Composer libre, modules standard, templates/thèmes gratuits |
| `advanced` | Studio complet + widgets avancés | Modules avancés (AR, géofence, inventaire/recettes, etc.), JSON brut |
| `admin` | Back-office | Gestion catalogues, droits, modération |

### 2.3 Entitlement

Chaîne `type:identifiant`, avec joker possible dans les plans :

```
module:AR_MARKER      theme:noir-polar      template:escape-pro
layout:hero-split     widget:advanced.*     feature:llm.generate
quota:llm.generations/month=50   quota:games.max=20   quota:storage.mb=2048
```

Un élément de catalogue déclare `requires: ["theme:noir-polar"]` (liste, sémantique OU par défaut ; `requiresAll` pour ET). Un élément sans `requires` est public.

### 2.4 Validation C3 (nouvelle couche)

Après C1 (Draft-07) et C2 (applicatif) : **C3 = droits**. Règle : tout module, template, thème, widget, layout utilisé par le jeu doit être couvert par un entitlement du publieur. Niveaux : `erreur` à la publication, `avertissement` en édition (le créateur voit le cadenas et peut continuer à brouillonner). C3 est exécutée côté serveur (autoritaire) et côté Studio (aide UX).

---

## 3. Spécifications transverses

### 3.1 Tokens de style sémantiques (prérequis des thèmes)

Chaque couleur affichée passe par un **rôle**, jamais une valeur littérale dans les widgets.

```
color.background  color.surface  color.surfaceVariant
color.text.primary  color.text.secondary  color.text.onAccent  color.text.disabled
color.accent  color.accent.hover  color.border  color.danger  color.success
font.family.heading  font.family.body  font.size.scale  radius.sm|md|lg
spacing.unit  elevation.0..3  motion.duration.*
```

- Un thème = `{ id, version, tokens: {light:{…}, dark:{…}}, widgetVariants?, assets? }`.
- Héritage conservé : `global.theme` → `screen.theme` → widget (surcharge limitée aux tokens autorisés).
- Mode sombre = sélection de `tokens.dark` ; **aucun texte ne doit avoir de couleur codée en dur**. Règle C2 : `couleur littérale dans un widget` → avertissement ; lint Studio.
- Contrastes : validation automatique WCAG AA (ratio ≥ 4,5 pour texte normal) à la création d'un thème ; thème non conforme = avertissement.

### 3.2 Internationalisation (modèle fichiers séparés)

Structure du package de jeu :

```
game.json
i18n/
  fr.json
  en.json
media/…
manifest.json   // inclut i18n/*.json avec sha256
```

Dans `game.json` :

```json
"i18n": { "defaultLocale": "fr", "locales": ["fr", "en"] },
"nodes": [{ "id": "poi1", "title": { "$t": "node.poi1.title" } }]
```

Fichier `i18n/fr.json` :

```json
{ "node.poi1.title": "La gare", "quiz.q1.prompt": "En quelle année ?", "quiz.q1.opt.a": "1889" }
```

Règles :

- Toute chaîne affichable est un objet `{ "$t": "clé" }` (pas de chaîne littérale — C1 `additionalProperties:false` + motif).
- Convention de clés : `<domaine>.<id>.<champ>[.<sous-id>]`, stables lors du renommage d'un nœud (le Studio migre les clés).
- Pluriels/variables : format ICU MessageFormat simplifié (`{count, plural, one {# objet} other {# objets}}`, `{playerName}`).
- Médias localisés : `{ "$t": … }` peut cibler un chemin média (`media.poi1.audio` → `media/fr/…`). Repli sur le média par défaut.
- C2 : clé manquante dans une langue déclarée = **avertissement** (publication permise) ; clé manquante dans `defaultLocale` = **erreur** ; clé orpheline = info.
- Runtime : langue choisie = préférence joueur → langue système → `defaultLocale`. Changement de langue possible sans quitter la partie.
- UI Studio et UI mobile : traduites séparément (bibliothèques standard : `react-i18next` côté Studio, ressources Compose Multiplatform côté mobile), fichiers `fr`/`en`, extraction automatisée en CI pour détecter les clés manquantes.
- **Migration** : outil automatique `schemaVersion N → N+1` extrayant les chaînes de `game-5poi.json` et `sherlock-holmes` vers `i18n/fr.json`.

### 3.3 Versionnement du schéma

`schemaVersion` entier dans chaque jeu. Chaque évolution de schéma livre une migration pure et testée (`vN → vN+1`). Studio migre à l'ouverture ; runtime refuse un jeu de version supérieure avec un message clair (« mettez à jour l'application »).

### 3.4 Catalogue générique

Table unique `catalog_item` :

```
id, type (template|theme|layout|widget|module|object-pack),
slug, version, title_key, summary_key, tags[], preview_asset,
requires[], requiresAll[], visibility (public|private|org),
owner_id?, status (draft|published|deprecated),
payload (JSON, validé par le schéma du type), created_at, updated_at
```

- Chaque type possède son **schéma de payload** (Draft-07).
- API unique : `GET /catalog?type=…&q=…` renvoie les éléments avec un champ calculé `access: "granted" | "locked" (requires)` pour afficher le cadenas et le lien Shop.
- Éléments **privés** : propriétaire uniquement (catalogue privé d'un créateur : ses propres templates/layouts).
- Versions : un jeu référence `{ id, version }` ; mise à jour = action explicite, jamais silencieuse.

### 3.5 Licence signée (droits hors ligne côté mobile)

Principe : **le droit appartient au créateur du jeu**, pas au joueur. Un joueur qui lance un jeu utilisant un thème premium n'achète rien.

- À la publication d'une version, le serveur vérifie C3 puis ajoute `license.json` au package : `{ gameId, version, publisherId, entitlements: [...], iat, exp?, kid }`, signé **EdDSA (Ed25519)**.
- Clé publique embarquée dans l'app (avec `kid`, rotation prévue : liste de clés acceptées).
- Le runtime vérifie la signature et l'inclusion des modules/styles utilisés dans les entitlements licenciés. Pas de réseau nécessaire.
- Expiration : `exp` facultatif. Politique : si le plan du créateur expire, les **versions déjà publiées restent jouables** ; seule la **publication de nouvelles versions** est bloquée. Période de grâce de 30 jours configurable.
- Package sans licence : accepté pour les jeux n'utilisant que du contenu public.
- Jeu avec licence invalide/altérée : refus d'installation avec message explicite (code `E_LICENSE_INVALID`).
- Pas de « tokens consommables » en v1 (inutile avec ce modèle). À reconsidérer si un modèle à l'usage devient nécessaire.

### 3.6 Codes d'erreur d'installation/import (mobile)

Catalogue d'erreurs stable, chacune avec message localisé + action proposée :

| Code | Cas | Action proposée |
|---|---|---|
| `E_STORAGE_FULL` | Espace insuffisant (vérifié avant téléchargement : taille manifest × 1,2) | Ouvrir « Gérer le stockage » |
| `E_NETWORK` / `E_TIMEOUT` | Réseau coupé | Reprendre (téléchargement reprenable par fichier) |
| `E_HASH_MISMATCH` | sha256 invalide | Retélécharger le fichier fautif |
| `E_MANIFEST_INVALID` | Manifest absent/illisible | Contacter l'auteur |
| `E_SCHEMA_TOO_NEW` | `schemaVersion` > app | Mettre à jour l'application |
| `E_LICENSE_INVALID` | Licence invalide | Contacter l'auteur |
| `E_PARTIAL` | Installation incomplète | Reprendre ou supprimer |
| `E_ALREADY_INSTALLED` | Même `gameId` + version | Remplacer / conserver |
| `E_DB_MIGRATION` | Échec migration SQLite | Sauvegarde automatique restaurée |

Règles : installation **atomique** (dossier temporaire puis renommage), jamais d'état partiel lançable, journal local consultable et exportable.

### 3.7 Gestion du cache et des anciens projets

- Écran **« Stockage »** : taille par jeu (package, médias, tuiles carte, sauvegardes de session), tri, suppression ciblée.
- Politique de suppression : supprimer un jeu **conserve** par défaut la progression pendant 30 jours (« corbeille »), purge ensuite.
- Versions multiples : conserver la version précédente d'un jeu jusqu'à validation de la nouvelle (retour arrière en un geste).
- Nettoyage automatique des téléchargements interrompus > 7 jours.
- Sauvegarde/restauration : export d'un « sac de progression » local (fichier) ; synchronisation cloud seulement si compte (M3+).

### 3.8 Modération et conditions de partage d'un jeu public

Les **conditions d'usage** sont fixées par la plateforme (CGU). La question n'est pas de les définir mais de décider **quand elles sont vérifiées** :

| Modèle | Fonctionnement | Avantage | Inconvénient |
|---|---|---|---|
| A priori | Un jeu passe en revue avant d'apparaître dans le catalogue public | Contenu propre dès le départ | Lent, coûteux en temps humain, frein à la publication |
| A posteriori | Publication immédiate, signalement par les utilisateurs, retrait rapide | Fluide | Un contenu litigieux est visible un temps |

Recommandation :

- **Privé** et **sur invitation (lien/QR)** : aucune modération, responsabilité du créateur.
- **Public** (visible dans un catalogue de découverte) : **a posteriori** + contrôles automatiques (filtre de texte et d'images à la publication, taille, formats, détection de contenus évidents) + bouton « Signaler » + procédure de retrait documentée (CGU, adresse de contact). Les hébergeurs de contenu ont des obligations légales de retrait rapide après signalement.
- **Cible familiale (niveau 0)** : la grande majorité des jeux sont privés ou partagés par lien/QR, donc non modérés. Si un catalogue public « famille » existe, il passe en validation **a priori**, ou se limite à des contenus et templates fournis par la plateforme. Aucune fonction sociale ouverte (commentaires, messages) entre inconnus.
- Données de localisation : un jeu public affiche des lieux réels ; interdire par CGU les lieux privés (domiciles) et ajouter un contrôle manuel des signalements « lieu dangereux » (voie, propriété privée).

Spécification : état `moderation: none|pending|approved|rejected|removed` sur `game_version` publique ; journal des décisions ; notification du créateur avec motif ; recours simple.

### 3.9 Quotas et rétention par plan

Constat : les JSON de jeu pèsent peu ; **tuiles de carte, images, audio et vidéo** concentrent le coût.

Propositions (valeurs à valider) :

| | Gratuit | Créateur | Pro / Organisation |
|---|---|---|---|
| Jeux actifs | 3 | 20 | illimité raisonnable |
| Stockage médias | 500 Mo | 5 Go | 50 Go |
| Versions conservées par jeu | 3 | 10 | 30 |
| Vidéo | non / 1 min | 5 min, 720p | 15 min, 1080p |
| Tuiles carto hors ligne | emprise ≤ 25 km² | ≤ 200 km² | ≤ 1000 km² |
| Brouillons | 30 jours d'historique | 90 jours | 1 an |

Règles :

- **Versions publiées immuables** ; au-delà du quota, la plus ancienne non installée est archivée (médias purgeables, manifest conservé) après préavis.
- **Stockage adressé par contenu (sha256)** : un fichier identique partagé entre jeux ou versions n'est stocké qu'une fois ; le quota compte les fichiers uniques de l'utilisateur. Réduit fortement le coût des nouvelles versions.
- **Tuiles carto mutualisées** : plutôt que de stocker des tuiles par jeu, générer des **extraits régionaux** (par exemple au format PMTiles) à partir d'une source de données ouverte, partagés et référencés par le jeu. Respecter l'attribution de la source cartographique.
- **Transcodage vidéo** côté serveur (résolution et débit plafonnés, durée maximale) ; images redimensionnées/compressées automatiquement ; audio normalisé.
- Dépassement de quota : lecture et jeu non affectés ; seules la publication et l'import de médias sont bloqués, avec message clair.
- Avertissement C2 : poids total du package affiché dans Valider, avec la part de chaque média.
- Rétention des comptes inactifs et suppression : voir M3-08.

### 3.10 Préparer la marketplace (sans la construire)

À intégrer dès M3-05 / M4-02 pour éviter une refonte :

- `game` : `author_id` distinct de `owner_id` ; champ `license` (propriétaire, partage libre, cession) ; une version publiée référence ses **dépendances** (templates, thèmes, médias sous licence) avec l'auteur de chacune.
- Droit d'**utiliser** vs droit de **modifier** vs droit de **redistribuer** : trois entitlements distincts (`game:play`, `game:fork`, `game:resell`), absents en v1 mais prévus dans le modèle.
- Un jeu acheté est **cloné** dans le catalogue de l'acheteur (copie liée à la version d'origine).
- Hors périmètre actuel mais à anticiper : Stripe Connect (comptes vendeurs, vérification d'identité), commission de plateforme, fiscalité, litiges et remboursements.

### 3.11 Niveau 0 : cible familles (chasses à la maison, au jardin, au parc)

**Contraintes spécifiques**

| Contrainte | Conséquence de conception |
|---|---|
| Intérieur et jardin : GPS imprécis voire absent | Validation d'étape **sans GPS** par défaut (QR, code, énigme, « J'y suis ») ; GPS réservé au parc/extérieur et seulement avec précision acceptable |
| Très petites zones (10 à 200 m) | `marginMeters` minimal réglé à 20 m pour ce profil ; zoom carte adapté ; plan **indoor** (dessin simple ou photo de la pièce) à la place de la carte quand le lieu est la maison |
| Joueurs enfants, parfois non lecteurs | Narration **audio** de chaque consigne, pictogrammes, gros boutons, textes courts ; option « lire à voix haute » |
| Créateur = parent, peu technique | Assistant guidé, valeurs par défaut sûres, aucun vocabulaire technique, aperçu en un geste |
| Plusieurs joueurs, un seul appareil | Mode équipe, passage de téléphone, pas de compte joueur |
| Sécurité | Avertissements parent (surveillance, zones interdites, voie publique) ; interdiction par CGU et par l'assistant de placer une cachette hors de la propriété ou du parc désigné ; pas de localisation partagée en continu |
| Mineurs | Aucune collecte de données sur les joueurs ; télémétrie désactivée par défaut dans les parties famille ; pas de publicité ; données du créateur parent traitées conformément à §M3-08 |

**Parcours de l'assistant (cible 10 minutes)**

1. Où joue-t-on ? *Maison / Jardin / Parc*
2. Pour qui ? Âge des enfants (4-6, 7-9, 10-12) → détermine l'audio, le vocabulaire et la difficulté
3. Ambiance : choix parmi 4 à 6 thèmes (voir ci-dessous)
4. Nombre de cachettes (3 à 8) et placement : point sur le plan/la carte ou liste de pièces
5. Pour chaque cachette : type d'indice (devinette, image, rébus, code, énigme simple) à partir de **cartes préconfigurées**, texte et audio suggérés
6. Récompense finale : message, objet virtuel, diplôme, rappel pour cacher un vrai cadeau
7. Aperçu → impression du kit (QR, indices) → lancer ou partager (QR/lien)

**Premiers contenus à créer**

- *Templates* : « Chasse au trésor dans la maison », « … dans le jardin », « … au parc », « Anniversaire », « Mission détective ».
- *Thèmes* (originaux, sans personnage sous licence) : pirates, fées et forêt enchantée, détectives, dinosaures/explorateurs, espace, animaux.
- *Cartes d'épreuve préconfigurées* : devinette à choix, rébus en image, code à trouver sur un objet, puzzle simple, « trouve et scanne », question photo.
- *Audio* : bibliothèque de bandes sonores libres de droits (pas d'extraits commerciaux).

**Conséquences techniques**

- Le module de validation d'arrivée devient une **abstraction** (`ArrivalProof`: GPS / QR / CODE / MANUAL / COMPASS) que le moteur traite de manière uniforme : voir M4-14.
- QR de cachette : contenu opaque signé (`geoplay://step/<gameId>/<nodeId>/<nonce>`) pour éviter qu'un enfant déclenche une autre étape par hasard ; le scan n'ouvre rien hors de l'application.
- Bouton « Indice » avec coût (rien en famille par défaut) ; bouton « Aide parent » pour débloquer.
- Réinitialisation d'une partie en un geste (rejouer le lendemain).
- Mode hors ligne complet (jardin sans Wi-Fi) : déjà garanti par le socle.

---

## 4. Spécifications fonctionnelles des finitions (M2)

### 4.1 Carte : zone de jeu limitée

```json
"map": { "bounds": { "mode": "auto" | "manual",
  "marginMeters": 500, "bbox": [minLon, minLat, maxLon, maxLat] } }
```

- `auto` : emprise de tous les POI + marge (défaut 500 m, configurable). Recalculée à chaque ajout/déplacement de POI.
- `manual` : bbox dessinée dans le Studio.
- Runtime : MapLibre `maxBounds` + zoom minimum dérivé ; pan/zoom limités. Le joueur **n'est pas bloqué physiquement** : s'il sort de la zone, un bouton « Me recentrer » apparaît.
- C2 : POI hors bbox manuelle = erreur ; bbox invalide (aire nulle) = erreur ; marge > 5 km = avertissement.
- Les plans indoor (`indoorPlans`) ont leur propre bbox implicite (image).

### 4.2 Module INFO — séquence de contenus

```json
{ "type": "INFO", "config": {
  "navigation": "swipe" | "button" | "both",
  "autoAdvance": false,
  "slides": [
    { "id": "s1", "blocks": [
        { "kind": "text",  "text": {"$t": "info.s1.text"}, "style": "body" },
        { "kind": "image", "src": "media/…", "alt": {"$t": "…"} },
        { "kind": "video", "src": "media/…", "poster": "…", "autoplay": false, "controls": true },
        { "kind": "audio", "src": "media/…", "loop": false, "autoplay": false }
    ]}
  ],
  "completion": "onLastSlide" | "onButton",
  "buttonLabel": {"$t": "info.next"}
}}
```

- Une bande sonore peut être **de scène** (`soundtrack` au niveau écran, continue entre slides) ou **de bloc**.
- Navigation : indicateur de progression (points), bouton « Précédent » facultatif.
- Le module émet `COMPLETED` uniquement à la dernière slide (aucun événement intermédiaire vers l'orchestre).
- Média lourd : taille maximale par fichier configurable ; vidéo **pack-only** (jamais en streaming) ; avertissement C2 si le package dépasse un seuil (défaut 150 Mo).
- Accessibilité : `alt` obligatoire pour image (avertissement), sous-titres pour vidéo en option (`captions` : fichier WebVTT localisé).
- Fallback : média illisible → le bloc s'affiche vide avec son texte alternatif ; la séquence reste franchissable.
- Simulateur Studio : navigation et lecture autorisées, aucun événement orchestre.

### 4.3 Effets multiples par étape

```json
"effects": [
  { "id": "e1", "on": "ON_COMPLETE", "type": "GIVE_ITEM", "params": {…} },
  { "id": "e2", "on": "ON_COMPLETE", "type": "UNLOCK_NODE", "params": {…}, "delayMs": 0 },
  { "id": "e3", "on": "ON_ENTER",    "type": "PLAY_SOUND", "params": {…} }
]
```

- Liste ordonnée ; exécution **séquentielle déterministe** dans l'ordre du tableau.
- Déclencheurs : `ON_ENTER`, `ON_COMPLETE`, `ON_FAIL`, `ON_REENTRY`.
- Idempotence : chaque effet porte un `id` ; l'exécution est consignée par `sessionId` pour éviter les doubles applications au rechargement.
- Échec d'un effet : journalisé, les suivants continuent (politique `onError: "continue" | "abort"`, défaut `continue`).
- Compatibilité : migration automatique `effect` (unique) → `effects[0]`.
- C2 : effets contradictoires (donner + retirer le même objet dans le même déclencheur) = avertissement ; cible inexistante = erreur.
- Studio : liste réordonnable par glisser-déposer dans l'Inspecteur, annuler/rétablir via opérations MCP nommées.

### 4.4 Inventaire (Studio et runtime)

**Studio**

- Deux vues commutables, préférence mémorisée : **grille** (vignettes façon e-shop : image, nom, badge de type) et **tableau** (colonnes : icône, nom, type, rôle `donné`/`requis`, recette, utilisé dans, actions ; tri/filtre).
- Action **« Importer depuis un autre jeu »** : bouton primaire en haut de page (en plus du menu existant), avec aperçu et détection de doublons.
- **Objets composés** (issus de `recipes`) : badge « Composé », ligne dépliable montrant les ingrédients (1 ou 2), lien cliquable vers chaque ingrédient, et lien inverse « sert à composer ».
- **Référence donné/requis** : dans l'Inspecteur d'une étape, sélecteur d'objet avec le rôle (`gives` / `requires`) ; le tableau d'inventaire affiche pour chaque objet les étapes qui le donnent et celles qui l'exigent. C2 : objet requis jamais donné = erreur ; objet donné jamais utilisé = info.

**Runtime**

- Icône d'accès à l'inventaire sur tous les écrans de jeu (position configurable dans `global.screen`, masquable par écran), avec compteur/pastille de nouveauté.
- Ouverture en overlay (toolbox existante), jamais de perte d'état de l'écran courant.

### 4.5 Mode sombre

Couvert par §3.1. Critère de sortie : un test visuel automatisé (captures claires/sombres de `sherlock-holmes` et `game-5poi.json`) vérifie qu'aucun texte n'a un contraste < 4,5.

### 4.6 QR de chargement

- Contenu : `https://<host>/g/<gameId>?v=<version>` (lien universel/App Link : ouvre l'app si installée, sinon page d'accueil avec lien stores).
- Jeux **privés** : jeton à usage limité dans l'URL (`&t=<jwt court>`), durée et nombre d'usages configurables.
- Hors ligne (M1/M2, avant backend) : QR contenant l'URL du catalogue local existant (code 4 chiffres).
- Génération dans le Studio (PNG/SVG téléchargeable, affichage plein écran pour projeter).

---

## 5. Studio Shop (web)

- Application web distincte du Studio (même SSO Keycloak), compte requis.
- Produits : plans (mensuel/annuel), thèmes, templates, modules avancés, packs de mises en page.
- Paiement : Stripe (Checkout + webhooks), TVA gérée via Stripe Tax ou équivalent.
- Webhooks → table `purchase` → recalcul des entitlements (idempotent par `event_id`).
- Reçus, factures, résiliation, remboursement (retrait d'entitlement, sans casser les versions déjà publiées — §3.5).
- **Côté mobile** : aucun achat, aucun prix, aucun lien vers le Shop dans l'app iOS tant que l'avis juridique n'est pas rendu (règle prudente). Un contenu verrouillé n'a de sens que dans le Studio ; le joueur ne voit jamais de cadenas.

---

## 6. Plan de changes OpenSpec

Convention : identifiant du change en kebab-case. « Dép. » = dépendances. Chaque change contient proposition, delta de specs (`SHALL`), tâches et critères d'acceptation. Les exigences listées sont des points de départ pour les `spec deltas`.

### JALON M1 — « Une équipe joue sur de vrais téléphones »

**M1-01 `ci-build-android-ios`** — Dép. : aucune
- Objectif : builds reproductibles Android (APK/AAB) et iOS (IPA) en CI.
- Exigences : le pipeline SHALL construire `shared` + apps natives à chaque PR ; SHALL exécuter tests unitaires du moteur et validation C1/C2 des jeux de référence ; SHALL publier les artefacts.
- Accept. : PR verte = APK installable téléchargeable ; build iOS signé produit via runner macOS ; durée < 20 min.

**M1-02 `release-signing-team`** — Dép. : M1-01
- Android : `signingConfigs.release` lisant `keystore.properties`/variables CI (jamais de valeurs en dur) ; **Play App Signing** activé ; clé d'upload d'équipe stockée dans les secrets chiffrés de la CI + copie dans un gestionnaire de secrets d'équipe ; procédure documentée de rotation/perte.
- iOS : fastlane `match` (dépôt privé chiffré) pour certificats/profils.
- Accept. : un second développeur produit un build signé identique sans recevoir de fichier par message ; `*.jks`, `keystore.properties` dans `.gitignore` et scan de secrets en CI.

**M1-03 `internal-distribution`** — Dép. : M1-02
- Firebase App Distribution (Android) + TestFlight (iOS) ; notes de version automatiques ; `versionCode` incrémenté par la CI.
- Accept. : une tag `vX.Y.Z` publie sur les deux canaux.

**M1-04 `install-import-robustness`** — Dép. : M1-01
- Implémenter le catalogue d'erreurs §3.6, l'installation atomique, la reprise de téléchargement, le pré-contrôle d'espace.
- Accept. : tests d'injection (réseau coupé à 50 %, fichier corrompu, disque plein simulé) → aucun état partiel lançable, message localisé.

**M1-05 `local-storage-management`** — Dép. : M1-04
- Écran Stockage, corbeille 30 jours, conservation de la version précédente, migrations SQLite versionnées avec sauvegarde préalable (§3.7).
- Accept. : migration testée sur base de N-1 et N-2 ; restauration automatique en cas d'échec.

**M1-06 `device-test-matrix`** — Dép. : M1-03
- Matrice minimale : 3 Android (bas, milieu de gamme, récent ; Android N-2 → courant) + 2 iPhone (ancien, récent). Scénarios : `game-5poi.json`, `sherlock-holmes`, GPS (marche réelle), boussole, AR_MARKER (+ fallback 2D), mode hors ligne complet, rotation, mise en veille.
- Accept. : fiche de test signée par appareil, bogues triés en bloquant/non bloquant.

**M1-07 `crash-reporting`** — Dép. : M1-03
- Sentry (ou équivalent) mobile + Studio, sans donnée de localisation, opt-out joueur.

**M1-08 `ios-parity-compose`** — Dép. : M1-01
- Parité iOS du rendu `ScreenRenderer`, `HomeDashboard`, `MapWidget` via `ComposeView` ; frontière natif limitée au matériel (BLE, GPS, caméra, accès guidé).
- Accept. : mêmes scénarios que M1-06 passants sur iPhone ; revue de la frontière `commonMain/iosMain`.

**M1-09 `shared-regression-suite`** — Dép. : M1-01
- Suite de scénarios déclaratifs exécutée sur moteur JVM, simulateur wasmJs et runtime natif (au moins `game-5poi.json`) pour détecter les divergences.

### JALON M2 — « Produit complet sans backend »

**M2-01 `semantic-style-tokens`** — §3.1 — corrige le mode sombre ; migration des couleurs en dur ; lint ; test de contraste.
**M2-02 `schema-versioning-migrations`** — §3.3 — `schemaVersion`, framework de migrations.
**M2-03 `i18n-game-model`** — §3.2 — schéma `$t`, fichiers `i18n/*.json`, manifest, C2, runtime, migration des jeux de référence. Dép. : M2-02. **À livrer avant M3** (coût de migration croissant).
**M2-04 `studio-i18n-editor`** — éditeur de traductions dans le Studio : tableau clé × langue, indicateur de complétion, filtre « manquantes », import/export (JSON/XLIFF ou CSV), bascule de langue de l'aperçu. Dép. : M2-03.
**M2-05 `app-ui-i18n`** — traduction fr/en Studio et mobile, extraction CI. Dép. : M2-03.
**M2-06 `map-play-area`** — §4.1.
**M2-07 `info-module-sequence`** — §4.2. Dép. : M2-03 (textes localisés).
**M2-08 `multi-effects`** — §4.3.
**M2-09 `inventory-studio-views`** — §4.4 partie Studio.
**M2-10 `inventory-runtime-access`** — §4.4 partie runtime (icône, overlay).
**M2-11 `game-qr-local`** — §4.6 version sans backend.

Accept. jalon : `sherlock-holmes` jouable en fr et en, thème sombre propre, zone carte, effets multiples, sur appareils réels.

### JALON M3 — « Un créateur a un compte et publie »

**M3-01 `backend-foundation`** — monolithe modulaire Node.js/TypeScript (Fastify ou NestJS), validateurs C1/C2/C3 partagés avec le Studio, PostgreSQL, migrations (Flyway), stockage objet, OpenAPI généré, logs structurés, health checks.
**M3-02 `keycloak-integration`** — realm, clients (§1.1), rôles, e-mails (SMTP), politique de mots de passe, MFA optionnel, thème de login fr/en ; validation JWT côté backend (JWKS) ; profil local créé au premier login.
**M3-03 `studio-authentication`** — login OIDC PKCE dans le Studio, mode **invité local** conservé (autosave sans compte), à la première connexion proposition d'importer le brouillon local.
**M3-04 `draft-sync`** — brouillons serveur : `PUT /games/{id}/draft` avec `ETag`/`If-Match`, historique des 20 dernières révisions, résolution de conflit « dernière écriture gagne + copie conflictuelle conservée ». Autosave hors ligne puis synchronisation au retour réseau.
**M3-05 `game-publication-pipeline`** — modèle `game`, `game_version` (immuable, numérotée `major.minor`), `package` (manifest + fichiers), états `draft|reviewed|published|archived`, visibilité `private|unlisted|public`. Publication = C1+C2(+C3 en M4) serveur → construction du package → manifest sha256 → stockage → URL signée. Dépublication, retrait d'une version, retour arrière.
**M3-06 `my-games-store-mobile`** — D6 : écran « Mes jeux » (compte optionnel) listant les jeux du créateur : versions disponibles, version installée, taille, statut ; installer / mettre à jour / revenir à la version précédente / supprimer le package ; téléchargement reprenable ; fonctionne hors ligne pour ce qui est installé ; cache de la liste (dernière synchronisation affichée). Se connecter n'est jamais requis pour ouvrir un jeu importé par QR/lien.
**M3-07 `game-qr-links`** — §4.6 version serveur : liens universels, jetons pour jeux privés, page de destination.
**M3-08 `account-privacy-compliance`** — RGPD : politique de confidentialité, export et suppression de compte, consentement analytics, données de localisation traitées **localement** (jamais envoyées par défaut), contrôle de l'âge/mineurs (jeux scolaires), CGU de contenu, signalement.
**M3-09 `ops-backup-monitoring`** — Barman (WAL + sauvegarde physique, serveur distinct, rétention 30 j, test de restauration mensuel automatisé), sauvegarde du stockage objet, export Git du realm Keycloak, monitoring, alertes, sauvegarde de la base Keycloak.

Accept. jalon : un créateur se connecte, édite sur deux postes, publie une version, scanne le QR sur téléphone, joue hors ligne, retrouve ses versions dans « Mes jeux ».

### JALON M4 — « Catalogues, profils et styles »

**M4-01 `entitlement-engine`** — §2 : tables `role`, `plan`, `plan_entitlement`, `entitlement_grant`, résolution avec cache, API `GET /me/entitlements`, journal d'audit des octrois.
**M4-02 `catalog-core`** — §3.4 : table, schémas par type, API, visibilités, versions, champ `access`.
**M4-03 `c3-rights-validation`** — §2.4 : validateur partagé (serveur autoritaire, Studio indicatif) ; intégré à la publication (M3-05).
**M4-04 `theme-engine`** — §3.1 : application des tokens au Studio, au simulateur et au runtime ; thèmes à variantes de widgets ; sélecteur de thème avec aperçu en direct.
**M4-05 `theme-catalog`** — thèmes standards (3 à 5 : clair neutre, sombre, enfants, vintage/enquête, nature) + thèmes premium ; éditeur de thème (réservé `advanced`) ; contrôle de contraste.
**M4-06 `game-template-catalog`** — (premiers templates dictés par le public famille du niveau 0, voir §3.11 : chasse au trésor maison, jardin, parc, anniversaire ; les templates urbain/escape game/visite guidée viennent ensuite) templates de scénario complets (rallye urbain, chasse au trésor, escape game, visite guidée) : graphe prérempli + **slots** déclarés (`slots[]` : nom, type, contraintes) + niveau de verrouillage (`locked`, `slotsOnly`, `free`). Droits par template.
**M4-07 `layout-catalog`** — mises en page (écrans/sections réutilisables), privées (créateur) ou par abonnement ; insertion depuis la palette du composeur ; « enregistrer cet écran comme mise en page ».
**M4-08 `widget-module-registry-tiers`** — étendre le registre existant : champ `tier: standard|advanced` et `requires` sur chaque module/widget ; filtrage dans la palette ; cadenas + explication pour les éléments verrouillés.
**M4-09 `studio-profiles-gating`** — interface adaptée au rôle : `level0` (assistant), `creator`, `advanced` (JSON brut, éditeur de thème) ; contrôle des droits côté serveur, jamais seulement UI.
**M4-10 `composer-wix-like`** — évolution continue du composeur : palette de blocs glisser-déposer, sections réutilisables, aperçu live avec thème, aides contextuelles, raccourcis ; grille de guides d'alignement. À découper en petits changes.
**M4-11 `level0-guided-wizard`** — assistant pas à pas : choix du type de jeu (template `slotsOnly`) → titre/ambiance (thème parmi 3) → lieux (carte simple, ajout par clic) → une épreuve par lieu (liste restreinte de widgets préconfigurés) → récapitulatif → publication + QR. Le résultat est un jeu du **même schéma**. Contrôle strict : l'utilisateur ne peut pas sortir des slots ; C3 niveau `level0` appliqué ; aucun JSON visible. Version famille : voir §3.11 (choix du lieu maison/jardin/parc, placement des cachettes, indices, impression du kit). Mesure : un parent crée et lance une chasse de 5 cachettes en < 10 min, sans aide (test avec 5 parents).
**M4-14 `proximity-without-gps`** — Dép. : M2-03 — validation d'arrivée à une cachette **sans GPS** : scan d'un QR collé à la cachette, saisie d'un code, bouton « J'y suis » validé par une énigme, boussole/indice directionnel, photo-indice. Le choix du mode se fait par étape, avec repli automatique si la précision GPS dépasse un seuil (voir §3.11). À prototyper tôt, car il conditionne l'expérience en intérieur et en jardin.
**M4-15 `printable-kit`** — génération d'un PDF imprimable : QR des cachettes (un par page ou planche d'étiquettes), indices papier optionnels, carte au trésor, diplôme de fin ; côté parent, liste « où coller quoi ».
**M4-16 `family-roles-modes`** — mode **parent** (création, aperçu, réinitialisation de la partie, indice de secours) et mode **enfant** (écran simplifié, sortie protégée) ; équipes (plusieurs enfants, un appareil) ; réglage de difficulté (indices plus ou moins explicites, durée).
**M4-12 `object-pack-catalog`** — catalogue d'objets réutilisables (packs d'inventaire) importables dans un jeu ; remplace/complète l'import depuis un autre jeu.
**M4-13 `admin-backoffice`** — gestion des utilisateurs, plans, octrois manuels, catalogues (publication, dépréciation), modération.

Accept. jalon : un créateur `creator` voit des cadenas sur les éléments premium, un `level0` crée un jeu en assistant, un thème s'applique de bout en bout (Studio, simulateur, appareil).

### JALON M5 — « Monétisation, licences et IA »

**M5-01 `shop-stripe`** — §5 : produits, checkout, webhooks idempotents, TVA, factures, portail client.
**M5-02 `entitlement-purchase-link`** — achats ↔ entitlements, remboursements, expirations, période de grâce.
**M5-03 `signed-license`** — §3.5 : génération, signature, rotation de clés, vérification runtime offline, tests d'altération.
**M5-04 `quotas-usage`** — compteurs mensuels (`games.max`, `storage.mb`, `llm.generations/month`) et messages d'erreur clairs.
**M5-05 `llm-game-generation`** :
  - Entrée : prompt, langue, type de jeu, éventuellement lieux. Contexte injecté : **sous-registre autorisé** pour le profil (modules, widgets, thèmes, layouts accessibles), jamais l'ensemble.
  - Sortie : appel avec sortie structurée contrainte par le schéma Draft-07 **restreint** au sous-registre, plus `i18n/*.json`.
  - Boucle : C1 → C2 → C3 ; erreurs structurées `{code,noeud,champ}` renvoyées au modèle ; max 3 tentatives ; sinon échec explicite avec la dernière version corrigée en brouillon.
  - Sécurité : le prompt utilisateur est traité comme donnée (pas d'instructions système modifiables) ; aucune sortie publiée directement ; résultat = brouillon `draft` à relire ; filtre de modération sur entrée et sortie.
  - Exécution **asynchrone** (file de jobs + worker isolé, seul service séparé), suivi d'état dans le Studio, annulation possible.
  - Coût : estimation avant lancement pour les gros jeux, quota par plan, journal d'usage.
  - Évaluation : jeu de 30 prompts de référence ; indicateurs : % validé C1/C2/C3 au premier essai, % après réparation, temps, coût.
**M5-06 `llm-in-level0`** — le LLM remplit les slots de l'assistant (« décris ton parcours » → propositions modifiables).
**M5-07 `creator-analytics`** — parties jouées, taux de complétion par étape, temps moyen, points de blocage ; **télémétrie joueur opt-in, anonyme**, envoi différé (offline-first), agrégation côté serveur.
**M5-08 `moderation-reporting`** — §3.8 : signalement, file de modération, états `moderation`, filtres automatiques, retrait, journal.
**M5-09 `storage-quotas-media-pipeline`** — §3.9 : quotas par plan, stockage adressé par contenu, transcodage vidéo/images, extraits de tuiles mutualisés. (Peut être avancé en M3 si les médias explosent.)

### JALON M6 — « Marketplace » (plus tard)

**M6-01 `marketplace-licensing`** — entitlements `game:play/fork/resell`, clonage lié, dépendances sous licence (§3.10).
**M6-02 `seller-payouts`** — Stripe Connect, commission, fiscalité, litiges.
**M6-03 `marketplace-discovery`** — pages de vente, avis, classement, anti-fraude.

---

## 7. Ordre d'exécution recommandé et parallélisme

```
M1 (livraison) ──┐
                 ├─► M3 (backend) ─► M4 (catalogues/droits) ─► M5 (shop, licences, IA)
M2 (finitions) ──┘
```

- M1 et M2 en parallèle (équipes mobile et Studio). **M2-02/M2-03 (schéma + i18n) bloquent M3.**
- Dans M4, ordre : M4-01 → 02 → 03 → 08 → 04/05 → 06/07 → 09 → 11 → 10 (continu).
- LLM (M5-05) après M4-03 : sans C3, il pourrait produire des jeux non publiables.

Estimation d'effort relative (pour planifier, à affiner par l'équipe) : M1 ≈ 1, M2 ≈ 1,5, M3 ≈ 2, M4 ≈ 3, M5 ≈ 2,5 (unités arbitraires).

---

## 8. Risques et points de vigilance

| Risque | Impact | Mitigation |
|---|---|---|
| Règles des stores (achats externes, liens vers le Shop) | Refus de l'app iOS | Avis juridique avant M5 ; app sans prix/lien d'achat ; droits portés par le créateur |
| Exploitation de Keycloak (mises à jour, sécurité) | Indisponibilité des comptes | Sauvegardes testées, mises à jour planifiées, option service géré à terme |
| Dérive simulateur ↔ runtime | Faux sentiment de validité | M1-09, tests sur appareils |
| Migration i18n tardive | Réécriture des jeux | M2-03 avant tout backend |
| Divergence C1/C2/C3 entre Studio, serveur, runtime | Jeux publiés non jouables | Validateur unique partagé (KMP ou module commun), mêmes jeux de tests |
| Couts LLM | Dépassement budget | Quotas, estimation préalable, plafond global |
| Mineurs / localisation | Conformité | M3-08, localisation traitée localement |
| Perte du keystore | Impossibilité de mettre à jour | Play App Signing, procédure de reset de clé d'upload |
| Taille des packages (vidéo/audio) | Téléchargements longs, stockage plein | Seuils C2, compression recommandée, pré-contrôle d'espace |

---

## 9. Questions encore ouvertes

1. Budget mensuel cible et fournisseur retenu pour la phase France.
2. Fournisseurs disponibles en Nouvelle-Calédonie, tarifs, contraintes réglementaires (voir §1.2).
3. ~~Public du niveau 0~~ : tranché, familles (D10). Reste à décider : l'âge minimal des joueurs visés (pré-lecteurs 4-6 ans ? 6-12 ans ?), car cela dicte la part d'audio et de pictogrammes (§3.11).
4. Politique de modération retenue (voir §3.8, recommandation proposée).
5. Plafonds exacts de stockage par plan (valeurs de §3.9 à valider).
6. Date de lancement visée de la marketplace (impacte Stripe Connect et fiscalité).

---

## 10. Utilisation avec OpenSpec

Pour chaque change du §6 :

```
openspec propose <identifiant-du-change>
```

et fournir comme contexte : la section du §6, les paragraphes de §2–§5 qu'elle référence, et les specs actives concernées dans `openspec/specs/` (schéma de jeu, moteur, validation, Studio, player). Ordre conseillé de lancement : M1-01, M1-02, M2-01, M2-02, M2-03 (les cinq changes qui débloquent le reste).
