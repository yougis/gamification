## Context

Voir `proposal.md`. État vérifié : PWA importe par fichier/URL/code+service (`Main.kt:424-458`), pré-remplit `?code`/`?service` (lignes 383-417), panneau triche fermé par défaut (bypass, position simuée, tirages forcés). Studio Vite avec précédent proxy `/tiles` (`vite.config.ts`). `VIEWPORTS` existe côté Studio. Terminal React et dashboard statique cohabitent (inchangés).

## Goals / Non-Goals

**Goals:**
- Jouer le vrai jeu courant dans Prévisualiser via iframe PWA, tous viewports.
- Démarrer la PWA émulée directement en triche (bypass/position/tirages pilotés à la main dans son panneau natif).
- Zéro pollution des vraies parties, cible PWA sans build local par défaut.

**Non-Goals:**
- Pas de postMessage (marche 2), pas de pilotage depuis `Apercu`, pas de relecture journal.
- Pas de vocabulaire `action` boutons, pas de suppression du terminal React.
- Pas de support hors-ligne de l'émulation (PC dev exigé, assumé).

## Decisions

- **Endpoint `/emulate` via plugin Vite (`configureServer`) plutôt que proxy.** Pourquoi : sert du contenu généré (JSON courant, manifest reconstruit, assets de session `assetsSession`), pas une cible distante. Alternative rejetée : `vite preview` du dist web local (impose le build Gradle à chaque essai auteur).
- **Routes : `/emulate/game.json`, `/emulate/manifest.json`, `/emulate/compat.json`, `/emulate/assets/*`.** Pourquoi : réutilise le chargeur URL existant de la PWA (`onLoadUrl`, base + manifest + compat) sans toucher son pipeline d'ingest. Alternative rejetée : postMessage dès la marche 1 (protocole à designer, reporté).
- **`?game=<url-encoded>` + `?cheat=1` côté PWA.** Pourquoi : prolonge le mécanisme `?code`/`?service` existant, auto-charge + pré-ouvre la triche. Alternative rejetée : hash (`#`) — moins lisible, même coût.
- **Sessions namespacées (`?session=<id>` ou préfixe stockage `emulate.`).** Pourquoi : WebStorage partagé par origin ; sans namespace, l'émulation écrase/relit les parties réelles. Alternative rejetée : vider le stockage à chaque émulation (destructif).
- **Cible PWA configurable, défaut = URL déployée stable.** Pourquoi : zéro build Gradle pendant l'authoring (le jeu change, pas la PWA) ; build local en repli documenté. Alternative rejetée : build local obligatoire (minutes par essai).
- **Iframe dimensionnée aux `VIEWPORTS` Studio + sélecteur existant.** Pourquoi : réutilise `screenViewport`, mise à l'échelle plein-cadre déjà maîtrisée. Sandbox iframe standard, `Échap`/Quitter existants conservés.

## Risks / Trade-offs

- [PWA injoignable (URL déployée down, build local absent)] → Mitigation : état explicite + bascule de cible, jamais d'iframe vide silencieuse.
- [Assets lourds via `/emulate/assets/*`] → Mitigation : lecture depuis `assetsSession` (mémoire), pas de persistance, limite documentée.
- [Manifest SHA-256 du jeu courant] → Mitigation : reconstruit via `buildManifest` existant (même code que l'export), refus explicite si asset manquant.
- [Clavier/focus piégé dans l'iframe] → Mitigation : Quitter/Échap gérés côté Studio (l'iframe ne capture pas la sortie), documenté.
- [Dérive PWA émulée vs PWA terrain] → Mitigation : même binaire (URL déployée = terrain), seuls `?game`/`?cheat`/`?session` diffèrent.

## Migration Plan

1. PWA : `?game`, `?cheat`, namespace session (petits ajouts, ImportScreen/RunScreen inchangés sinon).
2. Studio : plugin `/emulate`, UI iframe + sélecteur cible, états d'erreur.
3. Validation croisée : fixture 2pts jouée dans l'iframe (carte, volet Ouvrir, quiz, triche).
4. Rollback : supprimer l'onglet iframe, le reste (terminal, dashboard) n'a jamais bougé.

## Open Questions

- Préfixe stockage exact côté PWA (`emulate.` vs `?session=`) — tranché à l'implémentation, sans impact specs.
- Faut-il exposer `/emulate/compat.json` quand le jeu n'a pas de verdicts (défaut : verdicts calculés à la volée) — idem.
