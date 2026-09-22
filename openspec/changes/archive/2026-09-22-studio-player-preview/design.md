## Context

Voir proposal.md (Why). État observé : le simulateur `Apercu` (App.tsx)
détient tout l'état de simulation (file, `activeId`, tirages forcés,
`sessionId`, HOLD simulé, journal) ; `PhoneCanvas` accepte déjà un mode
sans sélection (`showGhosts={false}`, callbacks optionnels) ; les renderers
joueurs n'existent que pour QUIZ et PUZZLE, sans registre `getPlayer` ;
`resolveScreen` fournit la résolution global → Nœud. Contrainte : ne jamais
écrire dans le JSON source, garder badges et rappel visibles.

## Goals / Non-Goals

**Goals:**

- Mode « Jeux » plein écran branché sur l'état `Apercu` existant, avec
  validation jouée et changements d'écran pilotés par le moteur.
- Aucune duplication du moteur de simulation : le mode est une vue, pas un
  second simulateur.

**Non-Goals:**

- Sélecteur libre d'écrans (« voir l'écran de… ») ; contrôle qualité
  d'habillage automatisé ; renderers joueurs natifs (chantier KMP séparé) ;
  mode HOLD réel ou capteurs réels (tout reste simulé et badgé).

## Decisions

- **D1 — Le mode est une vue sur l'état `Apercu`, pas un état séparé** :
  même file, même `activeId`, mêmes tirages et journal. Alternative
  (dupliquer la simulation) rejetée : deux sources de vérité à synchroniser.
- **D2 — Rendu via `PhoneCanvas` en lecture seule** (`showGhosts={false}`,
  sans handlers de sélection/édition/drag) dans un viewport téléphone en
  chrome mobile plein écran : réutilisation maximale, zéro fork de rendu.
- **D3 — Résolution d'écran via `resolveScreen(nœud, global.screen)`** à
  chaque changement d'ACTIVE, avec repli écran par défaut si absent :
  le mode fonctionne sur tout jeu, habillé ou non.
- **D4 — Registre `getPlayer` minimal + état non bloquant** : QUIZ et PUZZLE
  branchent leurs renderers existants (`onComplete` → même chemin que
  « Terminer ») ; tout autre Module affiche type + boutons
  terminer/abandonner par triche. Alternative (écrire les renderers
  manquants maintenant) rejetée : hors périmètre, chaque renderer est un
  futur change.
- **D5 — Sortie non destructive** (Échap/bouton, état conservé) et rappel
  SIMULÉ permanent dans le chrome : la traçabilité triche ne dépend jamais
  du mode d'affichage.

## Risks / Trade-offs

- [Risk] Divergence avec les rendus natifs KMP → le mode est étiqueté
  simulation auteur dans l'UI, sans promesse de fidélité pixel.
- [Risk] Renderer joueur buggué faussant la simulation → `onComplete`
  transite par le même chemin validé que « Terminer », journalisé SIMULÉ.
- [Trade-off] Modules sans renderer testés seulement en logique (boutons
  triche), pas en interaction : documenté comme limite du mode web.

## Migration Plan

Non applicable (fonctionnalité Studio additive, pas de déploiement) :
le mode coexiste avec le simulateur liste ; rollback = masquer l'entrée.

## Open Questions

- Aucune : la source des visuels et le périmètre (1a+2a de l'exploration,
  navigateur libre et QC en non-goals) sont figés.
