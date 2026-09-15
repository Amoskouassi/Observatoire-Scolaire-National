---
description: Lance une analyse de sécurité complète du projet
agent: security-reviewer
---

Analyse de sécurité du projet Observatoire Scolaire National.

Vérifie les points suivants et fournis un rapport structuré:

1. **Secrets exposés**: Cherche les clés API, tokens, mots de passe hardcodés dans le code source. Vérifie `.gitignore` et l'historique Git.

2. **Authentification**: Vérifie le flow JWT (login, token refresh, expiry). Vérifie que `authMiddleware` protège toutes les routes sensibles.

3. **Validation des inputs**: Vérifie que tous les endpoints ont une validation Zod. Cherche les failles d'injection SQL/NoSQL.

4. **Upload et stockage**: Vérifie les restrictions sur `/api/upload` (taille, type MIME). Vérifie les policies du bucket Supabase Storage.

5. **CORS**: Vérifie la configuration CORS (pas de `*` en production).

6. **Frontend**: Vérifie les appels API, la gestion des erreurs, pas de secrets côté client.

7. **Dépendances**: Cherche les CVEs connues dans les packages npm.

$ARGUMENTS
