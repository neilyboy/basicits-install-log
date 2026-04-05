const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT j.*,
      (SELECT COUNT(*) FROM devices WHERE job_id = j.id) as device_count
    FROM jobs j
  `;
  const params = [];
  if (status) {
    if (Array.isArray(status)) {
      query += ` WHERE j.status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    } else {
      query += ' WHERE j.status = ?';
      params.push(status);
    }
  }
  query += ' ORDER BY j.updated_at DESC';
  const jobs = db.prepare(query).all(...params);
  res.json(jobs);
});

router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const devices = db.prepare(`
    SELECT d.*, hm.model_name, hm.model_number, hm.category as hw_category, hm.brand,
      (SELECT COUNT(*) FROM photos WHERE device_id = d.id) as photo_count
    FROM devices d
    LEFT JOIN hardware_models hm ON d.hardware_model_id = hm.id
    WHERE d.job_id = ?
    ORDER BY d.sort_order ASC, d.created_at ASC
  `).all(req.params.id);

  const deviceIds = devices.map(d => d.id);
  let photos = [];
  if (deviceIds.length > 0) {
    photos = db.prepare(`
      SELECT * FROM photos WHERE device_id IN (${deviceIds.map(() => '?').join(',')})
      ORDER BY sort_order ASC, created_at ASC
    `).all(...deviceIds);
  }

  const devicesWithPhotos = devices.map(d => ({
    ...d,
    photos: photos.filter(p => p.device_id === d.id),
  }));

  res.json({ ...job, devices: devicesWithPhotos });
});

router.post('/', (req, res) => {
  const { name, client, address, contact_name, contact_phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Job name is required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO jobs (id, name, client, address, contact_name, contact_phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, client || null, address || null, contact_name || null, contact_phone || null, notes || null);

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  res.status(201).json(job);
});

router.put('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { name, client, address, contact_name, contact_phone, notes, status } = req.body;
  db.prepare(`
    UPDATE jobs SET
      name = COALESCE(?, name),
      client = COALESCE(?, client),
      address = COALESCE(?, address),
      contact_name = COALESCE(?, contact_name),
      contact_phone = COALESCE(?, contact_phone),
      notes = COALESCE(?, notes),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, client, address, contact_name, contact_phone, notes, status, req.params.id);

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
});

router.post('/:id/complete', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  db.prepare(`
    UPDATE jobs SET status = 'complete', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
});

router.post('/:id/reopen', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  db.prepare(`
    UPDATE jobs SET status = 'open', completed_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
});

router.post('/:id/archive', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  db.prepare(`
    UPDATE jobs SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
