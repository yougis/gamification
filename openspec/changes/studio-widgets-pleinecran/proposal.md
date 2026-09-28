## Why

Un widget carte (ou image) ne peut ni être dimensionné ni passer plein écran, et aucun chevauchement n'est possible : l'ordre des zones est fixe et les widgets vivent en flux. L'exemple qui motive le change — carte plein écran avec titre en surimpression — est inconstructible aujourd'hui. La voie retenue (option C de l'exploration) évite le positionnement absolu x/y, qui casserait la garantie « lisible sur les 4 viewports » fondatrice du layout `free`.

## What Changes

- Props de mise en page communes et optionnelles sur les widgets visuels : `largeurPct` / `hauteurPct` (0-100, relatifs à la zone, défaut = comportement actuel auto/flux), `pleinEcran` (booléen, défaut `false` : sort du flux, `absolute inset-0` du cadre téléphone, sous l'overlay).
- Ordre de peinture = ordre du tableau dans la zone (dernier = dessus) ; contrôles monter/descendre via le drag existant ; empilement des zones inchangé (header → content → footer → overlay, overlay toujours au sommet).
- Carte et image en premiers bénéficiaires (l'image conserve ses `width/height` historiques, dépréciés au profit du % sans rupture) ; texte/bouton/progression/module suivent le même contrat sans obligation.
- Canvas auteur + terminal simulé rendent taille, plein écran et ordre ; renderers natif/PWA hors périmètre (notés pour le change dédié).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-screen-builder`: props de mise en page communes des widgets (`largeurPct`, `hauteurPct`, `pleinEcran`) et ordre de peinture intra-zone (précise « Définitions Widget », muette sur taille/position/ couches).

## Impact

- Schéma : nouvelles props optionnelles ajoutées explicitement à chaque variante visuelle (`additionalProperties: false` conservé) ; jeux existants sans ces props inchangés.
- Code : `game-schema.json` (définitions widget), `ZoneRenderer`/`WidgetRenderer`/`PhoneCanvas` (taille %, breakout plein écran, ordre de peinture), panneau propriétés (champs taille + case plein écran + monter/descendre).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
