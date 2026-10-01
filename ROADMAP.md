# Feuille de route — GeoPlay (de framework à plateforme utilisable)

Chaque ligne = un `change` OpenSpec, a creer et faire avancer dans cet
ordre via le workflow `/opsx:propose` -> `/opsx:continue` (ou `/opsx:ff`)
-> `/opsx:apply` -> `/opsx:archive`, depuis opencode.

Etat au 2026-10-02 : socle 000 -> 500 archive, 102 changes archives,
30 specs actives dans `openspec/specs/`. Studio Web mature, player natif
en bascule KMP. Vague 1 des changes 9xx proposee (900, 901, 910, 911, 912). Studio Web mature, player natif
en bascule KMP. Cette feuille de route remplace l'ancienne (000 -> 11) et
couvre la suite : livraison, finitions, comptes, catalogues, droits,
monetisation, IA.

Principes :
- La plateforme reste generique : template, theme, preuve d'arrivee,
  module sont des donnees declarees au registre, jamais du code cable
  pour un cas particulier.
- Joueur sans compte (offline-first conserve). Seuls les createurs
  s'authentifient.
- Droits portes par le createur (licence signee dans le package), achats
  sur le Studio Shop web, aucun achat dans l'app mobile.
- Monolithe modulaire Node.js/TypeScript + PostgreSQL + Barman. Pas de
  microservices (sauf worker LLM, asynchrone).
- Documentation (guide createur, reference API/MCP, glossaire) mise a jour
  dans le meme change que la fonctionnalite.
- Specification detaillee de chaque change : `geoplay-roadmap-plateforme.md`
  (references `§` ci-dessous).

