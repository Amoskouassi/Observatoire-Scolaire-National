import jwt from 'jsonwebtoken';
import { supabase } from '../server.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    // Récupérer le rôle depuis la table profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, commune_code, region_code')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'enqueteur',
      communeCode: profile?.commune_code,
      regionCode: profile?.region_code,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentification échouée' });
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
