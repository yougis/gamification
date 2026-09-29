## Purpose

The Studio needs a way for authors to see the current screen and interact with it (click, navigate, type, mock sensors) without ever playing a real game, and the web is no longer a player channel, so this capability defines the Compose-wasm simulator contract.

## ADDED Requirements

### Requirement: Simulateur Compose web sans session

Le Studio SHALL offrir un simulateur rendant l'ecran courant via le renderer unique de `commonMain`, consomme en appel direct (jeu en memoire, jamais d'URL ni de telechargement). Le simulateur SHALL permettre : naviguer entre ecrans, cliquer boutons et widgets, repondre un quiz sans score, saisir un code sans validation moteur, deplacer la carte et ouvrir les volets, mocker GPS/boussole au clavier/souris. Le simulateur SHALL NE JAMAIS : creer de session, persister quoi que ce soit, scorer, journaliser des events de progression, consommer l'inventaire, ni fonctionner offline comme un player.

#### Scenario: Interaction sans ecriture
- **WHEN** l'auteur clique un bouton et repond un quiz dans le simulateur
- **THEN** l'ecran reagit visuellement et aucune session, aucun score, aucun event n'existe apres fermeture

#### Scenario: Mock capteur au clavier
- **WHEN** l'auteur simule une position GPS au clavier devant un noeud GEOFENCE
- **THEN** le noeud s'affiche eligible dans le simulateur sans toucher au JSON source

### Requirement: Budget d'interaction ferme

Seules les interactions listees au Requirement precedent SHALL exister dans le simulateur. Toute interaction de vraie partie (terminer, scorer, persister, consommer, telecharger tuiles ou pack offline) SHALL rester exclusive aux players natifs. Ajouter une interaction au simulateur SHALL exiger un change dedie, jamais un glissement silencieux.

#### Scenario: Tentative hors budget
- **WHEN** l'auteur cherche a valider definitivement une etape depuis le simulateur
- **THEN** le simulateur ne propose aucun controle de validation moteur, seulement la navigation et la saisie d'essai

### Requirement: Mocks capteurs clavier/souris

Le simulateur SHALL substituer chaque capteur physique indisponible sur ordinateur (GPS, gyroscope, boussole) par un mock manipulable au clavier/souris via injection de dependance. Aucun mock SHALL fuir vers les builds natifs.

#### Scenario: Boussole mockee
- **WHEN** l'auteur oriente la boussole simulee a 90 degres a la souris sur un noeud BOUSSOLE
- **THEN** le renderer affiche le cap simule et le JSON du jeu reste inchange
