import { Router } from 'express';
import multer from 'multer';
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

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${Date.now()}-${req.file.originalname.replace(/\.[^.]+$/, '')}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) {
      return res.status(500).json({ error: `Erreur upload: ${uploadError.message}` });
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filename);

    res.json({
      filename,
      size: req.file.size,
      type: req.file.mimetype,
      url: urlData.publicUrl,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
