## Context

État observé : les champs image sont des saisies texte de chemin (`ImageWidgetProperties.src`, image puzzle, image de réponse QCM, fond `ScreenProperties`, logo `BrandingPanel`) ; le manifest (`App` state + `registerAsset`, `ManifestForm`) est alimenté à la main à l'export. `StyleToolbar` (police en saisie libre) et `TextWidgetProperties` n'affichent ni défauts ni retour unitaire. `SCREEN_TEMPLATES` est une constante embarquée ; `TemplatePicker` ne connaît que les prédéfinis. Persistance locale existante en `localStorage` (`geoplay-*`). Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Un seul composant `ImagePicker` (parcours + dépôt + prévisualisation + refus non-image) réutilisé par tous les formulaires image, câblé au manifest.
- Défauts visibles + retour unitaire par champ ; liste de polices partagée.
- Bibliothèque de modèles nommés (prédéfinis immuables + enregistrés localement), déclinaison par copie.

**Non-Goals:**
- Stockage serveur ou partage réseau des modèles (100 % local).
- Éditeur de modèle dédié (l'écran du nœud sert d'éditeur, l'enregistrement fige une copie).
- Nouveaux champs de schéma (chemins, styles et screens existants suffisent).

## Decisions

### D1 — `ImagePicker` contrôlé, App possède le fichier

**Décision** : `ImagePicker({ value, onChange(path), onPickFile })` — parcours (`<input type=file accept=image/*>`) + dépôt (drag-over/drop) + vignette + message de refus. `App` fournit `onPickFile` : hash SHA-256 via WebCrypto, `registerAsset` dans le state manifest, `onChange("assets/<nom>")`. Les octets du fichier sont conservés en mémoire pour l'export (le manifest existant porte path/version/size/sha256).

**Alternative écartée** : data-URL embarquée dans le JSON — décidée contre (option proposée, choix « Asset + manifest ») : JSON lourd, hors intégrité manifest, incompatible offline-first.

### D2 — Défauts = `defaultWidget` + `defaultScreen`, retour = suppression ou restauration

**Décision** : la valeur par défaut d'un champ est lue depuis `defaultWidget(type)` (widget) ou le `defaultScreen` du plugin (écran). Retour unitaire : si le champ est optionnel → suppression de la clé (retour à l'héritage) ; si requis → restauration de la valeur par défaut du type. Affichage : placeholder/mmention « défaut : … » + bouton retour par champ.

**Alternative écartée** : défauts codés par formulaire — divergerait de `defaultWidget`/`defaultScreen`, deux sources de vérité.

### D3 — Liste de polices partagée, saisie libre en repli

**Décision** : constante `FONT_OPTIONS` (système, Georgia, serif, sans-serif, monospace + libellés) consommée par `StyleToolbar`, `TextWidgetProperties` et branding ; `select` avec option « Personnalisée… » basculant sur saisie libre. Même liste partout, un seul endroit à maintenir.

**Alternative écartée** : police système uniquement via enum schéma — casserait les jeux existants avec `fontFamily` libre (champ string, compatibilité ascendante).

### D4 — Bibliothèque = prédéfinis + enregistrés, déclinaison par copie profonde

**Décision** : registre `screen-templates.ts` étendu : `SCREEN_TEMPLATES` (immuables) + `loadCustomTemplates`/`saveCustomTemplate` (`localStorage geoplay-screen-templates-v1`, `{ id, name, screen }`). `TemplatePicker` reçoit la liste fusionnée + bouton « Enregistrer comme modèle » (nom demandé, doublon = confirmation d'écrasement pour les seuls modèles enregistrés). Appliquer = `structuredClone` dans `node.screen` : toute modification ultérieure est une déclinaison, le modèle n'est jamais muté.

**Alternative écartée** : modèles lus depuis les jeux publiés importés — décidée contre (option proposée, choix « Bibliothèque embarquée ») : couplage au statut de publication et au stockage des jeux, hors scope Studio local.

## Risks / Trade-offs

- [Fichier volumineux] → prévisualisation par object URL (pas de data-URL en mémoire) ; mitigation : limite douce avec avertissement au-delà de 5 Mo, documentée dans les tâches.
- [Conflit de sync avec `studio-screen-selection-zones`] → les deux deltas touchent « Sélection de template » ; mitigation : ce delta est un sur-ensemble volontaire (paragraphe par-nœud repris), archiver `studio-screen-selection-zones` d'abord, celui-ci ensuite.
- [Hash asynchrone] → `crypto.subtle` indisponible hors contexte sécurisé ; mitigation : repli avec SHA-256 calculé à l'export (erreur explicite si impossible), documenté dans les tâches.
- [Doublons de noms de modèles] → mitigation : prédéfinis immuables (pas d'écrasement), enregistrés = confirmation avant écrasement.
