import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { config } from '../config/index.js';
import { supabase } from '../server.js';

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

// Upload et compression d'image → Supabase Storage
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const compressed = await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: config.upload.compressionQuality * 100 })
      .toBuffer();

    const filename = `${Date.now()}-${req.file.originalname.replace(/\.[^.]+$/, '.jpg')}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filename, compressed, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      return res.status(500).json({ error: `Erreur upload: ${uploadError.message}` });
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename);

    res.json({
      filename,
      size: compressed.length,
      type: 'image/jpeg',
      url: urlData.publicUrl,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
