## Context

Voir `proposal.md` (Why). Le Studio exporte déjà des packs valides ; la logique
d'évaluation (`evaluate.ts`, `runtime.ts`, `pack.ts`) est prouvée en TS pur ;
les specs 000/100/300/400/500 + `proximity` sont la norme d'exécution.

## Goals / Non-Goals

**Goals:**

- Un joueur installe 1 app et joue n'importe quel pack Studio offline.
- Le pack `reference-5poi` est jouable de bout en bout comme preuve.
- Distribution réaliste dès le POC (sideload associatif, pas seulement émulateur).

**Non-Goals:**

- L'APK blanche par jeu (option B, pipeline ultérieur documenté seulement).
- La resync serveur/P2P (différé 600), le rendu iOS (plateforme ultérieure).
- Les rendus modules au-delà des fallbacks socle (détail au fil de l'eau).

## Decisions

- **Player générique + packs, pas d'app par jeu.** Pourquoi : zéro infra de build
  par jeu, pas de review Play par contenu, packs versionnés indépendamment.
  Alternative rejetée (pour l'instant) : APK blanche — coût CI/signature/store
  par jeu, reportée en pipeline documenté.
- **Réutiliser le cœur TS prouvé (`evaluate`, `runtime`, `pack`, `validate`).**
  Pourquoi : la sémantique est déjà testée (smokes) ; la dupliquer en natif pur
  garantirait la divergence. Choix d'enveloppe (Capacitor vs Kotlin pur) tranché
  en implémentation : Capacitor si le TS suffit aux capteurs, Kotlin sinon —
  le cœur logique reste partagé et testé ici.
- **Import QR/lien/fichier avec gating manifest.** Pourquoi : borne associative
  sans compte Google + tablettes offline ; le pack partiel ne lance jamais.
- **`versionCode` app vs `version` pack découplés.** Pourquoi : une mise à jour
  de contenu ne doit jamais exiger une mise à jour d'app (ni l'inverse).
- **Permissions justifiées dans le flux.** Pourquoi : un refus OS tue une méthode
  (BLE, caméra, localisation) ; chaque demande explique son usage et propose le
  secours (QR/code/fallback 2D).

## Risks / Trade-offs

- [Enveloppe Capacitor insuffisante pour BLE fin/arrière-plan] → Mitigation :
  plugins natifs ciblés ou bascule Kotlin, cœur TS inchangé et re-testé.
- [Sideload bloqué par politique MDM associative] → Mitigation : Play Interne
  comme second canal dès la v1.
- [Pack volumineux sur petit appareil] → Mitigation : chiffrage avant import
  (règle `offline-pack`), packs par zone.
- [Fond de carte sans tuiles en grotte] → Mitigation : fallback statique/uni
  + trace + flèche (règle existante).
