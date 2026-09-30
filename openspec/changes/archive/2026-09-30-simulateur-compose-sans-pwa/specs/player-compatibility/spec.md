## ADDED Requirements

### Requirement: Verdict natif unique

Le validateur SHALL evaluer chaque jeu contre le seul canal natif en croisant : conditions d'activation, besoins des modules (`needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock`), `holdMode` et strategies de tuiles. Pour le canal natif il SHALL rendre : `compatible` ou `refuse` (avec chaque motif fautif nomme : noeud, champ, capacite manquante). Il n'existe plus ni verdict PWA ni etat degrade avec repli.

#### Scenario: Quiz compatible natif
- **GIVEN** un jeu QUIZ sans capteur ni verrouillage
- **WHEN** la compatibilite est evaluee
- **THEN** le verdict natif est `compatible`

#### Scenario: Module sans verrouillage refuse sans HOLD
- **GIVEN** un jeu avec un module `needsLock: true` et `holdMode: "none"`
- **WHEN** la compatibilite est evaluee
- **THEN** le verdict natif est `refuse` avec le module fautif nomme

## REMOVED Requirements

### Requirement: Matrice des capacités par player
**Reason**: Plus de matrice multi-canaux ; un seul player natif, dont les capacites sont la reference unique lue depuis une donnee versionnee.
**Migration**: Le validateur evalue contre le canal natif uniquement (voir Requirement Verdict natif unique).

### Requirement: Évaluation jeu et modules par canal
**Reason**: Plus de canal PWA a degrader ou refuser.
**Migration**: Voir Requirement Verdict natif unique ; les replis fallback 2D restent des proprietes de module, pas des verdicts de canal.

### Requirement: Verdicts visibles à l'export et au lancement
**Reason**: Remplace par le verdict natif unique affiche a l'export et revalue au lancement.
**Migration**: L'ecran d'export affiche le verdict natif avant generation et bloque l'export si `refuse` ; au lancement, le player natif revalue et refuse avec motifs si le pack ne lui convient pas.
