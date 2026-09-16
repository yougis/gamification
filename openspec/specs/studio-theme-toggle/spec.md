## Purpose

Permet à l'auteur du Studio de basculer entre un thème sombre (par défaut) et un thème clair, améliorant l'ergonomie en environnement peu lumineux et la lisibilité des couleurs de branding.

## Requirements

### Requirement: Bascule sombre/clair dans la barre globale

Le Studio SHALL afficher un bouton de bascule thème dans la barre globale (header). Le bouton SHALL afficher une icône de soleil (thème sombre actif) ou de lune (thème clair actif) et permettre de basculer en un clic.

Le thème sélectionné SHALL être persisté dans `localStorage` sous la clé `studio-theme`. Au chargement du Studio, le thème est restauré depuis `localStorage`. Si aucune valeur n'est présente, le thème sombre est appliqué par défaut.

#### Scenario: Bascule vers le thème clair
- **GIVEN** le Studio affiche le thème sombre (par défaut)
- **WHEN** l'auteur clique sur le bouton de bascule thème
- **THEN** le thème clair est appliqué (fonds clairs, textes sombres), l'icône du bouton change de lune à soleil, et `localStorage` est mis à jour avec `studio-theme: "light"`

#### Scenario: Restauration du thème au chargement
- **GIVEN** l'auteur a sélectionné le thème clair lors d'une session précédente
- **WHEN** le Studio est rechargé
- **THEN** le thème clair est restauré depuis `localStorage` et l'icône du bouton affiche une lune

### Requirement: Variables CSS thème clair

Le thème clair SHALL redéfinir les variables CSS de `theme.css` via la classe `.theme-light` sur l'élément `<html>`. Les variables redéfinies SHALL inclure au minimum :

- `--surface`, `--surface-2`, `--surface-3` : fonds clairs
- `--ink`, `--ink-2`, `--ink-3` : textes sombres
- `--line`, `--line-forte` : bordures visibles sur fond clair

Le thème clair SHALL conserver les variables d'accent, d'alerte et de tirage inchangées (l'auteur doit reconnaître son branding).

#### Scenario: Application du thème clair
- **GIVEN** le thème clair est sélectionné
- **WHEN** le Studio affiche l'interface
- **THEN** les fonds sont clairs (ex. `#fafafa`), les textes sont sombres (ex. `#1a1a1a`), et les accents restent identiques au thème sombre

#### Scenario: Thème clair sans altération du branding
- **GIVEN** un jeu avec `branding.primaryColor: "#ff4400"`
- **WHEN** le thème clair est appliqué
- **THEN** la couleur primaire `#ff4400` n'est pas affectée

### Requirement: Persistance du choix de thème

Le choix de thème SHALL persister uniquement dans `localStorage`, jamais dans le JSON du jeu ni dans une base de données distante. Le choix de thème SHALL être un préférence UI locale, jamais synchronisée.

#### Scenario: Persistance locale uniquement
- **GIVEN** l'auteur bascule vers le thème clair
- **WHEN** l'export du jeu est généré
- **THEN** le JSON exporté ne contient aucune référence au thème sélectionné

### Requirement: Accessibilité du bouton de bascule

Le bouton de bascule thème SHALL respecter les contraintes d'accessibilité du Studio :
- taille minimale de toucher 44px
- aria-label explicite (« Basculer en mode clair » ou « Basculer en mode sombre »)
- focus visible
- contraste de couleur suffisant sur les deux thèmes

#### Scenario: Accessibilité du bouton
- **GIVEN** le Studio affiche le thème sombre
- **WHEN** l'auteur navigue au clavier jusqu'au bouton de bascule
- **THEN** le bouton est visible, focusable, et porte un aria-label décrivant l'action
