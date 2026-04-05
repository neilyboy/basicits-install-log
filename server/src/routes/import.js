const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db, UPLOADS_DIR, THUMBNAILS_DIR } = require('../db');

const upload = multer({ dest: '/tmp/basicits-import/' });

router.post('/', upload.single('archive'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No archive file uploaded' });

  const AdmZip = require('adm-zip');
  let zip;
  try {
    zip = new AdmZip(req.file.path);
  } catch {
    return res.status(400).json({ error: 'Invalid ZIP file' });
  }

  const dataEntry = zip.getEntry('data.json');
  if (!dataEntry) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid archive: missing data.json' });
  }

  let jobData;
  try {
    jobData = JSON.parse(dataEntry.getData().toString('utf8'));
  } catch {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Invalid data.json' });
  }

  const newJobId = uuidv4();
  const importedAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO jobs (id, name, client, address, contact_name, contact_phone, status, notes, created_at, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'archived', ?, ?, ?, ?)
  `).run(
    newJobId,
    `[Imported] ${jobData.name}`,
    jobData.client || null,
    jobData.address || null,
    jobData.contact_name || null,
    jobData.contact_phone || null,
    jobData.notes || null,
    jobData.created_at || importedAt,
    jobData.completed_at || null,
    importedAt,
  );

  const deviceIdMap = {};

  for (let di = 0; di < (jobData.devices || []).length; di++) {
    const device = jobData.devices[di];
    const newDeviceId = uuidv4();
    deviceIdMap[device.id] = newDeviceId;

    let hwModelId = null;
    if (device.hardware_model_id) {
      const existing = db.prepare('SELECT id FROM hardware_models WHERE id = ?').get(device.hardware_model_id);
      if (existing) hwModelId = device.hardware_model_id;
    }

    db.prepare(`
      INSERT INTO devices (id, job_id, name, device_type, hardware_model_id, location, notes, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newDeviceId, newJobId, device.name, device.device_type || null,
      hwModelId, device.location || null, device.notes || null,
      di, device.created_at || importedAt, device.updated_at || importedAt,
    );

    for (let pi = 0; pi < (device.photos || []).length; pi++) {
      const photo = device.photos[pi];
      const zipImgEntry = zip.getEntry(`images/${photo.filename}`);
      if (!zipImgEntry) continue;

      const ext = path.extname(photo.filename) || '.jpg';
      const newFilename = `${uuidv4()}${ext}`;
      const newThumbFilename = `thumb_${newFilename}`;

      const destPath = path.join(UPLOADS_DIR, newFilename);
      const thumbPath = path.join(THUMBNAILS_DIR, newThumbFilename);

      fs.writeFileSync(destPath, zipImgEntry.getData());

      try {
        const sharp = require('sharp');
        await sharp(destPath)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(thumbPath);
      } catch {
        fs.copyFileSync(destPath, thumbPath);
      }

      db.prepare(`
        INSERT INTO photos (id, device_id, filename, thumbnail_filename, caption, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), newDeviceId, newFilename, newThumbFilename, photo.caption || null, pi, photo.created_at || importedAt);
    }
  }

  try { fs.unlinkSync(req.file.path); } catch {}

  const imported = db.prepare('SELECT * FROM jobs WHERE id = ?').get(newJobId);
  res.status(201).json(imported);
});

module.exports = router;
