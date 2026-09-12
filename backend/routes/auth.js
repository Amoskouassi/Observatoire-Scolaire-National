import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../server.js';
import { validateRequest } from '../middleware/validate.js';
import { config } from '../config/index.js';
import { sendMail, welcomeEmail } from '../services/email.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = Router();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function verificationCodeEmail(prenom, code) {
  return {
    subject: 'Code de confirmation — Observatoire Scolaire National',
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#E8611A;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:18px">🇨🇮 Observatoire Scolaire National</h1>
        </div>
        <div style="background:#FAF8F3;padding:24px;border-radius:0 0 12px 12px;border:1px solid #CBD5E1">
          <h2 style="color:#0D1B2A;margin-top:0">Bonjour ${prenom},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Voici votre code de confirmation :
          </p>
          <div style="background:#0D1B2A;color:white;text-align:center;padding:20px;border-radius:12px;margin:20px 0">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px">${code}</span>
          </div>
          <p style="color:#94A3B8;font-size:12px;text-align:center">
            Ce code expire dans 15 minutes.
          </p>
          <p style="color:#94A3B8;font-size:12px;margin-top:16px">
            Si vous n'avez pas créé de compte, ignorez cet email.
          </p>
        </div>
      </div>
    `,
  };
}

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

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resendCodeSchema = z.object({
  email: z.string().email(),
});

// Inscription — crée l'utilisateur + envoie le code
router.post('/register', validateRequest(registerSchema), async (req, res, next) => {
  try {
    const { email, password, nom, prenom, role, organisation, commune_code, region_code } = req.body;

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, prenom, role },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { error: profileError } = await supabaseAdmin
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
      return res.status(500).json({ error: profileError.message || 'Erreur création profil' });
    }

    const code = generateCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('verification_codes').insert({
      email,
      code,
      purpose: 'email_confirm',
      expires_at,
    });

    sendMail({ to: email, ...verificationCodeEmail(prenom, code) }).then(r => console.log('Email result:', JSON.stringify(r))).catch(e => console.error('Email error:', e));

    res.status(201).json({
      message: 'Compte créé. Vérifiez votre boîte mail pour le code de confirmation.',
      email,
      needsVerification: true,
    });
  } catch (err) {
    next(err);
  }
});

// Vérifier le code de confirmation
router.post('/verify-code', validateRequest(verifyCodeSchema), async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const { data: record, error: findError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('purpose', 'email_confirm')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !record) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    if (record.attempts >= record.max_attempts) {
      return res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', record.id);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, nom, prenom, organisation')
      .eq('email', email)
      .single();

    const token = jwt.sign(
      { userId: profile?.id, role: profile?.role || 'enqueteur' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: {
        id: profile?.id,
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

// Renvoyer le code de vérification
router.post('/resend-code', validateRequest(resendCodeSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nom, prenom')
      .eq('email', email)
      .single();

    if (!profile) {
      return res.json({ message: 'Si cet email est enregistré, un code a été envoyé.' });
    }

    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('email', email)
      .eq('purpose', 'email_confirm')
      .eq('used', false);

    const code = generateCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('verification_codes').insert({
      email,
      code,
      purpose: 'email_confirm',
      expires_at,
    });

    sendMail({ to: email, ...verificationCodeEmail(profile.prenom || '', code) }).catch(() => {});

    res.json({ message: 'Un nouveau code a été envoyé.' });
  } catch (err) {
    res.json({ message: 'Si cet email est enregistré, un code a été envoyé.' });
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
    const decoded = jwt.verify(token, config.jwt.secret);

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !profile) return res.status(404).json({ error: 'Profil introuvable' });

    res.json({ user: profile });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

// Google OAuth callback — crée le profil si nouveau
router.post('/google-callback', async (req, res, next) => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: 'access_token requis' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(access_token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token Google invalide' });
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const nom = user.user_metadata?.full_name?.split(' ').slice(-1).join(' ') || '';
      const prenom = user.user_metadata?.full_name?.split(' ').slice(0, -1).join(' ') || user.email;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          nom,
          prenom,
          role: 'enqueteur',
        });

      if (profileError) {
        return res.status(500).json({ error: profileError.message });
      }

      const jwtToken = jwt.sign(
        { userId: user.id, role: 'enqueteur' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return res.json({
        token: jwtToken,
        user: { id: user.id, email: user.email, nom, prenom, role: 'enqueteur' },
      });
    }

    const jwtToken = jwt.sign(
      { userId: user.id, role: existingProfile.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        nom: existingProfile.nom,
        prenom: existingProfile.prenom,
        role: existingProfile.role,
        organisation: existingProfile.organisation,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mot de passe oublié
const forgotSchema = z.object({ email: z.string().email() });

router.post('/forgot-password', validateRequest(forgotSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-fron.vercel.app'}/login`,
    });
    res.json({ message: 'Si cet email est enregistré, un lien de réinitialisation a été envoyé.' });
  } catch (err) {
    res.json({ message: 'Si cet email est enregistré, un lien de réinitialisation a été envoyé.' });
  }
});

export default router;
