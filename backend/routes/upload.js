import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { config } from '../config/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSizeBytes },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  },
});

// Upload et compression d'image
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Comprimer l'image à <500 Ko
    const compressed = await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: config.upload.compressionQuality * 100 })
      .toBuffer();

    // Ici, en production, on uploaderait sur Supabase Storage
    // Pour le MVP, on retourne les métadonnées
    const filename = `${Date.now()}-${req.file.originalname.replace(/\.[^.]+$/, '.jpg')}`;

    res.json({
      filename,
      size: compressed.length,
      type: 'image/jpeg',
      // url: `https://your-supabase.supabase.co/storage/v1/object/public/photos/${filename}`,
      message: 'Image compressée avec succès',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
