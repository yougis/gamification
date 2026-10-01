## 1. Modele et schema

- [ ] 1.1 Interdire les litteraux affichables en C1 (motif `$t`) et constater le rejet d'un texte en dur avec le champ nomme.
- [ ] 1.2 Ajouter `i18n/{defaultLocale,locales}` + fichiers `i18n/*.json` au manifest (size en octets UTF-8, sha256) et constater la verification fichier par fichier a l'import.

## 2. Runtime et C2

- [ ] 2.1 Implementer la chaine de repli (joueur -> systeme -> defaut -> cle signalee) + changement de langue en partie et constater le repli sur un jeu a traduction partielle.
- [ ] 2.2 Ajouter les regles C2 (defaut manquante = erreur, autre langue = avertissement, orpheline = info) et constater chaque niveau sur fixtures.
- [ ] 2.3 Migrer `game-5poi.json` et `sherlock-holmes` vers `i18n/fr.json` (+en) via l'outil auto et constater C1+C2 verts + jouabilite fr et en.
