## ADDED Requirements

### Requirement: Build PWA reproductible

La coquille PWA SHALL se construire de façon reproductible : la même commande de build produit le même `dist/` sur toute machine (locale ou CI), sans exiger d'état machine local (scripts, outils pré-installés, caches manuels). La toolchain web (compilateur, gestionnaire de paquets, optimiseur wasm) SHALL être résolue par le build lui-même, jamais supposée présente.

#### Scenario: Build sans état local

- **WHEN** un développeur clone le repo sur une machine vierge (hors SDK Android/JDK documentés) et lance la commande de build PWA
- **THEN** le build réussit sans script local ni outil pré-installé supplémentaire

#### Scenario: Build CI identique au local

- **WHEN** la CI construit la PWA sur runner Ubuntu
- **THEN** le `dist/` produit est fonctionnellement identique à celui d'un build local (même `index.html`, même manifest, même service worker)

### Requirement: PWA publiée sur URL publique stable

Le `dist/` PWA issu du build CI SHALL être publié automatiquement sur une URL publique stable en HTTPS (GitHub Pages, repo public), sans committer le `dist/` dans le repo. L'URL SHALL servir exactement les fichiers du build (jamais une copie manuelle), avec les chemins relatifs existants (`start_url`/`scope` relatifs) pour rester valide sous le sous-chemin d'hébergement.

#### Scenario: Publication automatique sur la branche principale

- **WHEN** un commit est poussé sur la branche principale avec un build PWA vert
- **THEN** la PWA est déployée sur l'URL publique et affiche la version du build

#### Scenario: URL utilisable en flotte

- **GIVEN** l'URL publique de la PWA déployée
- **WHEN** l'animateur l'ouvre dans Safari puis l'ajoute à l'écran d'accueil (ou la pousse en Web Clip MDM)
- **THEN** la PWA s'installe et importe un pack par fichier, URL ou code, exactement comme en local
