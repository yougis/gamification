## Why

L'écran Exporter du Studio est une maquette : checklist pré-export codée en dur (dont la ligne contradictoire « holdMode: none — kiosque nécessite reviewed »), aperçu manifeste statique, et bouton final `disabled` inconditionnel. L'auteur ne peut donc ni comprendre pourquoi son export est bloqué, ni exporter depuis cet écran — alors que le bouton Exporter de la barre globale y mène au lieu de transférer directement. Il faut faire de l'écran Exporter la véritable porte unique d'export, branchée sur l'état réel du jeu.

## What Changes

- La checklist « Contrôle pré-export » de l'écran Exporter est calculée depuis l'état réel : verdicts C1/C2, décompte et noms des nœuds `draft`, verdicts par canal (NATIVE/PWA), et règle HOLD-relu appliquée uniquement quand `holdMode != "none"`.
- Le bouton d'export de l'écran Exporter devient fonctionnel : désactivé (jamais caché) avec la raison du blocage tant que la règle centrale `canExport` échoue, actif sinon, et déclenche `exportPackFull` avec affichage du `{path, version, size, sha256}` réel par fichier après génération.
- Le bouton Exporter de la barre globale continue d'ouvrir l'écran Exporter (porte unique) au lieu d'un transfert direct.
- Les libellés de blocage (écran Exporter, écran Relire) nomment la règle applicable : « aucun brouillon hors mode animateur » en général, « jeu relu exigé » seulement quand le kiosque HOLD est actif.

## Capabilities

### New Capabilities

- (aucune)

### Modified Capabilities

- `studio-authoring`: requirement « Export à porte unique » — checklist et résumé calculés depuis l'état réel, bouton d'export fonctionnel sur l'écran Exporter, porte unique conservée via la barre globale.
- `studio-authoring`: requirement « File de relecture » — le message de blocage distingue la règle générale (pas de `draft` hors animateur) de la règle kiosque (relecture exigée seulement si `holdMode != "none"`).

## Impact

- `studio/src/App.tsx` : écran Exporter (checklist, aperçu manifeste, bouton), libellé Relire ; aucun changement de la règle `canExport`.
- `studio/src/game/mcp.ts` : réutilisation de `canExport` / `exportPackFull` existants, sans modification de signature.
- Aucune modification du schéma graphe (Noeuds/activation/registre/branding/manifest) : aucun consommateur impacté (Studio MCP, runtime natif, orchestrateur, modules, packaging offline inchangés).
- Aucune valeur réservée CONDITIONAL/WINDOW touchée, aucun module ajouté au registre.
- Aucune connexion réseau à aucun moment du parcours (export 100 % local, conforme offline-first).
- Aucune dépendance à un change non archivé.
