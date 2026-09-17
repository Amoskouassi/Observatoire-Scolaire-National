import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../server.js';
import { validateRequest } from '../middleware/validate.js';
import { config } from '../config/index.js';
import { sendMail, loginOtpEmail, verificationCodeEmail } from '../services/email.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = Router();

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// -- Schemas --

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  nom: z.string().min(2, 'Nom trop court'),
  prenom: z.string().min(2, 'Prenom trop court'),
  organisation: z.string().optional(),
  commune_code: z.string().optional(),
  region_code: z.string().optional(),
  district_code: z.string().optional(),
  departement_code: z.string().optional(),
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

const verifyOtpSchema = z.object({
  temp_token: z.string().min(1),
  code: z.string().length(6),
});

const codeLoginSchema = z.object({ login_code: z.string().min(1) });

const verifyLoginCodeSchema = z.object({
  login_code: z.string().min(1),
  code: z.string().length(6),
});

const forgotSchema = z.object({ email: z.string().email() });

// -- Helpers --

async function createSession(userId, req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
  const ua = req.headers['user-agent'] || '';

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      user_id: userId,
      ip_address: ip,
      user_agent: ua,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, created_at, expires_at')
    .single();

  if (error) {
    console.error('Session creation error:', error);
    return null;
  }
  return session;
}

function issueToken(userId, role, sessionId) {
  return jwt.sign(
    { userId, role, sessionId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// -- Inscription --

router.post('/register', validateRequest(registerSchema), async (req, res, next) => {
  try {
    const { email, password, nom, prenom, organisation, commune_code, region_code, district_code, departement_code } = req.body;
    const role = 'enqueteur';

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Cet email est deja utilise' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom, prenom, role },
    });

    if (authError) {
      return res.status(400).json({ error: 'Erreur lors de la creation du compte' });
    }

    const loginCode = role === 'enqueteur' ? 'ENQ-' + crypto.randomBytes(2).toString('hex').toUpperCase() : null;

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
        district_code: district_code || null,
        departement_code: departement_code || null,
        ...(loginCode && { login_code: loginCode }),
        ...(loginCode && { login_code_created_at: new Date().toISOString() }),
      });

    if (profileError) {
      return res.status(500).json({ error: 'Erreur creation profil' });
    }

    const code = generateCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('verification_codes').insert({
      email,
      code,
      purpose: 'email_confirm',
      expires_at,
    });

    sendMail({ to: email, ...verificationCodeEmail(prenom, code) }).catch(e => console.error('Email error:', e));

    res.status(201).json({
      message: 'Compte cree. Verifiez votre boite mail pour le code de confirmation.',
      email,
      needsVerification: true,
      ...(loginCode && { login_code: loginCode }),
    });
  } catch (err) {
    next(err);
  }
});

// -- Verifier code de confirmation email --

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
      return res.status(400).json({ error: 'Code invalide ou expire' });
    }

    const newAttempts = (record.attempts || 0) + 1;
    if (newAttempts > record.max_attempts) {
      return res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true, attempts: newAttempts })
      .eq('id', record.id);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, nom, prenom, organisation, commune_code, region_code, district_code, departement_code')
      .eq('email', email)
      .single();

    if (!profile) {
      return res.status(400).json({ error: 'Profil utilisateur introuvable' });
    }

    const session = await createSession(profile.id, req);
    const token = issueToken(profile.id, profile.role, session?.id);

    res.json({
      token,
      session: session ? { id: session.id, expires_at: session.expires_at } : null,
      user: {
        id: profile.id,
        email,
        nom: profile.nom,
        prenom: profile.prenom,
        role: profile.role,
        organisation: profile.organisation,
        commune_code: profile.commune_code,
        region_code: profile.region_code,
        district_code: profile.district_code,
        departement_code: profile.departement_code,
      },
    });
  } catch (err) {
    next(err);
  }
});

// -- Renvoyer code de verification --

router.post('/resend-code', validateRequest(resendCodeSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nom, prenom')
      .eq('email', email)
      .single();

    if (!profile) {
      return res.json({ message: 'Si cet email est enregistre, un code a ete envoye.' });
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

    res.json({ message: 'Un nouveau code a ete envoye.' });
  } catch (err) {
    res.json({ message: 'Si cet email est enregistre, un code a ete envoye.' });
  }
});

// -- Connexion etape 1: email+mdp -> envoie OTP --

