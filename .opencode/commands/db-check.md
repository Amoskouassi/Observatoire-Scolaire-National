---
description: Vérifie le schema et les requêtes de la base de données
agent: db-reviewer
---

Vérifie l'intégrité de la base de données du projet.

Analyse les fichiers SQL dans `sql/` et les routes backend qui interagissent avec Supabase:

1. **Schema**: Vérifie les types, index, contraintes, CHECK constraints
2. **RLS**: Vérifie que les policies sont correctes pour chaque table
3. **Requêtes**: Vérifie les `.select()`, `.eq()`, `.insert()`, `.update()` dans le backend
4. **Migrations**: Vérifie que les fichiers dans `sql/` sont idempotents et dans l'ordre
5. **Données**: Vérifie la cohérence des données (45 écoles, codes_admin, etc.)

Pour chaque problème, donne le nom de l'objet SQL et la recommandation.

$ARGUMENTS
