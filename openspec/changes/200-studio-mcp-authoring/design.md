## Context

Voir `proposal.md` (Why). Le schéma 100 fournit structure + exemple ; les specs
000 fournissent sémantique et statuts. Contrainte : le Studio ne redéfinit aucune
règle, il les opère (même schéma, même validateur).

## Goals / Non-Goals

**Goals:**

- Un auteur non technique produit un pack valide et testé sans toucher au JSON.
- Toute sortie Studio est prouvée valide (couches 1+2) et relue par un humain.
- Preview scriptée couvrant toutes les branches sans terrain.

**Non-Goals:**

- Le rendu joueur et l'orchestrateur runtime (400/500), le packaging binaire (300).
- L'hôte définitif du preview (web-mock vs build dev, tranché en 610).
- La génération automatique de contenus narratifs (style, ton : consignes, pas moteur).

## Decisions

- **Formulaires générés depuis les sous-schémas, graphe découplé.** Pourquoi : un
  nouveau module apporte son formulaire sans toucher au canvas. Alternative
  rejetée : formulaires codés en dur par type — casse l'extensibilité du registre.
- **MCP comme backend structuré, pas de LLM en écriture directe.** Pourquoi : chaque
  outil valide AJV avant/après ; aucune production non validée ne sort. Le LLM
  éventuel ne fait que remplir des formulaires, jamais d'export direct.
- **Undo/redo sur état immutable reflétant le JSON.** Pourquoi : l'historique est
  rejouable et diffable ; l'export à tout instant est cohérent.
- **Preview scriptée, pas de simulation GPS.** Pourquoi : prouver la logique
  (branches, latch, pools) sans carte ni capteurs ; le terrain reste au runtime.
  `forceDraw` + bypass = même mécanisme que la triche runtime, flag identique.
- **Overrides plutôt que variantes de graphes.** Pourquoi : un seul graphe à
  valider, N expériences (difficultés/modes) sans explosion combinatoire.

## Risks / Trade-offs

- [Auteur contournant la validation via import JSON brut] → Mitigation : tout
  import repasse couches 1+2 avant édition.
- [Lib de canvas imposée trop tôt] → Mitigation : suggestions seulement ; contrat
  = export conforme, pas l'outil.
- [Fixture qui vieillit] → Mitigation : fixture versionnée avec le schéma,
  rejouée à chaque révision.
