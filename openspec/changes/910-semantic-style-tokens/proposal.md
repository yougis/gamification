## Why

Les couleurs en dur dans les widgets cassent le mode sombre (texte illisible selon le theme) et rendent les themes (M4) impossibles. Sans tokens semantiques, chaque theme serait un patch ad hoc. C'est le prerequis de `944-theme-engine`/`945-theme-catalog` et le correctif du mode sombre (§3.1, §4.5).

## What Changes

- Introduction des roles de tokens (`color.background/surface/text/accent/border/danger/success`, `font.family/size`, `radius`, `spacing`, `elevation`, `motion`) ; tout affichage passe par un role, jamais une valeur litterale.
- Theme = `{id, version, tokens:{light, dark}, widgetVariants?, assets?}` ; heritage `global.theme` -> `screen.theme` -> widget (surcharge limitee aux tokens autorises).
- Mode sombre = selection `tokens.dark` ; migration des couleurs en dur ; lint Studio + regle C2 (couleur litterale = avertissement).
- Contraste WCAG AA automatique (ratio >= 4,5 pour texte normal) ; theme non conforme = avertissement.
- Test visuel automatise (captures clair/sombre de `sherlock-holmes` et `game-5poi.json`) : aucun texte sous 4,5.

## Capabilities

### New Capabilities

- `style-tokens`: vocabulaire des tokens semantiques, heritage et mode sombre (delta pose sur `experience-style` et `branding-identity`, voir specs/).

### Modified Capabilities

- `experience-style`: les dimensions visuelles passent par les roles de tokens ; le preset ne porte plus de valeurs litterales.
- `branding-identity`: `primaryColor`/`secondaryColor` deviennent des affectations de roles (valeurs par defaut du theme), plus des couleurs collees aux widgets.

## Impact

- Studio (rendu canvas, apercu, lint), simulateur wasmJs, runtime natif (resolution des tokens), validateur C2 (nouvel avertissement).
- Depend de rien ; pre-requis de 944/945. Migration des jeux de reference incluse.

## Impact CodeGraph

- Inventaire exact a completer a l'apply via CodeGraph : composants Studio portant des couleurs en dur, renderer `commonMain`, validateur C2.
- Frontiere `kmp-native-boundary` : resolution des tokens en `commonMain` uniquement.
