## Why

Ajouter un mini-jeu à une étape ne fait apparaître aucun widget de jeu dans l'écran de l'étape : le nœud est créé sans `screen`, le changement de `module.type` ne touche jamais à `node.screen`, et le menu d'ajout interdit l'insertion manuelle du widget module. L'auteur ne peut donc pas intégrer le mini-jeu à l'écran.

## What Changes

- Le choix du module mini-jeu devient le premier choix à la création d'une étape ; le `defaultScreen` du screenPlugin du module est appliqué d'emblée (content avec widget `{ type: "module" }`).
- Changer de type de mini-jeu sur une étape existante affiche un message « modifications perdues » avec confirmation ; sur confirmation, les `module.data` sont détruites et remplacées par les données par défaut du nouveau module, et seule la zone `content` est remplacée (header/footer/overlay préservés).
- Pour les types sans screenPlugin (`INFO`, `RANDOM_POOL`, futurs types), un widget `{ type: "module" }` générique sans paramètre particulier est injecté (rendu placeholder existant).
- **BREAKING (dev uniquement, assumé)** : aucune rétrocompatibilité — les jeux en cours de création peuvent être refaits, le projet est encore en dev.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `module-screen-plugins` : defaultScreen appliqué à la création ; changement de type destructif (confirmation, reset data, remplacement content seul) ; widget générique pour types sans plugin.
- `studio-authoring` : création d'étape avec choix module premier ; dropdown mini-jeu avec message destructif et confirmation.

## Impact

- Studio uniquement : `ajouterEtape` (création), dropdown mini-jeu de l'Inspecteur (famille épreuve), résolution/affichage inchangée (PhoneCanvas, WidgetRenderer, ModuleWidgetRenderer réutilisés).
- Aucun changement du schéma graphe (Noeuds/activation/registre/branding/manifest) : consommateurs (runtime natif, orchestrateur, modules, packaging offline) non impactés.
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Aucune connexion réseau à aucun moment (offline-first inchangé).
- Aucune dépendance à un change précédent non archivé.
