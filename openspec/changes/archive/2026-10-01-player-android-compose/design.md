## Context

Voir proposal.md (Why). État actuel : `:app` sans dépendance Compose, `GameFragment` (titre + `rvQueue` + HOME texte + toolbox) et `ModuleFragment` (titre seul) ; iOS héberge `GeoPlayApp` via `ComposeView` ; `MapWidget` partagé rend un fond schématique (tuiles natives : aucun shell ne les fournit aujourd'hui).

## Goals / Non-Goals

**Goals:**
- Android affiche HOME, carte, écrans, quiz via le `commonMain`, à parité iOS/simu.
- Fragments réduits à coquilles (nav, cycle de vie) + providers natifs.
- Bascule en une fois, legacy supprimé.

**Non-Goals:**
- Tuiles natives (fond schématique des deux côtés, change dédié).
- AR/boussole natifs au-delà des stubs existants.
- Import, sessions, SQLite, catalogue local (inchangés).

## Decisions

- **Hébergement `ComposeView` comme iOS** plutôt que réécriture : un seul renderer à maintenir, parité par construction ; alternative rejetée (porter les écrans en View = troisième implémentation).
- **Fragments coquilles conservés** (pas d'Activity Compose pure) : navigation existante, permissions, cycle de vie et catalogue local restent en place ; seul le contenu d'écran bascule.
- **Providers natifs à la frontière** (`kmp-native-boundary`) : GPS, fichiers/assets, et plus tard caméra/boussole ; aucune logique moteur dupliquée côté `androidMain`.
- **Tuiles : statut quo partagé** : le fond schématique reste la référence des deux shells ; l'overlay de tuiles natives fera l'objet d'un change symétrique Android+iOS.

## Risks / Trade-offs

- [Risk] Écart de comportement entre fragments legacy supprimés et Compose (ex. toolbox dialog) → Mitigation : `HomeDashboard`/`toolbox` partagés déjà utilisés par iOS ; rejouer la fixture 2pts sur Android avant suppression.
- [Risk] Taille APK / temps de build (Compose + navigation) → Mitigation : dépendances déjà présentes via `:shared`, pas de nouveau SDK.
- [Risk] Régression import/catalogue (fragments touchés) → Mitigation : `player-local-catalog` rejoué sur tablette après bascule.

## Migration Plan

Bascule en une fois, sans flag. Rollback = revert (aucune donnée migrée, packs et SQLite inchangés).

## Open Questions

Aucune.
