## Context

`smart-tile-caching` (terminé, 20/20) a livré : menu « Packs de carte », stratégies bbox, store multi-cache (`tile-packs.ts`), pack actif (`global.tilePackId`), cache serveur des MÉTAS (`/tilepacks`), et résolveurs de fond (`fondEffectifWidget`, `selectFondWidget`). Constat (voir exploration) : le pack « généré » ne contient aucun octet de tuile, les résolveurs n'ont aucun appelant, et `MapWidgetRenderer` reste schématique (`#14141f` + marqueurs). Les seules vraies tuiles du Studio sont celles de `MapView` (MapLibre + proxy dev `/tiles`, en ligne). Voir proposal.md (Why) et les deltas de specs pour le contrat.

## Goals / Non-Goals

**Goals:**
- Phase A : brancher l'actif dans l'aperçu (pastille/repli), sans nouvelles données.
- Phase B : afficher de vraies tuiles dans le PhoneCanvas auteur (en ligne, badgé), JSON inchangé.
- Phase C : télécharger/stocker/embarquer les vrais octets (pack joueur offline réel).

**Non-Goals:**
- Rendu joueur natif/PWA des tuiles (renderers dédiés, change ultérieur ; le contrat manifest les couvre déjà).
- Nouveau provider ou nouveau fond : réutilisation verbatim de `pack-tiles` et du proxy existant.
- Cache navigateur des tuiles (natif/mobile, hors Studio).

## Decisions

### D1: Phasage A → B → C dans l'ordre, chaque phase livrable seule

**Choix:** A (câblage pur, zéro réseau), puis B (preview en ligne), puis C (octets + serveur + export).

**Raison:** A corrige un mensonge d'UI sans risque ; B donne la valeur auteur sans toucher au modèle de données ; C est la seule phase à risque (stockage, politique provider, volumes) et s'appuie sur A+B déjà stabilisés. Chaque phase se vérifie par son smoke.

**Alternative rejetée :** tout d'un bloc — C bloque A/B en cas de pépin serveur.

### D2: L'aperçu en ligne ne touche jamais au JSON (phase B)

**Choix:** Les tuiles d'aperçu sont chargées par le renderer via la source d'aperçu du Studio (proxy `/tiles` existant), jamais écrites dans `MapWidget.background` ni le manifest.

**Raison:** Préserve le contrat pack-only strict des données (spec parente) : l'exception « aperçu » est un comportement de rendu auteur, badgé, avec repli schématique hors-ligne.

### D3: Octets adressés par clé de tuile, hachés au manifest (phase C)

**Choix:** Clé `tuiles/{z}/{x}/{y}.png`, stockage serveur sous `<gameId>/tilepacks/<pack>/tuiles/...`, une entrée manifest par tuile `{path, version, size, sha256}`.

**Raison:** Réutilise tel quel le pipeline existant (vérification, différentiel, reprise, gating non-lançable) sans nouveau format : les tuiles deviennent des fichiers du pack comme les autres.

### D4: Politique provider explicite et bornée (phase C)

**Choix:** Attribution obligatoire (affichée + embarquée), throttle (délai entre requêtes + concurrence bornée), périmètre strict bbox calculée, échec nommé avec seuil de retries.

**Raison:** La config `vite.config.ts` rappelle déjà la politique d'usage OSM ; sans garde-fous, la génération devient un scraper. Le périmètre borné + l'estimation pré-génération (déjà au menu) rendent l'abus structurellement difficile.

## Risks / Trade-offs

- **[Volume]** → Une bbox large × zooms 10..16 = dizaines de milliers de tuiles. Mitigation : estimation bloquante avant génération (seuil de confirmation), zooms par défaut resserrés, échec nommé sans tout perdre.
- **[Politique OSM]** → Bannissement en cas d'abus. Mitigation : D4 + un seul provider configurable, jamais de parallélisme agressif.
- **[Stockage serveur]** → Octets × packs × projets. Mitigation : suppression purge métas+octets (spec), pas de versionning des octets (le pack est snapshoté, régénérable).
- **[Dérive aperçu/joueur]** → L'aperçu en ligne (B) peut montrer des tuiles plus fraîches que le pack. Mitigation : badge « aperçu en ligne » permanent + pastille du pack actif (zoom/bbox du pack, pas du viewport libre).
