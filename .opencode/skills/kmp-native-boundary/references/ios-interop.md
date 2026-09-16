# Détail — interop Kotlin/Native ↔ Swift/Objective-C

Charger ce fichier quand une tâche implique d'écrire ou de revoir un `actual` côté iOS.

## 1. Cinterop Objective-C direct (chemin par défaut)

La plupart des frameworks système Apple pertinents pour GeoPlay sont Objective-C : CoreBluetooth, MultipeerConnectivity, UIAccessibility (accès guidé). Kotlin/Native interopère nativement avec l'Objective-C via `cinterop` — l'`actual` iOS peut appeler ces API directement en Kotlin, sans écrire une seule ligne de Swift.

C'est le chemin à utiliser par défaut pour :
- Détection/scan/advertising BLE
- MultipeerConnectivity (mesh iOS)
- Détection de l'état d'accès guidé (`UIAccessibility.isGuidedAccessEnabled`)

Limite connue : `UIAccessibility.requestGuidedAccessSession` (déclenchement programmatique, pas juste détection) ne fonctionne que sur appareils supervisés via MDM. Ce n'est pas une limite de l'interop, c'est une contrainte système — elle s'applique identiquement quel que soit le framework choisi (KMP, Flutter, natif pur).

## 2. Shim Swift pour SDK tiers Swift-only

Si une dépendance externe (ex. un SDK mesh commercial) n'expose qu'une API Swift sans compatibilité Objective-C :

1. Écrire un petit module Swift qui wrappe le SDK et expose une interface annotée `@objc` (types simples, pas de generics complexes, pas de Swift-only features comme les protocols avec associated types).
2. Consommer ce wrapper `@objc` depuis Kotlin via cinterop, comme pour un framework système.
3. Garder ce shim aussi mince que possible — sa seule responsabilité est la traduction, pas de logique.

## 3. SKIE — pour exposer une API Kotlin riche vers Swift

Nécessaire seulement dans le sens inverse (Kotlin → Swift) quand du code Swift (ex. une future UI SwiftUI, un module Swift tiers qui a besoin de consommer notre logique partagée) doit consommer une API `commonMain` qui utilise `Flow`, des `sealed class`, ou des fonctions `suspend`.

Sans SKIE, le pont Objective-C classique dégrade ces types : les `sealed class` deviennent des classes ordinaires, les `Flow` deviennent des interfaces de callback peu ergonomiques. SKIE (plugin de compilation, Touchlab) restaure une consommation idiomatique côté Swift (`Flow` → `AsyncSequence`, `sealed class` → `enum` Swift avec pattern matching exhaustif). C'est l'option éprouvée en production aujourd'hui pour ce cas — à préférer à Swift Export tant que ce dernier reste en Alpha.

## 4. Swift Export — à surveiller, pas à utiliser en production

Approche officielle JetBrains qui élimine l'intermédiaire Objective-C. Disponible par défaut depuis Kotlin 2.2.20, mais :
- Statut Alpha, changements cassants attendus.
- Limitations connues sur les génériques (plus restrictif que le pont Objective-C/SKIE, peut échouer à compiler pour certains paramètres de type non-Kotlin).

Ne pas basculer la production dessus sans revalider ce statut — ce qui est vrai aujourd'hui peut avoir changé, vérifier la documentation Kotlin officielle avant toute décision d'architecture qui en dépend.

## 5. Points de friction à anticiper systématiquement

- **Paramètres par défaut** : ne traversent jamais la frontière Kotlin→Swift. Écrire des surcharges explicites dans le contrat `expect` si l'ergonomie côté Swift compte.
- **Génériques** : le point le plus fragile quel que soit le pont utilisé. Éviter les génériques dans les signatures `expect`/`actual` exposées aux deux mondes ; préférer des types concrets ou des wrappers non génériques à la frontière.
- **Mémoire pour objets natifs volumineux** (ex. buffers caméra, gros payloads BLE) : rester vigilant sur la gestion mémoire Kotlin/Native pour ce type d'objet, historiquement un point de friction documenté.
- **Testabilité radio** : BLE, Wi-Fi Direct/Aware, MultipeerConnectivity ne se testent pas en test unitaire pur. Prévoir des tests instrumentés sur device/simulateur dès la planification, pas comme un ajout de dernière minute.
