const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { db, UPLOADS_DIR, THUMBNAILS_DIR } = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.jpg`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

router.post('/', upload.array('photos', 20), async (req, res) => {
  const { device_id, captions } = req.body;
  if (!device_id) return res.status(400).json({ error: 'device_id is required' });

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const captionsArr = captions
    ? (Array.isArray(captions) ? captions : [captions])
    : [];

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM photos WHERE device_id = ?').get(device_id);
  let sortStart = (maxOrder.max ?? -1) + 1;

  const savedPhotos = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const thumbFilename = `thumb_${file.filename}`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
    const tmpFull = file.path + '.tmp';

    try {
      // Compress + auto-rotate full image (replaces original)
      await sharp(file.path)
        .rotate()                          // auto-rotate from EXIF
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true, mozjpeg: true })
        .toFile(tmpFull);
      fs.renameSync(tmpFull, file.path);
    } catch (err) {
      try { fs.unlinkSync(tmpFull); } catch {}
    }

    try {
      await sharp(file.path)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
    } catch (err) {
      fs.copyFileSync(file.path, thumbPath);
    }

    const id = uuidv4();
    const caption = captionsArr[i] || null;

    db.prepare(`
      INSERT INTO photos (id, device_id, filename, thumbnail_filename, caption, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, device_id, file.filename, thumbFilename, caption, sortStart + i);

    savedPhotos.push(db.prepare('SELECT * FROM photos WHERE id = ?').get(id));
  }

  db.prepare('UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT job_id FROM devices WHERE id = ?)').run(device_id);

  res.status(201).json(savedPhotos);
});

router.put('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const { caption } = req.body;
  db.prepare('UPDATE photos SET caption = ? WHERE id = ?').run(caption ?? photo.caption, req.params.id);

  res.json(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const origPath = path.join(UPLOADS_DIR, photo.filename);
  const thumbPath = photo.thumbnail_filename ? path.join(THUMBNAILS_DIR, photo.thumbnail_filename) : null;

  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);

  try { if (fs.existsSync(origPath)) fs.unlinkSync(origPath); } catch {}
  try { if (thumbPath && fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath); } catch {}

  res.json({ success: true });
});

module.exports = router;
