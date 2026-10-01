## Context

Voir proposal.md (Why). Contraintes : builds reproductibles sur runners ephemeres, iOS exigeant un runner macOS + signature, duree < 20 min, jeux de reference comme garde-fous C1/C2.

## Goals / Non-Goals

**Goals:**
- Chaque PR produit un APK installable et un build iOS signe telechargeables.
- Tests moteur + validation C1/C2 des jeux de reference en echec bloquant.

**Non-Goals:**
- Distribution externe (stores, Firebase/TestFlight : change 902).
- Signature release d'equipe (change 901) : ici signature debug/dev uniquement.
- Parite visuelle iOS (change 907) et suite de regression partagee (change 908) consomment ce pipeline sans le definir.

## Decisions

- **GitHub Actions** (runners `ubuntu-latest` + `macos-latest`) plutot que Jenkins local : zero infra a heberger, macOS a la demande, artefacts integres.
- **Fastlane limite au strict necessaire cote iOS** (build + export), le `match` complet arrivant en 901.
- **Validation C1/C2 des jeux de reference dans le meme job que les tests** : un jeu de reference invalide = PR rouge, meme signal que le code.
- **Cache Gradle/CocoaPods/KMP** par cle de lockfile : divise la duree sans risquer le stale (cle incluant OS + hash des lockfiles).

## Risks / Trade-offs

- [Cout macOS] Runners macOS ~10x plus chers → Mitigation : job iOS sur PR uniquement (pas a chaque push de branche draft), APK seul en rapide.
- [Derive TS/KMP] Deux validateurs qui divergent en silence → Mitigation : le job compare les verdicts C1/C2 TS vs KMP sur les jeux de reference (prefiguration de 908).
- [Duree] Premier build froid long → Mitigation : cache + build parallele Android/iOS.