router.post('/login', validateRequest(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, nom, prenom, two_factor_enabled, two_factor_verified')
      .eq('id', data.user.id)
      .single();

    const code = generateCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('verification_codes').insert({
      email,
      code,
      purpose: 'login_otp',
      expires_at,
    });

    sendMail({ to: email, ...loginOtpEmail(profile?.prenom || '', code) }).catch(e => console.error('OTP email error:', e));

    const tempPayload = { userId: data.user.id, requiresOtp: true };
    if (profile?.two_factor_enabled && profile?.two_factor_verified) {
      tempPayload.requires2fa = true;
    }

    const tempToken = jwt.sign(tempPayload, config.jwt.secret, { expiresIn: '5m' });

    res.json({
      requires_otp: true,
      temp_token: tempToken,
      email_masked: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });
  } catch (err) {
    next(err);
  }
});

// -- Connexion etape 2: verifier OTP -> session + JWT --

router.post('/verify-login-otp', validateRequest(verifyOtpSchema), async (req, res, next) => {
  try {
    const { temp_token, code } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(temp_token, config.jwt.secret);
    } catch {
      return res.status(401).json({ error: 'Session expiree. Recommencez la connexion.' });
    }

    if (!decoded.userId || !decoded.requiresOtp) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, nom, prenom, organisation, commune_code, region_code, district_code, departement_code, two_factor_enabled, two_factor_verified')
      .eq('id', decoded.userId)
      .single();

    if (!profile) {
      return res.status(400).json({ error: 'Profil introuvable' });
    }

    const { data: record, error: findError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', profile.email)
      .eq('code', code)
      .eq('purpose', 'login_otp')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !record) {
      return res.status(400).json({ error: 'Code OTP invalide ou expire' });
    }

    const newAttempts = (record.attempts || 0) + 1;
    if (newAttempts > record.max_attempts) {
      return res.status(429).json({ error: 'Trop de tentatives. Recommencez la connexion.' });
    }

    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true, attempts: newAttempts })
      .eq('id', record.id);

    if (decoded.requires2fa) {
      const partialToken = jwt.sign(
        { userId: profile.id, requires2fa: true },
        config.jwt.secret,
        { expiresIn: '5m' }
      );
      return res.json({
        requires_2fa: true,
        partial_token: partialToken,
        email_masked: profile.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      });
    }

    const session = await createSession(profile.id, req);
    const token = issueToken(profile.id, profile.role, session?.id);

    res.json({
      token,
      session: session ? { id: session.id, expires_at: session.expires_at } : null,
      user: {
        id: profile.id,
        email: profile.email,
        nom: profile.nom,
        prenom: profile.prenom,
        role: profile.role,
        organisation: profile.organisation,
        commune_code: profile.commune_code,
        region_code: profile.region_code,
        district_code: profile.district_code,
        departement_code: profile.departement_code,
        two_factor_enabled: profile.two_factor_enabled || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// -- Profil utilisateur courant --

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom, role, organisation, commune_code, region_code, district_code, departement_code, two_factor_enabled')
      .eq('id', decoded.userId)
      .single();

    if (error || !profile) return res.status(404).json({ error: 'Profil introuvable' });

    let session = null;
    if (decoded.sessionId) {
      const { data: sess } = await supabaseAdmin
        .from('sessions')
        .select('id, created_at, last_active, expires_at')
        .eq('id', decoded.sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();
      session = sess;
    }

    res.json({ user: profile, session });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

// -- Deconnexion --

router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.json({ message: 'Deconnecte' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.sessionId) {
      await supabaseAdmin.from('sessions').delete().eq('id', decoded.sessionId);
    }
  } catch {}
  res.json({ message: 'Deconnecte' });
});

// -- Sessions actives --

router.get('/sessions', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id, ip_address, user_agent, created_at, last_active, expires_at')
      .eq('user_id', decoded.userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    res.json({ sessions: sessions || [], current_session_id: decoded.sessionId || null });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

// -- Revoquer une session --

router.delete('/sessions/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifie' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', decoded.userId);

    res.json({ message: 'Session revoquee' });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

// -- Google OAuth callback --

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

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      const nom = user.user_metadata?.full_name?.split(' ').slice(-1).join(' ') || '';
      const prenom = user.user_metadata?.full_name?.split(' ').slice(0, -1).join(' ') || user.email;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: user.id, email: user.email, nom, prenom, role: 'enqueteur' });

      if (profileError) {
        return res.status(500).json({ error: 'Erreur creation profil' });
      }

      const session = await createSession(user.id, req);
      const jwtToken = issueToken(user.id, 'enqueteur', session?.id);

      return res.json({
        token: jwtToken,
        session: session ? { id: session.id, expires_at: session.expires_at } : null,
        user: { id: user.id, email: user.email, nom, prenom, role: 'enqueteur' },
      });
    }

    const session = await createSession(user.id, req);
    const jwtToken = issueToken(user.id, existingProfile.role, session?.id);

    res.json({
      token: jwtToken,
      session: session ? { id: session.id, expires_at: session.expires_at } : null,
      user: {
        id: user.id,
        email: user.email,
        nom: existingProfile.nom,
        prenom: existingProfile.prenom,
        role: existingProfile.role,
        organisation: existingProfile.organisation,
        commune_code: existingProfile.commune_code,
        region_code: existingProfile.region_code,
        district_code: existingProfile.district_code,
        departement_code: existingProfile.departement_code,
      },
    });
  } catch (err) {
    next(err);
  }
});

