## Context

Le projet GeoPlay possede une architecture complexe a plusieurs couches (Studio, Jeu, Moteur/Runtime) avec des regles structurales definies dans `openspec/config.yaml` et `openspec/specs/`. L'agent principal (`AGENTS.md`) actuel ne reflete pas de maniere structurante ces principes, ce qui genere des incoherences dans la generation de code et la prise de decisions. Il n'existe pas non plus de documentation cible pour les differents profils de parties prenantes.

Le change `100` (schema Draft-07) et les changes suivants (200-640) ont etabli des patterns de spec-drive development avec OpenSpec. L'agent doit maintenant integrer ces principes comme regles transverse explicites.

## Goals / Non-Goals

**Goals:**
- Refondre `AGENTS.md` pour qu'il integre les grands principes structurants du systeme comme filtre de decision pour l'agent
- Creer des profils de documentation technique et fonctionnelle pour chaque type de partie prenante
- Permettre a l'agent d'adapter ses reponses selon le profil cible

**Non-Goals:**
- Modifier le schema Draft-07 ou les spec existantes
- Changer le comportement du moteur runtime ou du Studio
- Modifier les fichiers de code source du projet

## Decisions

1. **AGENTS.md comme source de verite de l'agent** : `AGENTS.md` sera la seule source des regles de comportement de l'agent principal. Il integrera les principes de `openspec/config.yaml` sans les dupliquer, mais en les structurenant pour la prise de decision.
2. **Profils de documentation separates** : Chaque profil (utilisateur, createur, developpeur, mainteneur, financeur/partenaire) aura son propre fichier de documentation dans une structure `docs/profiles/`. Cela permet une maintenance independente.
3. **Pas de `skip_specs: true` pour le changement lui-meme** — Le changement est un changement de configuration/documentation de l'agent, pas un changement de behavior spec-level. Le fichier `.openspec.yaml` declare `skip_specs: true` car aucune exigence spec-level n'est modifiee.
4. **Utilisation des skills existants** : Les skills GeoPlay (geoplay-spec-validator, geoplay-graph-architect, etc.) sont les outils de l'agent. Ils ne sont pas modifies mais leur integration dans les differents profils est documentee.

## Risks / Trade-offs

- **Risque** : L'agent pourrait ne pas adapter correctement ses reponses si les principes structurants ne sont pas suffisamment explicites dans `AGENTS.md`.
  - **Mitigation** : Tests de validation avec des scenarios pour chaque profil apres implementation.
- **Risque** : La documentation des profils pourrait devenir stale si le schema change.
  - **Mitigation** : Integration de verification automatique lors de l'archive des changes OpenSpec.
- **Trade-off** : Documentation comprehensive vs concision. Plus il y a de profils, plus la maintenance est lourde.
  - **Resolution** : Documentation minimale viable par profil avec des sections claires et des liens vers les specs existantes.

## Open Questions

- Le format des fichiers de documentation pour les profils (Markdown, structure de docs existante du projet) reste a confirmer
- L'emplacement exact des fichiers de profil (racine `docs/` ou sous-repertoire specific) a valider avec le maintaineur
- Les regles de l'agent doivent-elles inclure des templates de reponses par profil ou seulement des filtres de decision ?