## Jalon M1 — Une equipe joue sur de vrais telephones

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 900 | `900-ci-build-android-ios` | Builds reproductibles Android (APK/AAB) et iOS (IPA) en CI, tests moteur + validation C1/C2 des jeux de reference a chaque PR, artefacts publies | — |
| 901 | `901-release-signing-team` | `signingConfigs.release` sans secret en dur, Play App Signing + cle d'upload d'equipe (secrets CI + gestionnaire d'equipe), fastlane `match` iOS, scan de secrets | 900 |
| 902 | `902-internal-distribution` | Firebase App Distribution + TestFlight, notes de version auto, `versionCode` incremente par la CI, tag -> publication | 901 |
| 903 | `903-install-import-robustness` | Catalogue d'erreurs d'installation (§3.6), installation atomique, reprise de telechargement, pre-controle d'espace, jamais d'etat partiel lancable | 900 |
| 904 | `904-local-storage-management` | Ecran Stockage, corbeille 30 j, version precedente conservee, migrations SQLite versionnees avec sauvegarde (§3.7) | 903 |
| 905 | `905-device-test-matrix` | 3 Android + 2 iPhone, scenarios `game-5poi.json` / `sherlock-holmes` / GPS / boussole / AR + fallback / hors ligne | 902 |
| 906 | `906-crash-reporting` | Remontee d'erreurs mobile + Studio sans donnee de localisation, opt-out | 902 |
| 907 | `907-ios-parity-compose` | Parite iOS (`ScreenRenderer`, `HomeDashboard`, `MapWidget` via `ComposeView`), frontiere natif limitee au materiel | 900 |
| 908 | `908-shared-regression-suite` | Scenarios declaratifs executes sur moteur JVM, simulateur wasmJs et runtime natif ; validateur TS = validateur KMP | 900 |

## Jalon M2 — Produit complet sans backend

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 910 | `910-semantic-style-tokens` | Tokens de style semantiques (§3.1), fin des couleurs en dur, corrige le mode sombre, lint, test de contraste AA | — |
| 911 | `911-schema-versioning-migrations` | `schemaVersion`, framework de migrations testees vN -> vN+1, refus clair d'un jeu trop recent | — |
| 912 | `912-i18n-game-model` | Textes en cles `{"$t"}`, fichiers `i18n/fr.json` + `en.json` dans le package et le manifest, chaine de repli, regles C2, migration des jeux de reference (§3.2). **Bloque M3** | 911 |
| 913 | `913-studio-i18n-editor` | Tableau cle x langue, completion, filtre « manquantes », import/export, bascule de langue de l'apercu | 912 |
| 914 | `914-app-ui-i18n` | Traduction fr/en Studio et mobile, extraction CI des cles manquantes | 912 |
| 915 | `915-map-play-area` | `map.bounds` auto (extent + marge) ou manuel, `maxBounds` MapLibre, bouton « Me recentrer », regles C2 (§4.1) | — |
| 916 | `916-info-module-sequence` | Module INFO : `slides[]` de blocs texte/image/video/audio, navigation swipe ou bouton, bande sonore de scene, COMPLETED a la derniere slide (§4.2) | 912 |
| 917 | `917-multi-effects` | `effects[]` ordonnes par etape, declencheurs `ON_ENTER/ON_COMPLETE/ON_FAIL/ON_REENTRY`, idempotence par `sessionId`, migration `effect` -> `effects[0]` (§4.3) | 911 |
| 918 | `918-inventory-studio-views` | Vue grille (vignettes) + vue tableau, import visible en haut de page, objets composes mis en evidence, references donne/requis (§4.4) | — |
| 919 | `919-inventory-runtime-access` | Icone d'acces a l'inventaire sur tous les ecrans, overlay, pastille de nouveaute | 918 |
| 920 | `920-game-qr-local` | QR de chargement via le catalogue local (code 4 chiffres), affichage plein ecran dans le Studio | — |
| 921 | `921-a11y-battery-sos` | Accessibilite (audio, contrastes, tailles), consommation du suivi GPS, bouton SOS / aide parent (reprend l'ancien 640) | 905 |

## Jalon M3 — Un createur a un compte et publie

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 930 | `930-backend-foundation` | Monolithe modulaire Node.js/TypeScript, PostgreSQL, migrations, stockage objet S3, OpenAPI, logs structures, validateurs C1/C2/C3 partages avec le Studio | 911, 912 |
| 931 | `931-keycloak-integration` | Realm `geoplay`, clients (studio-web, mobile, backend, shop), roles level0/creator/advanced/admin, SMTP, MFA optionnel, JWT valide par JWKS | 930 |
| 932 | `932-studio-authentication` | Login OIDC PKCE, mode invite local conserve, import du brouillon local a la premiere connexion | 931 |
| 933 | `933-draft-sync` | Brouillons serveur avec `ETag`/`If-Match`, historique de revisions, copie conflictuelle, autosave hors ligne puis synchronisation | 930, 932 |
| 934 | `934-game-publication-pipeline` | `game`, `game_version` immuable, `package` + manifest sha256, etats draft/reviewed/published/archived, visibilite private/unlisted/public, dependance `author_id` != `owner_id` + champ `license` (§3.10) | 930, 912 |
| 935 | `935-my-games-store-mobile` | « Mes jeux » (compte optionnel) : versions, installer/mettre a jour/revenir en arriere/supprimer un package, reprise de telechargement, liste cachee hors ligne | 934, 931, 903 |
| 936 | `936-game-qr-links` | Liens universels / App Links, jetons limites pour jeux prives, page de destination | 934, 920 |
| 937 | `937-account-privacy-compliance` | Politique de confidentialite, export/suppression de compte, consentement, localisation traitee en local, regles mineurs, CGU de contenu | 931 |
| 938 | `938-ops-backup-monitoring` | Barman (WAL + sauvegarde physique, serveur distinct, retention 30 j, test de restauration mensuel), sauvegarde stockage objet, export Git du realm Keycloak, supervision | 930 |

## Jalon M4 — Catalogues, profils, styles, niveau 0 famille

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 940 | `940-entitlement-engine` | Roles, plans, achats -> entitlements `type:id`, resolution avec cache, `GET /me/entitlements`, audit des octrois (§2) | 930, 931 |
| 941 | `941-catalog-core` | Table `catalog_item` generique (template, theme, layout, widget, module, object-pack), schema de payload par type, visibilites, versions, champ calcule `access` (§3.4) | 940 |
| 942 | `942-c3-rights-validation` | Troisieme couche de validation (droits), serveur autoritaire + Studio indicatif, branchee a la publication (§2.4) | 940, 941, 934 |
| 943 | `943-widget-module-registry-tiers` | `tier: standard|advanced` + `requires` sur modules/widgets, filtrage de la palette, cadenas explicatif | 941 |
| 944 | `944-theme-engine` | Application des tokens au Studio, simulateur et runtime, variantes de widgets, apercu en direct, mode test/triche (reprend l'ancien 610) | 910, 941 |
| 945 | `945-theme-catalog` | Themes standards + premium (pirates, fees, detectives, dinosaures, espace, animaux), editeur de theme reserve `advanced`, controle de contraste | 944 |
| 946 | `946-proximity-without-gps` | Abstraction `ArrivalProof` : GPS / QR signe / CODE / « J'y suis » + enigme / boussole, repli automatique si precision GPS insuffisante. **A prototyper tot** (§3.11) | 912 |
| 947 | `947-game-template-catalog` | Templates avec slots (`locked|slotsOnly|free`) : chasse maison, jardin, parc, anniversaire, mission detective ; droits par template | 941, 946 |
| 948 | `948-layout-catalog` | Mises en page / sections reutilisables, privees ou sur abonnement, « enregistrer cet ecran comme mise en page » | 941 |
| 949 | `949-studio-profiles-gating` | Interface adaptee au role (level0 / creator / advanced), droits verifies cote serveur | 940, 943 |
| 950 | `950-level0-guided-wizard` | Assistant famille en 7 etapes (lieu, age, ambiance, cachettes, epreuves preconfigurees, recompense, apercu/impression), meme schema de jeu, aucun JSON visible. Cible : parent autonome en moins de 10 min | 947, 945, 949, 946 |
| 951 | `951-printable-kit` | PDF imprimable : QR des cachettes, carte au tresor, indices papier, diplome, liste « ou coller quoi » | 950, 946 |
| 952 | `952-family-roles-modes` | Mode parent (apercu, reinitialisation, aide) et mode enfant (ecran simplifie, sortie protegee), equipes sur un appareil, difficulte avec validation C2 (reprend l'ancien 620) | 950 |
| 953 | `953-object-pack-catalog` | Catalogue d'objets reutilisables, importables dans l'inventaire | 941, 918 |
| 954 | `954-admin-backoffice` | Gestion des utilisateurs, plans, octrois manuels, catalogues, moderation | 940, 941 |
| 955 | `955-composer-wix-like` | Evolution continue : palette de blocs glisser-deposer, sections reutilisables, apercu live themé, aides contextuelles, guides d'alignement (a decouper en petits changes) | 948 |

## Jalon M5 — Monetisation, licences, IA

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 960 | `960-shop-stripe` | Studio Shop web : produits, Stripe Checkout, webhooks idempotents, TVA, factures, portail client | 940 |
| 961 | `961-entitlement-purchase-link` | Achats <-> entitlements, remboursements, expirations, periode de grace | 960 |
| 962 | `962-signed-license` | `license.json` EdDSA dans le package, rotation de cles, verification runtime hors ligne, parties en cours jamais interrompues (§3.5) | 934, 942, 961 |
| 963 | `963-quotas-usage` | Compteurs mensuels (jeux, stockage, generations LLM), messages clairs | 940 |
| 964 | `964-storage-quotas-media-pipeline` | Quotas par plan, stockage adresse par contenu (sha256), transcodage video/images, extraits de tuiles mutualises (§3.9) | 963 |
| 965 | `965-llm-game-generation` | Generation contrainte par le sous-registre autorise du profil, boucle C1 -> C2 -> C3 (3 tentatives), brouillon uniquement, worker asynchrone, moderation entree/sortie, jeu d'evaluation de 30 prompts | 942, 947, 963 |
| 966 | `966-llm-in-level0` | Le LLM remplit les slots de l'assistant famille (« decris ton parcours ») | 965, 950 |
| 967 | `967-creator-analytics` | Parties jouees, completion par etape, points de blocage ; telemetrie joueur opt-in, anonyme, desactivee par defaut en parties famille | 934 |
| 968 | `968-moderation-reporting` | Signalement, file de moderation, etats `moderation`, filtres automatiques, retrait, journal (§3.8) | 934 |
| 969 | `969-sync-scoring-master` | Evenements P2P + resync serveur, `mergeRule`, flag triche (reprend l'ancien 600) | 930, 934 |

## Jalon M6 — Marketplace (plus tard)

| # | Nom du change (kebab-case) | Contenu | Depend de |
|---|---|---|---|
| 980 | `980-marketplace-licensing` | Entitlements `game:play/fork/resell`, clonage lie, dependances sous licence (§3.10) | 962, 934 |
| 981 | `981-seller-payouts` | Stripe Connect, commission, fiscalite, litiges | 980 |
| 982 | `982-marketplace-discovery` | Pages de vente, avis, classement, anti-fraude | 980 |

Differes explicites (pas de numero tant que le besoin n'est pas confirme) :
`630-window-conditional` (`WINDOW onMiss/recurrence`, gamebook, piste moteur
parallele, priorite basse), `710-hold-kiosk-mode` (verrouillage terminal
kiosque pour flotte fournie, sortie animateur, journalisation des I/O,
pertinent pour les offices de tourisme, pas pour le public famille).

## Ordre et parallelisme

```
M1 (livraison) ──┐
                 ├─► M3 (backend) ─► M4 (catalogues/droits) ─► M5 ─► M6
M2 (finitions) ──┘
```

- M1 et M2 en parallele. 911 et 912 (schema + i18n) bloquent M3.
- Dans M4 : 940 -> 941 -> 942 -> 943 -> 944/945 -> 947/948 -> 949 -> 950 ;
  prototyper 946 des que 912 est archive.
- 965 (LLM) uniquement apres 942 (C3).
- Lancer d'abord : 900, 901, 910, 911, 912.

## Decisions actees (rappel)

Joueur sans compte ; achats sur Studio Shop web uniquement ; Keycloak ;
i18n en fichiers separes par jeu (fr, en) ; Node.js/TypeScript +
PostgreSQL + Barman ; hebergement local en dev puis France puis
Nouvelle-Caledonie ; marketplace plus tard ; niveau 0 = familles
(chasse au tresor maison / jardin / parc) ; quotas differencies par abonnement.

Questions ouvertes : budget et fournisseur, presence de fournisseurs en
Nouvelle-Caledonie et obligations de localisation des donnees, age minimal
des joueurs vises (pre-lecteurs ou 6-12 ans), valeurs exactes des quotas,
avis juridique sur les regles Apple/Google avant le jalon M5.

## Demarrage
```bash
openspec init --tools opencode
```

Puis dans opencode, pour le premier change de la serie :

```
/opsx:propose 900-ci-build-android-ios : builds Android et iOS reproductibles
en CI avec tests moteur et validation C1/C2 des jeux de reference. Voir
geoplay-roadmap-plateforme.md et openspec/config.yaml pour le contexte et
les regles.
```

Chaque change archive passe dans `openspec/specs/`, qui reste la reference
que les changes suivants doivent lire avant de proposer quoi que ce soit.
