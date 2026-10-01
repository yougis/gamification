## Context

Voir proposal.md (Why). Contraintes : Apple/Google interdisent les secrets en dur, la perte de la cle d'upload Android bloque les MAJ, les certificats iOS expirent. Depend de 900 (pipeline existant).

## Goals / Non-Goals

**Goals:**
- Un second developpeur produit un build signe identique sans recevoir de fichier par message.
- Rotation/perte documentee et testable.

**Non-Goals:**
- Distribution (902), ni gestion des comptes stores.

## Decisions

- **Play App Signing** (Google garde la cle de signature, l'equipe ne garde que la cle d'upload) plutot que self-signing : la perte de l'upload se réinitialise via Play Console, la perte d'une cle self-signee serait fatale.
- **Secrets CI chiffres + gestionnaire d'equipe** (double detention) plutot que CI seule : survie au changement de CI.
- **fastlane `match` en depot prive chiffre** : certificats/profils versionnes et synchronises pour toute l'equipe, plutot que profils manuels par poste.
- **Scan de secrets en CI** (gitleaks ou equivalent) en echec bloquant.

## Risks / Trade-offs

- [Fuite du depot match] Depot chiffre compromis → Mitigation : passphrase hors depot (gestionnaire), revocation + rotation documentee.
- [Perte keystore] → Mitigation : Play App Signing + reset d'upload documente et teste une fois.
