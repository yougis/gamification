## MODIFIED Requirements

### Requirement: Publication versionnée par nom de jeu

Le Studio SHALL publier un pack vers le service catalogue via une action « Publier ». Le pack publié SHALL être byte-identique à l'export fichier (`game.json` + manifest `{path, version, size, sha256}`, validé couches 1+2 avant envoi). `size` SHALL être le nombre d'octets UTF-8 du fichier (jamais `String.length`, qui compte des unités UTF-16 et diverge dès le premier accent) ; le SHA-256 SHALL être calculé sur les mêmes octets des deux côtés. Chaque jeu est versionné **par nom** (`gameId`) : chaque publication crée une nouvelle version qui devient la « courante », les versions précédentes restant adressables. Republier le même nom SHALL remplacer la courante sans changer le code d'accès du jeu. Le `gameId` SHALL être stable depuis la création du jeu : le renommage éditable dans l'UI (`branding.name`, simple libellé d'affichage) ne crée ni ne déplace l'entrée catalogue.

#### Scenario: Première publication

- **GIVEN** un jeu valide nommé « Chasse du Vieux-Port » jamais publié
- **WHEN** l'auteur choisit « Publier »
- **THEN** le service stocke le pack comme version courante et retourne un code à 4 chiffres unique

#### Scenario: Republication garde le code

- **GIVEN** le jeu « Chasse du Vieux-Port » déjà publié sous le code `4217`
- **WHEN** l'auteur publie une version corrigée
- **THEN** la nouvelle version devient courante, le code reste `4217`, l'ancienne version reste adressable

#### Scenario: Publication accentuée acceptée

- **GIVEN** un jeu valide dont le contenu contient des accents (« Château du Trésor »)
- **WHEN** l'auteur choisit « Publier »
- **THEN** la publication réussit (le `size` déclaré égale le nombre d'octets reçus) au lieu d'être rejetée « empreinte incohérente »

#### Scenario: Renommage d'affichage sans déplacement catalogue

- **GIVEN** un jeu publié sous le `gameId` « chasse-vieux-port » dont l'auteur modifie `branding.name` en « Chasse du Vieux-Port — édition 2026 »
- **WHEN** l'auteur republie
- **THEN** la nouvelle version remplace la courante sous le même code, sans créer de nouvelle entrée ; la liste catalogue continue d'afficher l'identifiant `chasse-vieux-port`
