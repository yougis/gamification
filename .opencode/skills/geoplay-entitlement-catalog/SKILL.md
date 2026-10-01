---
name: geoplay-entitlement-catalog
description: Cadre les droits GeoPlay (roles, plans, entitlements, catalogue generique, C3, licence signee, quotas, Shop). A utiliser pour tout change M4/M5 droits, catalogues, monetisation et licences.
---

# Skill : geoplay-entitlement-catalog

Specialiste des droits et catalogues GeoPlay (jalons M4/M5).

## Modele

- **Droit effectif = entitlements(role) + entitlements(plan) + achats actifs.** Chaine `type:identifiant` (joker possible), quotas `quota:cle=valeur`.
- **Catalogue generique** : table `catalog_item` (template|theme|layout|widget|module|object-pack), payload valide par schema du type, `requires[]` (OU par defaut, `requiresAll` pour ET), visibilites public|private|org, versions, champ calcule `access: granted|locked`.
- **C3** : tout element utilise doit etre couvert. Erreur a la publication (serveur autoritaire), avertissement en edition (Studio indicatif, cadenas + lien Shop).
- **Licence signee** : `license.json` EdDSA Ed25519 (gameId, version, publisherId, entitlements, iat, exp?, kid), cle publique + kid dans l'app avec rotation, verification offline, versions publiees immuables restant jouables apres expiration (seule la publication est bloquee, grace 30 j), sans licence accepte si 100 % public, alteree = E_LICENSE_INVALID.
- **Quotas** : compteurs mensuels, stockage adresse par contenu (sha256), tuiles mutualisees en extraits regionaux, transcodage media ; depassement bloque publication/import, jamais lecture/jeu.
- **Shop web** : produits, Stripe Checkout + webhooks idempotents, TVA, factures, portail client, remboursements/retraits sans casser les versions publiees. Aucun achat/prix/lien Shop dans l'app mobile (regle prudente stores, avis juridique avant M5).
- **Moderation** : etats none|pending|approved|rejected|removed sur version publique, prive/sur invitation jamais modere, public famille en a priori ou contenus plateforme seuls, pas de social ouvert entre inconnus.

## Instructions

- Prepare la marketplace sans la construire : `game:play/fork/resell` prevus, clonage lie, dependances sous licence, Stripe Connect/fiscalite hors perimetre documentes.
- Journalise les octrois (audit), expose `GET /me/entitlements`, versionne les references `{id, version}` (MAJ explicite jamais silencieuse).
- Controverse juridique (liens achats externes 3.1.1) = risque suivi, mitigation app sans prix/lien + droits portes par le createur.
