---
name: kmp-native-boundary
description: >
  Applique et fait respecter le principe d'architecture "base Kotlin Multiplatform
  partagée plus modules natifs ciblés uniquement à la frontière matérielle/OS" pour
  le runtime GeoPlay. Utilise ce skill à chaque fois qu'une tâche de code, de revue,
  ou de proposal OpenSpec touche le runtime joueur (Android/iOS), une fonctionnalité
  matérielle (BLE, mesh, GPS, caméra, capteurs, accès guidé/kiosque,
  MultipeerConnectivity, Wi-Fi Direct/Aware), une décision de placement de code
  (commonMain vs androidMain vs iosMain), ou l'écriture/revue d'un module natif quel
  qu'il soit. Se déclenche aussi pour toute question du type "faut-il un module natif
  pour X ?", pour la revue d'une pull request touchant androidMain/iosMain, et pour
  la rédaction ou la revue d'un change OpenSpec dont le scope inclut le runtime. Ne
  pas attendre une demande explicite de vérification d'architecture -- consulter ce
  skill dès qu'un fichier sous androidMain/ ou iosMain/ est créé, modifié, ou proposé
  dans un plan.
---

# Frontière natif/partagé — runtime GeoPlay

## Principe (non négociable, même statut que le principe cardinal du Studio)

Le runtime GeoPlay est une base Kotlin Multiplatform (KMP) partagée. Le code natif par plateforme (`androidMain`, `iosMain`) n'existe **que** pour ce que `commonMain` ne peut structurellement pas faire : parler aux API radio/OS bas niveau (BLE, Wi-Fi Direct/Aware, MultipeerConnectivity, accès guidé/Guided Access, caméra bas niveau, capteurs).

Tout le reste — logique de jeu, élection MASTER/LEADER, réaction à un événement de détection, règles de scoring, validation, machine à états HOLD — vit dans `commonMain`, sans exception justifiée par la "simplicité" ou la "rapidité" d'écrire directement côté plateforme.

**Si tu (l'agent) es sur le point d'écrire de la logique métier dans `androidMain` ou `iosMain` : arrête-toi.** C'est le signal que quelque chose s'est mal placé, pas une fonctionnalité à ajouter. Remonte cette logique vers `commonMain` et ne laisse dans le module natif que l'appel à l'API plateforme elle-même.

## Checklist de décision — où va ce code ?

Avant d'écrire quoi que ce soit, réponds à ces questions dans l'ordre :

1. **Cette fonctionnalité touche-t-elle une API radio/OS qui n'a pas d'équivalent dans une lib KMP existante ?**
   - Non → `commonMain`, fin de la question.
   - Oui → continue.
2. **L'API native nécessaire est-elle Objective-C ou C** (CoreBluetooth, MultipeerConnectivity, UIAccessibility, la plupart des frameworks système Apple) ?
   - Oui → écris l'`actual` iOS **directement en Kotlin via cinterop**, sans passer par Swift. Voir `references/ios-interop.md`.
   - Non (SDK tiers Swift-only) → il faut un pont Swift→Kotlin. Voir `references/ios-interop.md` section SKIE/Swift Export.
3. **Le comportement doit-il être identique entre Android et iOS** (ex. élection de leader, format d'un événement de détection) ?
   - Oui (c'est presque toujours le cas) → le contrat est un type/interface `commonMain`, jamais dupliqué à la main dans les deux `actual`.
4. **Cette tâche fait-elle partie d'un change OpenSpec ?** → applique la section "Intégration OpenSpec" ci-dessous avant de considérer la tâche terminée.

## Patron d'implémentation obligatoire

```kotlin
// commonMain — le contrat, une seule fois, jamais dupliqué
expect class MeshTransport() {
    fun startAdvertising(serviceId: String)
    fun startDiscovery(): Flow<PeerEvent>
    suspend fun sendPayload(peerId: String, data: ByteArray)
}
```

- Le nom du type, la forme de l'API, et toute logique de plus haut niveau (retry, routing multi-hop, élection de leader) restent en `commonMain`, au-dessus de ce contrat.
- Chaque `actual` (`androidMain`, `iosMain`) ne fait que traduire ce contrat vers l'API système. Si un `actual` contient plus qu'une traduction directe (une règle métier, une décision de jeu), c'est une erreur de placement — la corriger avant de continuer, pas après.
- Ne jamais introduire de `if (Platform.isIOS)` dans `commonMain` pour contourner `expect`/`actual` — c'est le signe qu'on recrée manuellement ce que le compilateur devrait garantir.

## Interop iOS — résumé (détail complet dans `references/ios-interop.md`)

| Situation | Approche recommandée |
|---|---|
| API système Apple en Objective-C (BLE, MultipeerConnectivity, UIAccessibility) | Kotlin/Native cinterop direct, pas de Swift intermédiaire |
| SDK tiers Swift-only à consommer | Écrire un petit shim Swift, l'exposer côté Kotlin |
| API Kotlin riche (Flow, sealed class) à exposer proprement côté Swift | SKIE (éprouvé en prod) |
| Swift Export officiel JetBrains | **Ne pas utiliser en production tant qu'il est en Alpha** — limitations connues sur les génériques, breaking changes attendus |
| Paramètres par défaut dans une signature `expect`/`actual` exposée à Swift | Écrire des surcharges explicites — ils ne traversent pas la frontière |

## Exigence de test — non négociable

Toute fonctionnalité avec un `actual` par plateforme doit avoir :

1. **Un test de contrat dans `commonTest`**, exécuté contre une implémentation fake de l'interface `expect`, qui vérifie le comportement métier indépendamment de la plateforme.
2. **Un test instrumenté par plateforme** qui vérifie que l'`actual` réel respecte bien le contrat (les radios/BLE ne se testent pas en test unitaire pur — device ou simulateur requis).

Une PR qui ajoute un `actual` sans son pendant dans `commonTest`/tests instrumentés doit être signalée comme incomplète, même si le code compile et fonctionne en usage manuel.

## Anti-patterns à bloquer en revue

- Logique métier écrite directement dans `androidMain` ou `iosMain` "pour aller plus vite".
- Deux implémentations de la même règle (ex. seuil de distance pour "peer détecté") écrites séparément dans chaque `actual` au lieu d'être calculées une fois en `commonMain` à partir d'une donnée brute fournie par l'`actual`.
- Un module natif qui expose plus que ce que son `expect` déclare — signe qu'une partie de l'API a été conçue à l'envers, en partant du natif plutôt que du contrat commun.
- Contournement de `expect`/`actual` par des `typealias` ou des branchements de build ad hoc.

## Intégration OpenSpec

Tout change OpenSpec dont le scope touche le runtime (`androidMain`, `iosMain`, ou toute fonctionnalité matérielle listée en description de ce skill) doit, dans son `proposal.md` :

- Déclarer explicitement quel module natif est concerné et **pourquoi** cette fonctionnalité ne peut pas vivre en `commonMain` (référence directe au principe ci-dessus — pas de placement natif sans justification écrite).
- Lister le contrat `expect` correspondant (nom, signature) s'il existe déjà, ou le proposer s'il est nouveau.
- Inclure dans `tasks.md` une tâche explicite de test de contrat (`commonTest`) en plus de l'implémentation par plateforme — ne pas la sous-entendre dans la tâche d'implémentation.

Si un proposal ne remplit pas ces conditions alors que son scope touche le runtime, renvoie-le en révision avant de passer à l'implémentation — ne complète pas silencieusement à sa place, le manque doit être visible dans le proposal lui-même pour rester traçable dans l'historique des changes.
