---
description: Revue de code des fichiers modifiés
agent: code-reviewer
---

Fais une revue de code des fichiers modifiés récemment.

Regarde `git diff --name-only HEAD~5` pour identifier les fichiers changés, puis analyse-les selon ces critères:

1. **Bugs potentiels**: Null checks manquants, erreurs non gérées, race conditions
2. **React**: Hooks dans les conditions, dépendances manquantes, state redondant
3. **Express**: Erreurs non catchées, validation manquante, response leaking
4. **Performance**: Re-renders inutiles, requêtes répétées, pas de memoization justifiée
5. **Style**: Noms explicites, fonctions courtes, constantes extraites
6. **Accessibilité**: Labels, alt text, contraste, navigation clavier

Pour chaque problème trouvé, donne le fichier, la ligne, et une suggestion de correction.

$ARGUMENTS
