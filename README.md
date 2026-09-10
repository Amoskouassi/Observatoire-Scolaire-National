# Observatoire Scolaire National

Plateforme nationale de Business Intelligence éducative pour la Côte d'Ivoire.

## Architecture

```
observatoire-national/
├── frontend/          # React + MapLibre + Tailwind CSS
├── backend/           # Node.js + Express + Supabase
├── sql/               # Scripts de migration Supabase
├── scripts/           # Utilitaires (fusion données, tuiles, seed)
├── data/              # Données brutes (geojson, pmtiles) - .gitignore
├── docs/              # Cahier des charges et décisions techniques
└── .github/           # CI/CD (Actions)
```

## Technologies

| Couche | Stack |
|--------|-------|
| Frontend | React 18, MapLibre GL JS, Tailwind CSS, Recharts |
| Backend | Node.js 20, Express, Zod, Helmet, Rate Limiting |
| Base de données | PostgreSQL + PostGIS (Supabase) |
| Auth | Supabase Auth (JWT, bcrypt) |
| Carte | MapLibre GL JS (tuiles vectorielles) |
| Hébergement | Vercel (FE), Render (BE), Supabase (DB) |

## Installation

```bash
# Cloner le repo
git clone https://github.com/VOTRE_USER/observatoire-scolaire-national.git
cd observatoire-scolaire-national

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Editer .env avec vos clés Supabase

# Lancer le serveur de développement
npm run dev
```

## Données administratives

Le découpage administratif de la Côte d'Ivoire est géré en deux formats :

1. **PMTiles** (production) : Tuiles vectorielles dans `public/tiles/`
2. **GeoJSON** (prototypage) : `public/data/admin_all_levels.geojson`

### Générer les tuiles

```bash
# 1. Télécharger les GeoJSON HDX
npm run merge:admin

# 2. Convertir en PMTiles
npm run build:tiles
```

## Sécurité

- [x] Clés API dans `.env` (jamais en clair)
- [x] `.env` dans `.gitignore`
- [x] Rate limiting sur le login (5 tentatives / 15 min)
- [x] RLS activée sur Supabase
- [x] Mots de passe hashés (bcrypt)
- [x] Droits vérifiés côté serveur (JWT)
- [x] Clé publique côté client (Supabase Anon)
- [x] HTTPS partout
- [x] Sessions qui expirent (2h)
- [x] Inputs validés (Zod)
- [x] Taille max uploads (5 Mo)
- [x] Type de fichier vérifié (MIME)
- [x] CORS configuré (whitelist domaines)
- [x] Erreurs détaillées coupées (Winston logger)
- [x] console.log clean en production
- [x] Message d'erreur unique (pas de fuite technique)
- [x] Webhooks signés
- [x] Dépendances à jour (Dependabot)
- [x] Email confirmé (double opt-in)
- [x] Backup automatique (Supabase)

## Licence

Propriétaire - Tous droits réservés
