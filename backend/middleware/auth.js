import jwt from 'jsonwebtoken';
import { supabase } from '../server.js';
import { config } from '../config/index.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, commune_code, region_code, district_code, departement_code')
      .eq('id', decoded.userId)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role || 'enqueteur',
      communeCode: profile.commune_code,
      regionCode: profile.region_code,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
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
