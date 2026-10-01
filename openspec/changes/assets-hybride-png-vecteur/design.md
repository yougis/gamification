## Context

Voir proposal.md (Why). État actuel : 16 refs SVG dans Sherlock (écrans, module data, icônes sans préfixe), 2 liens morts dans 5poi, 2 rasters existants, `BitmapFactory` seul décodeur Android, pont PNG iOS existant, `rsvg-convert`/`inkscape` disponibles, `SherlockParityJvmTest` comme oracle.

## Goals / Non-Goals

**Goals:**
- Tout contenu affichable bitmap des deux côtés (PNG), sources SVG conservées.
- Icônes nettes sans surpoids via `VectorDrawable` (zéro dép runtime).
- Fixtures valides C1+C2, manifest à jour, preuve device via pack zip.

**Non-Goals:**
- PDF vectoriels iOS (pont PNG conservé).
- Décodeur SVG runtime (écarté : dép + poids + offline).
- Pipeline de conversion auto (manuel audité ; les SVG complexes avec filtres/textes sont rasterisés en contenu, pas convertis en vecteur).

## Decisions

- **Rasteriser le contenu, vectoriser les pictos** : le critère n'est pas la beauté mais le consommateur (bitmap pour découpe/vision/photo, vecteur pour pictogrammes) ; les scènes SVG détaillées deviennent du contenu PNG plutôt que des vecteurs suspects.
- **PNG à côté des SVG, refs basculées** : un seul jeu de refs JSON valide partout (navigateur + natifs) ; les SVG restent régénérables.
- **Mapping `.svg` → drawable par basename côté Android** : le JSON ne change pas de forme (chemin `.svg`), le loader résout au buildé ; repli bitmap explicite si absent.
- **Neutres générés pour 5poi** (ImageMagick, motif assumé) plutôt que détournement d'images Sherlock : la fixture reste générique, son rôle de preuve graphe/registre est intact.
- **Preuve par pack zip** (`pack-zip-diff-tuiles`) : les PNG voyagent, le JSON brut seul ne prouve rien côté images.

## Risks / Trade-offs

- [Risk] PNG lourds (photo 7 Mo existante) → Mitigation : dimensionnement raisonnable à la rasterisation (largeur max documentée), taille annoncée à l'export zip.
- [Risk] `VectorDrawable` infidèle sur un picto complexe → Mitigation : audit visuel un par un Studio vs device ; les complexes passent en PNG contenu.
- [Risk] Dérive future SVG↔PNG (source modifiée, PNG oublié) → Mitigation : convention documentée (régénérer au changement), pas d'outillage dans ce change.

## Migration Plan

Aucune migration de JSON auteur (chemins d'assets déjà opaques). Les anciens packs référençant les SVG restent valides côté Studio ; côté device ils nécessitent le réexport (zip avec PNG). Rollback = revert.

## Open Questions

Aucune.