// -- Connexion par code enqueteur etape 1 --

router.post('/code-login', validateRequest(codeLoginSchema), async (req, res, next) => {
  try {
    const { login_code } = req.body;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom, role, login_code, login_code_created_at')
      .eq('login_code', login_code.toUpperCase().trim())
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Code invalide' });
    }

    if (profile.login_code_created_at) {
      const created = new Date(profile.login_code_created_at);
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      if (Date.now() - created.getTime() > ninetyDays) {
        return res.status(401).json({ error: 'Code expire. Demandez un nouveau code a un administrateur.' });
      }
    }

    if (!profile.email) {
      return res.status(400).json({ error: 'Aucun email associe a ce compte. Contactez un administrateur.' });
    }

    const code = generateCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('verification_codes').insert({
      email: profile.email,
      code,
      purpose: 'code_login',
      expires_at,
    });

    sendMail({ to: profile.email, ...loginOtpEmail(profile.prenom || profile.nom || '', code) }).catch(() => {});

    res.json({
      message: 'Un code de connexion a ete envoye a votre email.',
      email_masked: profile.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });
  } catch (err) {
    next(err);
  }
});

// -- Verifier code login enqueteur etape 2 --

router.post('/verify-login-code', validateRequest(verifyLoginCodeSchema), async (req, res, next) => {
  try {
    const { login_code, code } = req.body;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom, role, organisation, commune_code, region_code, district_code, departement_code, two_factor_enabled, two_factor_verified')
      .eq('login_code', login_code.toUpperCase().trim())
      .single();

    if (!profile) {
      return res.status(401).json({ error: 'Code invalide' });
    }

    const { data: record, error: findError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', profile.email)
      .eq('code', code)
      .eq('purpose', 'code_login')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !record) {
      return res.status(400).json({ error: 'Code OTP invalide ou expire' });
    }

    const newAttempts = (record.attempts || 0) + 1;
    if (newAttempts > record.max_attempts) {
      return res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    await supabaseAdmin
      .from('verification_codes')
      .update({ used: true, attempts: newAttempts })
      .eq('id', record.id);

    if (profile.two_factor_enabled && profile.two_factor_verified) {
      const partialToken = jwt.sign(
        { userId: profile.id, requires2fa: true },
        config.jwt.secret,
        { expiresIn: '5m' }
      );
      return res.json({
        requires_2fa: true,
        partial_token: partialToken,
        email_masked: profile.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      });
    }

    const session = await createSession(profile.id, req);
    const token = issueToken(profile.id, profile.role, session?.id);

    res.json({
      token,
      session: session ? { id: session.id, expires_at: session.expires_at } : null,
      user: {
        id: profile.id,
        email: profile.email,
        nom: profile.nom,
        prenom: profile.prenom,
        role: profile.role,
        organisation: profile.organisation,
        commune_code: profile.commune_code,
        region_code: profile.region_code,
        district_code: profile.district_code,
        departement_code: profile.departement_code,
        two_factor_enabled: profile.two_factor_enabled || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// -- Mot de passe oublie --

router.post('/forgot-password', validateRequest(forgotSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-fron.vercel.app'}/login`,
    });
    res.json({ message: 'Si cet email est enregistre, un lien de reinitialisation a ete envoye.' });
  } catch (err) {
    res.json({ message: 'Si cet email est enregistre, un lien de reinitialisation a ete envoye.' });
  }
});

export default router;