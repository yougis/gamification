## Why

Quatre frictions freinent l'édition WYSIWYG des écrans : les aperçus modules du canvas mélangent parfois rendu visuel et mécanique de jeu (tuiles déplaçables, zones cliquables) au lieu de montrer simplement l'image importée ; en paysage le cadre 667×375 déborde et impose des ascenseurs ; une zone de surimpression créée par erreur est impossible à supprimer (aucune opération de suppression de zone n'existe) ; et la liste des étapes, plate, oblige à sélectionner un nœud puis à retrouver son widget dans le canvas pour voir ses détails.

## What Changes

- **Aperçus modules statiques** : chaque `editorPreview` du registre SHALL afficher le rendu visuel des images configurées (image puzzle découpée, source 7-erreurs + zones, marqueur + fallback RA, rose boussole, cadenas, QCM) sans aucune mécanique interactive — aucun déplacement de tuile, aucun clic de validation, aucun état de jeu dans le canvas auteur.
- **Paysage plein cadre sans ascenseur** : en viewport paysage (et tablette), le canvas SHALL s'ajuster à l'espace disponible du panneau central par mise à l'échelle (prop `scale` existante), sans barre de défilement ; le portrait garde son comportement actuel.
- **Suppression de zone** : toute zone créée (en-tête, pied de page, surimpression — la zone `content` restant la base insuppressible) SHALL pouvoir être supprimée depuis le panneau de propriétés, avec retour du fantôme de création ; l'opération passe par l'historique undo/redo comme les autres opérations MCP.
- **Arbre des widgets dans la liste** : chaque ligne d'étape SHALL exposer un sous-arbre dépliable (zones → widgets) ; sélectionner une entrée SHALL sélectionner la zone ou le widget correspondant et afficher ses détails dans le panneau de droite, via la sélection existante.
- Correctif + évolutions de présentation uniquement : aucun changement du schéma graphe.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `module-screen-plugins`: contrat d'aperçu éditeur — rendu visuel statique des images, zéro mécanique.
- `studio-screen-builder`: viewport paysage ajusté sans ascenseur ; suppression des zones créées.
- `studio-authoring`: sous-arbre zones/widgets dans la liste des étapes, sélection synchronisée avec le panneau détail.

## Impact

- Code : `studio/src/components/wysiwyg/plugins/*` (aperçus), `PhoneCanvas` + hôte (mise à l'échelle), nouvelle opération MCP `removeScreenZone` + `ZoneProperties`/`PropertiesPanel` (bouton supprimer), `NodeList` (lignes arborescentes).
- Aucun impact schéma graphe (Noeuds/activation/registre/branding/manifest) : pas de consommateur à mettre à jour.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucun besoin réseau : 100 % local.
- Aucune dépendance à un change précédent non archivé.
