## Context

Voir `proposal.md`. État observé : INFO absent de `registry.json`, de `module-registry.ts` et des plugins (`plugins/` : quiz, puzzle, code-input, difference-game, ar-marker, boussole) ; `TYPES_MODULE = ["INFO", ...Object.keys(registre), "RANDOM_POOL"]` ; aucun précédent vidéo/audio dans le Studio ni le player (médias = terrain vierge) ; le nœud `start` de Sherlock porte `data: { backgroundImage }` ad hoc.

## Goals / Non-Goals

**Goals:**
- INFO devient un module à part entière : schéma strict, aperçu, formulaire, renderer.
- Médias offline par construction (même circuit que les images).
- Migration Sherlock documentée et triviale (1 nœud).

**Non-Goals:**
- Streaming, sous-titres, chapitres vidéo, audio de fond multi-écrans.
- Autoplay (banni : coût batterie/données + surprise en borne).
- Nouveau type de widget générique (texte/image/bouton existants inchangés ; le multimédia vit dans le renderer INFO, pas dans le système de widgets).

## Decisions

- **Données `steps[]` dans `module.data`, pas en widgets** : le récit est le contenu du module, pas une composition d'écran ; le `defaultScreen` reste standard (header/content/footer) et le widget `{ type: "module" }` affiche le récit paginé. Alternative écartée : tout en widgets (texte/image + futurs widgets vidéo/audio) — disperserait la pagination et forcerait deux nouveaux types de widgets pour un seul usage.
- **Swipe ET bouton, pas l'un ou l'autre** : swipe = usage tactile naturel, bouton « Suivant » = accessibilité (clavier, Switch, motricité réduite) et découvrabilité. Les deux appellent le même `avancer()`.
- **Médias = assets manifestés** : vidéo/audio suivent exactement le circuit images (ImagePicker généralisé en sélecteur de fichier pack avec filtre par extension, SHA-256, gabarit affiché). Alternative écartée : URLs distantes — interdites par l'offline-first.
- **C1 stricte avec migration assumée** : `additionalProperties: false` comme les 5 sous-schémas socle ; le `backgroundImage` ad hoc de Sherlock migre vers le `screen.background` déjà équivalent (l'écran `start` l'a déjà) + première étape texte. En dev, pas de compat ascendante (décision déjà actée pour ce périmètre).
- **Fin = `onComplete`** : la validation de la dernière étape termine le Nœud comme tout mini-jeu (même callback, même journal), sans essai ni temps (pas de `maxAttempts`/`timeLimitSeconds` : un récit ne se « rate » pas).

## Risks / Trade-offs

- [Poids vidéo] → gabarit affiché avant validation + quota manifest existant ; recommandation auteur : clips courts (< 30 s), pas de 4K.
- [KMP natif] → lecteurs plateforme (AVPlayer/ExoPlayer) derrière l'abstraction renderer ; le contrat playerRenderer (data + onComplete) ne change pas.
- [Lecture auto accidentelle] → revue explicite : aucun `autoplay`/`play()` au montage dans l'aperçu comme dans le renderer.

## Migration Plan

Sherlock `start` : supprimer `module.data.backgroundImage`, créer `steps: [{ text: <briefing> }]` (+ image existante si souhaité) ; revalider C1+C2. Rollback = retirer l'entrée registre (INFO redevient type nu, données libres).
