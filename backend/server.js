import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { ZodError } from 'zod';
import winston from 'winston';

import authRoutes from './routes/auth.js';
import ecoleRoutes from './routes/ecoles.js';
import adminZoneRoutes from './routes/adminZones.js';
import collecteRoutes from './routes/collecte.js';
import dashboardRoutes from './routes/dashboard.js';
import plaidoyerRoutes from './routes/plaidoyer.js';
import uploadRoutes from './routes/upload.js';
import { authMiddleware } from './middleware/auth.js';
import { validateRequest } from './middleware/validate.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [new winston.transports.File({ filename: 'logs/error.log', level: 'error' })]
      : []),
  ],
});

// Supabase
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Sécurité
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limiting strict pour auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion.' },
});
app.use('/api/auth/login', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ecoles', ecoleRoutes);
app.use('/api/admin-zones', adminZoneRoutes);
app.use('/api/collecte', authMiddleware, collecteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/plaidoyer', plaidoyerRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Diagnostic endpoint
app.get('/api/debug', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ecoles').select('id').limit(1);
    res.json({
      supabase: error ? { error: error.message, code: error.code } : { ok: true, count: data?.length },
      env: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      },
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  logger.error(err.message, { stack: err.stack, path: req.path });

  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
  logger.info(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
