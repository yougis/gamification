## Context

Voir `proposal.md` (Why). Contraintes : socle 000 (graphe, `latch`, file ACTIVE,
`forceDraw`+flag, validateur 2 couches, offline natif fichiers+SQLite), pas de
balise fixe, BLE advertise standard + WiFi local + imprimés, 100 % offline.

## Goals / Non-Goals

**Goals:**

- Une condition `PROXIMITY_MASTER` au même contrat que `GEOFENCE` (révocable,
  `latch`, hystérésis, file), sans toucher aux états ni au validateur structurel.
- Méthodes déclaratives (QR, code tournant, AR, animateur) via modules existants.
- Matrice milieux guidant l'auteur sans nouveau schéma.

**Non-Goals:**

- Balises BLE fixes et leur exploitation (pas de pose, pas de cartographie RSSI).
- Sync P2P/serveur (différé 600 ; seul le rôle hub du MASTER est noté).
- Seuils RSSI numériques par défaut (figés en implémentation, pas ici).

## Decisions

- **`PROXIMITY_MASTER` plutôt qu'un `GEOFENCE` dégradé.** Pourquoi : un UUID/RSSI
  n'est pas une coordonnée ; forcer lat/lng fictives corromprait les packs carte
  et la traçabilité. Alternative rejetée : POI GPS bidon au centre de la grotte.
- **Même sémantique révocable que `GEOFENCE`, pas un nouveau régime.** Pourquoi :
  `latch`, hystérésis, file ACTIVE et hypothèse favorable s'appliquent sans
  toucher au moteur d'évaluation. Alternative rejetée : état supplémentaire.
- **Déclaratif via modules + `NODE_COMPLETED`.** Pourquoi : QR/code/AR/animateur
  prouvent un geste, pas une position ; l'orchestrateur ne voit que la complétion.
  Alternative rejetée : conditions `QR_SEEN`/`CODE_OK` dans le graphe — couplerait
  l'orchestrateur aux gestes et multiplierait les types révocables/non-révocables.
- **Code tournant plutôt que QR seul à enjeu.** Pourquoi : un QR affiché se
  photographie ; le code renouvelé par l'animateur prouve la présence temporelle.
  QR seul réservé au ludique sans enjeu.
- **MASTER = hub présence + futur hub resync, mais spécifiés séparément.** Pourquoi :
  éviter que ce change absorbe le différé 600 ; seul le rôle présence est normatif ici.

## Risks / Trade-offs

- [RSSI traverse les murs fins → faux positifs inter-salles] → Mitigation : `dwell`
  + seuils par salle + `latch:false` sur les sas.
- [Permissions Bluetooth refusées] → Mitigation : demande justifiée dans le flux +
  secours QR/code systématique sur les nœuds `PROXIMITY_MASTER`.
- [MASTER téléphone à plat] → Mitigation : checklist batterie externe + Arduino de
  rechange avec même `masterId`.
- [`masterId` copié (Arduino cloné)] → Mitigation : rotation au Studio + couplage
  code tournant si score en jeu.
- [Hotspot WiFi = portée trop large] → Mitigation : WiFi en renfort/resync,
  preuve fine réservée au BLE.

## Migration Plan

Additif pur : une entrée d'enum + une section Studio. Jeux existants inchangés,
validateur étendu d'une règle (condition environnementale). Rollback = ignorer
gracieusement `PROXIMITY_MASTER` (même politique que les réserves).

## Open Questions

- Seuils RSSI par défaut par milieu (à calibrer sur campagne terrain, en
  implémentation, sans changer specs).
