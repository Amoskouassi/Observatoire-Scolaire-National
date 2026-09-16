import { Router } from 'express';
import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = Router();

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], config.jwt.secret);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Setup 2FA — générer secret + QR code
router.post('/setup', authMiddleware, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom, two_factor_enabled')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }

    if (profile.two_factor_enabled) {
      return res.status(400).json({ error: 'La 2FA est déjà activée. Désactivez-la d\'abord.' });
    }

    const secret = generateSecret();
    const otpauth = generateURI({ secret, issuerName: 'Observatoire Scolaire National', accountName: profile.email });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    await supabaseAdmin
      .from('profiles')
      .update({ two_factor_secret: secret })
      .eq('id', req.userId);

    res.json({
      secret,
      qr_code: qrCodeDataUrl,
      otpauth_url: otpauth,
    });
  } catch (err) {
    next(err);
  }
});

// Verify & activate 2FA — vérifier le code TOTP et activer
router.post('/verify', authMiddleware, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Code à 6 chiffres requis' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, two_factor_secret')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }

    if (!profile.two_factor_secret) {
      return res.status(400).json({ error: 'Aucun secret 2FA configuré. Lancez /setup d\'abord.' });
    }

    const isValid = verifySync({ token: code, secret: profile.two_factor_secret }).valid;

    if (!isValid) {
      return res.status(400).json({ error: 'Code invalide. Réessayez.' });
    }

    await supabaseAdmin
      .from('profiles')
      .update({ two_factor_enabled: true, two_factor_verified: true })
      .eq('id', req.userId);

    res.json({ message: '2FA activée avec succès' });
  } catch (err) {
    next(err);
  }
});

// Validate 2FA during login — vérifier le code TOTP pour compléter la connexion
router.post('/validate', async (req, res, next) => {
  try {
    const { partial_token, code } = req.body;

    if (!partial_token || !code) {
      return res.status(400).json({ error: 'Token partiel et code requis' });
    }

    let decoded;
    try {
      decoded = jwt.verify(partial_token, config.jwt.secret);
    } catch {
      return res.status(401).json({ error: 'Token partiel invalide ou expiré' });
    }

    if (!decoded.userId || !decoded.requires2fa) {
      return res.status(400).json({ error: 'Token invalide pour la 2FA' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nom, prenom, role, commune_code, region_code, district_code, departement_code, two_factor_secret')
      .eq('id', decoded.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }

    if (!profile.two_factor_secret) {
      return res.status(400).json({ error: '2FA non configurée' });
    }

    const isValid = verifySync({ token: code, secret: profile.two_factor_secret }).valid;

    if (!isValid) {
      return res.status(401).json({ error: 'Code 2FA invalide' });
    }

    const fullToken = jwt.sign(
      { userId: profile.id, role: profile.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token: fullToken,
      user: {
        id: profile.id,
        email: profile.email,
        nom: profile.nom,
        prenom: profile.prenom,
        role: profile.role,
        commune_code: profile.commune_code,
        region_code: profile.region_code,
        district_code: profile.district_code,
        departement_code: profile.departement_code,
        two_factor_enabled: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Disable 2FA — admin only
router.post('/disable', authMiddleware, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }

    if (req.body.targetUserId && profile.role === 'admin') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ two_factor_enabled: false, two_factor_verified: false, two_factor_secret: null })
        .eq('id', req.body.targetUserId);

      if (updateError) throw updateError;
      return res.json({ message: '2FA désactivée pour cet utilisateur' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ two_factor_enabled: false, two_factor_verified: false, two_factor_secret: null })
      .eq('id', req.userId);

    if (updateError) throw updateError;
    res.json({ message: '2FA désactivée' });
  } catch (err) {
    next(err);
  }
});

// Check 2FA status
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, two_factor_enabled, two_factor_verified')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }

    res.json({
      enabled: profile.two_factor_enabled,
      verified: profile.two_factor_verified,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
