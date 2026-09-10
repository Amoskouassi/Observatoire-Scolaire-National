import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../server.js';
import { validateRequest } from '../middleware/validate.js';
import { config } from '../config/index.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  nom: z.string().min(2, 'Nom trop court'),
  prenom: z.string().min(2, 'Prénom trop court'),
  role: z.enum(['mairie', 'institution', 'enqueteur']),
  organisation: z.string().optional(),
  commune_code: z.string().optional(),
  region_code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Inscription
router.post('/register', validateRequest(registerSchema), async (req, res, next) => {
  try {
    const { email, password, nom, prenom, role, organisation, commune_code, region_code } = req.body;

    // Vérifier si l'email existe déjà
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, prenom, role },
      },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Créer le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        nom,
        prenom,
        role,
        organisation: organisation || null,
        commune_code: commune_code || null,
        region_code: region_code || null,
      });

    if (profileError) {
      return res.status(500).json({ error: 'Erreur création profil' });
    }

    const token = jwt.sign({ userId: authData.user.id, role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({
      token,
      user: { id: authData.user.id, email, nom, prenom, role },
    });
  } catch (err) {
    next(err);
  }
});

// Connexion
router.post('/login', validateRequest(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, nom, prenom, organisation')
      .eq('id', data.user.id)
      .single();

    const token = jwt.sign(
      { userId: data.user.id, role: profile?.role || 'enqueteur' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: {
        id: data.user.id,
        email,
        nom: profile?.nom,
        prenom: profile?.prenom,
        role: profile?.role,
        organisation: profile?.organisation,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Profil utilisateur courant
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Token invalide' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({ user: profile });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

export default router;
