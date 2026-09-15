---
name: security-audit
description: Use when reviewing code for security vulnerabilities, checking for exposed secrets, or auditing the Node.js/Express backend and React frontend of the Observatoire Scolaire National project. Triggers on keywords like security, audit, vulnerability, secrets, auth, JWT, upload, CORS.
---

# Security Audit — Observatoire Scolaire National

## Project Security Context

This is a national educational BI platform for Côte d'Ivoire with:
- **Backend**: Node.js/Express on Railway
- **Frontend**: React/Vite on Vercel
- **Database**: PostgreSQL via Supabase (managed)
- **Auth**: Custom JWT (not Supabase Auth)
- **Storage**: Supabase Storage `photos` bucket (public)
- **Email**: Brevo HTTP API

## Known Security Items

### Secrets in Repo
The `.env` file with Supabase keys, Brevo API key, and JWT secret is committed to Git.
This is the **#1 priority** fix:
1. Add `.env` to `.gitignore`
2. Remove `.env` from Git history with `git filter-branch` or BFG
3. Rotate all exposed keys (Supabase service key, Brevo API key, JWT secret)

### JWT Configuration
- Secret: stored in Railway env var `JWT_SECRET`
- Expiry: 1 hour
- Algorithm: HS256 (default)

### Auth Flow
- `authMiddleware` is pass-through when no token is provided (req.user = null)
- `requireRole` blocks unauthorized access when req.user is null
- Rate limiting: 10 requests/15min on auth endpoints

### Upload Security
- Multer memory storage, max 5MB
- MIME types: image/jpeg, image/png, image/webp only
- Stored in Supabase Storage `photos` bucket (public)

### CORS
- Production: Vercel URL only
- Fallback: hardcoded Vercel URL

## Security Checklist for This Project

When reviewing code, always check:
- [ ] No secrets in source code (search for `sk-`, `xkeysib-`, `eyJ`, password patterns)
- [ ] `.env` in `.gitignore`
- [ ] JWT secret is strong and rotated
- [ ] All POST/PUT/DELETE routes have `authMiddleware`
- [ ] Upload endpoint validates file type and size
- [ ] No `console.log` with sensitive data in production
- [ ] Error responses don't leak stack traces
- [ ] CORS origins are explicit (no wildcards)
- [ ] Rate limiting is active on auth endpoints
- [ ] Zod validation on all input schemas
