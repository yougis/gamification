## Context

Voir proposal.md (Why). Contraintes : heritage global -> screen -> widget conserve, compatibilite ascendante (jeux sans tokens = theme par defaut), contraste AA, zero couleur en dur a la fin.

## Goals / Non-Goals

**Goals:**
- Roles de tokens uniques consommés par Studio, simulateur et runtime.
- Mode sombre propre verifie par test visuel automatise.

**Non-Goals:**
- Catalogue de themes premium et editeur de theme (945, reserve `advanced`).
- Variantes de widgets exotiques (couvertes par le mecanisme, non peuplees ici).

## Decisions

- **Roles semantiques plutot que palette nommee** (« bleu canard ») : le sens (surface, onAccent) survit au rebranding, la palette non.
- **Theme = tokens light+dark + variants** : le mode sombre est une selection, pas un second jeu de composants.
- **C2 en avertissement (pas erreur)** pour les litteraux : les jeux existants restent exportables pendant la migration, le lint Studio pousse la correction.
- **Test visuel par captures** (sherlock + 5poi, clair/sombre) plutot que revue manuelle : non-regression permanente.

## Risks / Trade-offs

- [Migration longue] Des centaines de couleurs en dur → Mitigation : script de migration + lint avec correctif, jeux de reference migres en premier.
- [Contraste AA sur images de fond] Le ratio texte/fond varie → Mitigation : overlay configurable + calcul sur couple effectif, avertissement sinon.
