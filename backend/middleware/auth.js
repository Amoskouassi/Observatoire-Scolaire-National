import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    if (!decoded.userId) {
      return res.status(401).json({ error: 'Token invalide: userId manquant' });
    }

    let profile = null;

    try {
      const result = await supabaseAdmin
        .from('profiles')
        .select('id, email, role, commune_code, region_code, district_code, departement_code')
        .eq('id', decoded.userId)
        .single();

      profile = result.data;
    } catch (e) {
      console.warn('Profiles query failed, using JWT data:', e.message);
    }

    req.user = {
      id: decoded.userId,
      email: profile?.email || '',
      role: decoded.role || profile?.role || 'enqueteur',
      communeCode: profile?.commune_code || null,
      regionCode: profile?.region_code || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré', detail: err.message });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
  };
}
