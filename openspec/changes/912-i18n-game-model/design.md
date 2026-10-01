## Context

Voir proposal.md (Why). Contraintes : depend de 911 (`schemaVersion` disponible pour la migration), cles stables au renommage, offline-first (langues embarquees), cout croissant si retarde.

## Goals / Non-Goals

**Goals:**
- Jeux de reference bilingues fr/en jouables dans les deux langues, package offline complet.
- Outillage de migration auto des chaines existantes.

**Non-Goals:**
- Editeur de traductions Studio (913), traduction des UI Studio/mobile (914) : ce change fournit le modele, pas les ecrans.

## Decisions

- **Fichiers separes par langue** plutot que dictionnaire inline : diff/pack/manifest par fichier, telechargement differentiel naturel, meme mecanique que les assets.
- **`$t` objet (pas chaine prefixee)** : detection C1 par schema (motif + additionalProperties), impossible a confondre avec un texte.
- **Severite graduee** (defaut = erreur, autre langue = avertissement) : on peut publier partiellement traduit, jamais sans langue par defaut.
- **ICU simplifie** (pluriels + variables) des le debut : evite une seconde migration quand les textes se complexifient.
- **Taille manifest en octets UTF-8** (jamais String.length) : les accents faussaient le `size` (lecon du catalogue existant).

## Risks / Trade-offs

- [Cles instables] Renommage de noeud cassant les cles → Mitigation : Studio migre les cles au renommage, convention `<domaine>.<id>.<champ>` deconnectee du libelle.
- [Package gonfle] Deux langues embarquees → Mitigation : fichiers dedupes par contenu (logique quotas 963/964), avertissement poids en Valider.
