---
name: geoplay-module-registry
description: Concoit ou integre un module de mini-jeu GeoPlay (contrat registre, sous-schema, capteurs, donnees) sans toucher au schema Noeuds/Liens. A utiliser pour tout ajout ou revue de type de module.
---

# Skill : geoplay-module-registry

Specialiste du registre de modules du framework GeoPlay natif (iOS + Android).

## Contrat d'un Module (obligatoire)

Chaque type (`QUIZ`, `DIFFERENCE_GAME`, `PUZZLE`, `AR_MARKER`, `BOUSSOLE`,
`CODE_INPUT`, `INFO`, futurs types) s'enregistre avec :

- **Identifiant** : en majuscules (ex. `QUIZ`, `BOUSSOLE`).
- **Sous-schema versionne** : valide ses `donnees de module` independamment (montage $ref + discriminant, schema racine jamais touche).
- **Besoins** : `needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock`, `needsInventory`, autorisations natives.
- **Besoins transverses** : `presentationNeeds` (MAP, CLUE, TOOLBOX...), `experienceNeeds` (visual, audio, map, voice...) — avertissement inline si non couvert, jamais de blocage hors Valider.
- **Palier** : `tier: standard|advanced` + `requires` (entitlements, OU par defaut, requiresAll pour ET) ; cadenas explicatif cote Studio.
- **Ecran** : `screenPlugin` optionnel (defaultScreen, editorPreview statique, propertiesPanel, playerRenderer, customizableStyles) — concern Studio uniquement.
- **Rendu** : composant natif commonMain (jamais de code plateforme pur si l'equivalent existe en commun).
- **Regle d'extension** : ajouter un module = une entree registre, jamais une
  retouche du schema Noeuds/Liens. Le moteur ignore gracieusement un type
  inconnu (noeud marque non jouable avec message), jamais de crash du Jeu.

## Regles de donnees (socle 000)

- **Rien en dur** : seuils, URLs, bbox/zooms, rayons se lisent dans le JSON.
- **Timers internes vs graphe** : `timeLimitSeconds` + `onTimeout` (ex. Quiz)
  vivent dans les donnees module, jamais comme condition d'activation.
- **Trace GPX** : base auteur pour poser les POI + polyline display globale
  optionnelle. Toute trace par module est differee hors socle.
- **Boussole double usage** : service moteur non-validant (fleche vers le POI +
  distance texte + haptique, jamais couleur seule ; jeu jouable sans capteur :
  carte + distance) ET entree capteur consommable par le module `BOUSSOLE`
  (validation interne `toleranceDeg`, stabilisation, `onTimeout`, fallback
  non-capteur). L'orchestrateur ne valide jamais un cap.
- **Rendu spatial natif** : AR via ARKit (iOS) / ARCore (Android) seuls, carte via
  MapLibre Native (packs offline) seul. Exclus du socle : Leaflet, WebXR, Unity
  as a Library, Mapbox SDK par defaut (licence offline). Tout rendu spatial
  SHALL passer par le contrat registre et declarer ses fallbacks.
- **Ancrage et lissage** : les modules ancres (AR Marker, geospatial, guidance)
  SHALL lisser capteurs et positions (anti-saut d'ancres visuelles, hysteresis) ;
  seuils et tolerances depuis le JSON, jamais en dur.
- **7-erreurs** : source + derivee + masque Alpha auteur (memes dimensions,
  1 valeur alpha par difference) convertis hors-ligne au build en polygones en %
  (`simplifyPx`) + `touchDilatation` (doigt/gants). Le player ne charge jamais le
  masque brut. Validation humaine sur overlay, statuts `draft|reviewed|published` ;
  `draft` refuse sauf mode animateur-triche.
- **Branding et modes** : branding = objet de donnees (global + surcharge
  par Noeud). Triche/test + preview Studio = un seul bypass (GEOFENCE force,
  `forceDraw`, auto-validation), deux entrees, flag triche propage au scoring.
- **Defauts mini-jeux** : `global.minigameDefaults` (maxAttempts >= 1, timeLimitSeconds >= 0) ; resolution locale > globale > defaut module, origine affichee.
- **Liste des types** : derivee du registre (+ RANDOM_POOL structurel hors registre), chaque type exactement une fois, jamais de liste fermee en dur dans l'UI.

## Instructions

- Formalise l'interface registre (identifiant, sous-schema, besoins, rendu)
  avant tout composant UI.
- Genere le sous-schema du payload `data` du Noeud et declare les fallbacks
  capteur (interferences metal, permission refusee, capteur absent).
- Refuse toute proposition qui touche Noeuds/Liens pour ajouter un gameplay :
  redirige vers une entree registre.
